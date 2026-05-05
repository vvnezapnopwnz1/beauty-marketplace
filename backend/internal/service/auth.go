package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/config"
	"github.com/beauty-marketplace/backend/internal/errs"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const (
	otpLength    = 4
	otpTTL       = 5 * time.Minute
	maxOTPPerMin = 1 // one request per phone per minute
)

type AuthService struct {
	repo         repository.AuthRepository
	masterDash   repository.MasterDashboardRepository
	salonInvites repository.SalonMemberInviteRepository
	smsSender    OTPSender
	tgSender     OTPSender
	jwt          *auth.JWTManager
	logger       *zap.Logger
	devOTPBypass bool
	devOTPAny    bool
	devOTPMagic  string // fixed code accepted when devOTPBypass is true (e.g. "1234")
}

func NewAuthService(
	repo repository.AuthRepository,
	telegramRepo repository.TelegramLinkRepository,
	masterDash repository.MasterDashboardRepository,
	salonInvites repository.SalonMemberInviteRepository,
	jwt *auth.JWTManager,
	logger *zap.Logger,
	cfg *config.Config,
) *AuthService {
	magic := "1234"
	return &AuthService{
		repo:         repo,
		masterDash:   masterDash,
		salonInvites: salonInvites,
		smsSender:    NewStderrOTPSender(logger),
		tgSender:     NewTelegramOTPSender(cfg.TelegramBotToken, telegramRepo, logger),
		jwt:          jwt,
		logger:       logger,
		devOTPBypass: cfg.DevOTPBypass,
		devOTPAny:    cfg.DevOTPBypassAny,
		devOTPMagic:  magic,
	}
}

type OTPRequestResult struct {
	ExpiresAt time.Time `json:"expiresAt"`
}

type OTPRequestParams struct {
	Phone   string `json:"phone"`
	Channel string `json:"channel"`
}

func (s *AuthService) RequestOTP(ctx context.Context, params OTPRequestParams) (*OTPRequestResult, error) {
	if s.devOTPAny {
		expiresAt := time.Now().Add(otpTTL)
		s.logger.Info("otp request: dev bypass-any enabled", zap.String("phone", params.Phone))
		return &OTPRequestResult{ExpiresAt: expiresAt}, nil
	}

	code, err := generateOTP(otpLength)
	if err != nil {
		return nil, fmt.Errorf("generate otp: %w", err)
	}

	expiresAt := time.Now().Add(otpTTL)
	otp := &model.OtpCode{
		PhoneE164: params.Phone,
		Code:      code,
		ExpiresAt: expiresAt,
	}

	if err := s.repo.CreateOTP(ctx, otp); err != nil {
		return nil, fmt.Errorf("save otp: %w", err)
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
	s.logger.Info("otp sent", zap.String("phone", params.Phone), zap.String("channel", sender.Channel()))

	return &OTPRequestResult{ExpiresAt: expiresAt}, nil
}

type VerifyOTPResult struct {
	TokenPair auth.TokenPair `json:"tokenPair"`
	User      UserInfo       `json:"user"`
	IsNew     bool           `json:"isNew"`
}

type UserInfo struct {
	ID              uuid.UUID  `json:"id"`
	Phone           string     `json:"phone"`
	DisplayName     *string    `json:"displayName"`
	Role            string     `json:"role"`
	SessionID       *uuid.UUID `json:"sessionId,omitempty"`
	MasterProfileID *uuid.UUID `json:"masterProfileId,omitempty"`
}

func (s *AuthService) VerifyOTP(ctx context.Context, phone, code string) (*VerifyOTPResult, error) {
	if s.devOTPAny {
		s.logger.Info("OTP verify: dev bypass-any", zap.String("phone", phone))
		user, isNew, err := s.findOrCreateUser(ctx, phone)
		if err != nil {
			return nil, err
		}
		if err := s.salonInvites.LinkPendingByPhone(ctx, user.ID, phone); err != nil {
			s.logger.Warn("link salon member invites", zap.Error(err))
		}
		s.tryClaimShadowMasterProfile(ctx, user)
		tokenPair, sessionID, err := s.issueTokenPair(ctx, user)
		if err != nil {
			return nil, err
		}
		masterProfID := s.lookupMasterProfileID(ctx, user.ID)
		return &VerifyOTPResult{
			TokenPair: *tokenPair,
			User: UserInfo{
				ID:              user.ID,
				Phone:           user.PhoneE164,
				DisplayName:     user.DisplayName,
				Role:            user.GlobalRole,
				SessionID:       sessionID,
				MasterProfileID: masterProfID,
			},
			IsNew: isNew,
		}, nil
	}

	otp, err := s.repo.FindActiveOTP(ctx, phone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrOTPNotFound
		}
		return nil, fmt.Errorf("find otp: %w", err)
	}

	codeOK := otp.Code == code
	if !codeOK && s.devOTPBypass && code == s.devOTPMagic {
		codeOK = true
		s.logger.Info("OTP verify: dev bypass (fixed code)", zap.String("phone", phone))
	}
	if !codeOK {
		_ = s.repo.IncrementOTPAttempts(ctx, otp.ID)
		return nil, errs.ErrOTPInvalid
	}

	if err := s.repo.MarkOTPUsed(ctx, otp.ID); err != nil {
		return nil, fmt.Errorf("mark otp used: %w", err)
	}

	user, isNew, err := s.findOrCreateUser(ctx, phone)
	if err != nil {
		return nil, err
	}

	if err := s.salonInvites.LinkPendingByPhone(ctx, user.ID, phone); err != nil {
		s.logger.Warn("link salon member invites", zap.Error(err))
	}

	s.tryClaimShadowMasterProfile(ctx, user)

	tokenPair, sessionID, err := s.issueTokenPair(ctx, user)
	if err != nil {
		return nil, err
	}

	masterProfID := s.lookupMasterProfileID(ctx, user.ID)

	return &VerifyOTPResult{
		TokenPair: *tokenPair,
		User: UserInfo{
			ID:              user.ID,
			Phone:           user.PhoneE164,
			DisplayName:     user.DisplayName,
			Role:            user.GlobalRole,
			SessionID:       sessionID,
			MasterProfileID: masterProfID,
		},
		IsNew: isNew,
	}, nil
}

func (s *AuthService) RefreshTokens(ctx context.Context, rawRefresh string) (*auth.TokenPair, error) {
	hash := auth.HashToken(rawRefresh)

	rt, err := s.repo.FindRefreshToken(ctx, hash)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrRefreshTokenInvalid
		}
		return nil, fmt.Errorf("find refresh token: %w", err)
	}

	if err := s.repo.RevokeRefreshToken(ctx, rt.ID); err != nil {
		return nil, fmt.Errorf("revoke old refresh: %w", err)
	}

	tokenPair, err := s.issueTokenPairByID(ctx, rt.UserID)
	if err != nil {
		return nil, err
	}

	return tokenPair, nil
}

func (s *AuthService) GetMe(ctx context.Context, userID uuid.UUID) (*UserInfo, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrUserNotFound
		}
		return nil, fmt.Errorf("find user: %w", err)
	}
	return &UserInfo{
		ID:              user.ID,
		Phone:           user.PhoneE164,
		DisplayName:     user.DisplayName,
		Role:            user.GlobalRole,
		MasterProfileID: s.lookupMasterProfileID(ctx, user.ID),
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, userID uuid.UUID) error {
	return s.repo.RevokeAllUserTokens(ctx, userID)
}

func (s *AuthService) findOrCreateUser(ctx context.Context, phone string) (*model.User, bool, error) {
	user, err := s.repo.FindUserByPhone(ctx, phone)
	if err == nil {
		if user.DeletedAt.Valid {
			return nil, false, errs.ErrAccountDeleted
		}
		return user, false, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, fmt.Errorf("find user: %w", err)
	}

	newUser := &model.User{
		PhoneE164:  phone,
		GlobalRole: "client",
	}
	if err := s.repo.CreateUser(ctx, newUser); err != nil {
		return nil, false, fmt.Errorf("create user: %w", err)
	}
	return newUser, true, nil
}

func (s *AuthService) issueTokenPair(ctx context.Context, user *model.User) (*auth.TokenPair, *uuid.UUID, error) {
	accessToken, expiresAt, err := s.jwt.GenerateAccessToken(user.ID, user.GlobalRole)
	if err != nil {
		return nil, nil, fmt.Errorf("generate access token: %w", err)
	}

	rawRefresh, hashRefresh, err := auth.GenerateRefreshToken()
	if err != nil {
		return nil, nil, err
	}

	rt := &model.RefreshToken{
		UserID:    user.ID,
		TokenHash: hashRefresh,
		ExpiresAt: time.Now().Add(auth.RefreshTokenTTL),
	}
	if err := s.repo.SaveRefreshToken(ctx, rt); err != nil {
		return nil, nil, fmt.Errorf("save refresh token: %w", err)
	}

	return &auth.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		ExpiresAt:    expiresAt.Unix(),
	}, &rt.ID, nil
}

func (s *AuthService) issueTokenPairByID(ctx context.Context, userID uuid.UUID) (*auth.TokenPair, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}
	pair, _, err := s.issueTokenPair(ctx, user)
	return pair, err
}

func (s *AuthService) tryClaimShadowMasterProfile(ctx context.Context, user *model.User) {
	shadowID, err := s.masterDash.FindShadowMasterProfileIDByPhone(ctx, user.PhoneE164)
	if err != nil {
		s.logger.Warn("shadow master profile lookup", zap.Error(err), zap.String("phone", user.PhoneE164))
		return
	}
	if shadowID == nil {
		return
	}
	if err := s.masterDash.ClaimMasterProfile(ctx, *shadowID, user.ID, user.PhoneE164); err != nil {
		s.logger.Warn("claim master profile", zap.Error(err), zap.String("profile_id", shadowID.String()))
	}
}

func (s *AuthService) lookupMasterProfileID(ctx context.Context, userID uuid.UUID) *uuid.UUID {
	id, err := s.masterDash.FindMasterProfileIDByUserID(ctx, userID)
	if err != nil {
		s.logger.Warn("master profile id by user", zap.Error(err), zap.String("user_id", userID.String()))
		return nil
	}
	return id
}

func generateOTP(length int) (string, error) {
	digits := ""
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		digits += fmt.Sprintf("%d", n.Int64())
	}
	return digits, nil
}
