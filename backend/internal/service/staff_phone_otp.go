package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/errs"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const staffPhoneOTPTTL = 10 * time.Minute

type StaffPhoneOTPService struct {
	repo         repository.StaffPhoneVerificationRepository
	smsSender    OTPSender
	tgSender     OTPSender
	logger       *zap.Logger
	devOTPBypass bool
	devOTPMagic  string
}

func NewStaffPhoneOTPService(
	repo repository.StaffPhoneVerificationRepository,
	telegramRepo repository.TelegramLinkRepository,
	logger *zap.Logger,
	cfg *config.Config,
) *StaffPhoneOTPService {
	return &StaffPhoneOTPService{
		repo:         repo,
		smsSender:    NewStderrOTPSender(logger),
		tgSender:     NewTelegramOTPSender(cfg.TelegramBotToken, telegramRepo, logger),
		logger:       logger,
		devOTPBypass: cfg.DevOTPBypass,
		devOTPMagic:  "1234",
	}
}

type StaffPhoneOTPRequestParams struct {
	Phone   string `json:"phone"`
	Channel string `json:"channel"`
}

type StaffPhoneOTPVerifyParams struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

// Request generates a new OTP code, persists it, and sends it to the phone.
func (s *StaffPhoneOTPService) Request(ctx context.Context, salonID, actorUserID uuid.UUID, params StaffPhoneOTPRequestParams) (*OTPRequestResult, error) {
	code, err := generateOTP(otpLength)
	if err != nil {
		return nil, fmt.Errorf("generate otp: %w", err)
	}

	expiresAt := time.Now().Add(staffPhoneOTPTTL)
	v := &model.StaffPhoneVerification{
		SalonID:   salonID,
		PhoneE164: params.Phone,
		Code:      code,
		ExpiresAt: expiresAt,
		CreatedBy: actorUserID,
	}

	if err := s.repo.Create(ctx, v); err != nil {
		return nil, fmt.Errorf("save staff phone verification: %w", err)
	}

	sender := s.smsSender
	if params.Channel == "telegram" {
		sender = s.tgSender
	}
	if err := sender.Send(ctx, params.Phone, code); err != nil {
		if errors.Is(err, errs.ErrTelegramNotLinked) {
			return nil, err
		}
		return nil, fmt.Errorf("send otp via %s: %w", sender.Channel(), err)
	}
	s.logger.Info("staff phone otp sent",
		zap.String("phone", params.Phone),
		zap.String("channel", sender.Channel()),
		zap.String("salon_id", salonID.String()),
	)

	return &OTPRequestResult{ExpiresAt: expiresAt}, nil
}

// Verify checks the OTP code, marks the verification as verified, and returns the proof UUID.
func (s *StaffPhoneOTPService) Verify(ctx context.Context, salonID uuid.UUID, params StaffPhoneOTPVerifyParams) (uuid.UUID, error) {
	v, err := s.repo.FindActive(ctx, params.Phone, salonID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, errs.ErrOTPNotFound
		}
		return uuid.Nil, fmt.Errorf("find active staff phone verification: %w", err)
	}

	codeOK := v.Code == params.Code
	if !codeOK && s.devOTPBypass && params.Code == s.devOTPMagic {
		codeOK = true
		s.logger.Info("staff phone otp verify: dev bypass (fixed code)", zap.String("phone", params.Phone))
	}
	if !codeOK {
		_ = s.repo.IncrementAttempts(ctx, v.ID)
		return uuid.Nil, errs.ErrOTPInvalid
	}

	if err := s.repo.MarkVerified(ctx, v.ID); err != nil {
		return uuid.Nil, fmt.Errorf("mark staff phone verification verified: %w", err)
	}

	return v.ID, nil
}

// ValidateAndConsumeProof validates a verification proof and consumes it so it cannot be reused.
func (s *StaffPhoneOTPService) ValidateAndConsumeProof(ctx context.Context, proofID uuid.UUID, phoneE164 string, salonID uuid.UUID) error {
	if s.devOTPBypass {
		return nil
	}

	v, err := s.repo.FindValidProof(ctx, proofID, phoneE164, salonID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errs.ErrOTPNotFound
		}
		return fmt.Errorf("find valid staff phone proof: %w", err)
	}

	if err := s.repo.Consume(ctx, v.ID); err != nil {
		return fmt.Errorf("consume staff phone proof: %w", err)
	}

	return nil
}
