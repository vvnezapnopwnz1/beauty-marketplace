package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/beauty-marketplace/backend/internal/errs"
	"github.com/beauty-marketplace/backend/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type OTPSender interface {
	Send(ctx context.Context, phone string, code string) error
	Channel() string
}

type StderrOTPSender struct {
	logger *zap.Logger
}

func NewStderrOTPSender(logger *zap.Logger) *StderrOTPSender {
	return &StderrOTPSender{logger: logger}
}

func (s *StderrOTPSender) Send(_ context.Context, phone, code string) error {
	s.logger.Info("OTP generated (dev mode)", zap.String("phone", phone), zap.String("code", code))
	return nil
}

func (s *StderrOTPSender) Channel() string { return "sms" }

type TelegramOTPSender struct {
	botToken string
	linkRepo repository.TelegramLinkRepository
	logger   *zap.Logger
	client   *http.Client
}

func NewTelegramOTPSender(botToken string, linkRepo repository.TelegramLinkRepository, logger *zap.Logger) *TelegramOTPSender {
	return &TelegramOTPSender{
		botToken: strings.TrimSpace(botToken),
		linkRepo: linkRepo,
		logger:   logger,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *TelegramOTPSender) Channel() string { return "telegram" }

func (s *TelegramOTPSender) Send(ctx context.Context, phone string, code string) error {
	link, err := s.linkRepo.FindByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errs.ErrTelegramNotLinked
		}
		return fmt.Errorf("find telegram link: %w", err)
	}
	if s.botToken == "" {
		s.logger.Warn("telegram otp sender is not configured (missing token)")
		return fmt.Errorf("telegram bot token is not configured")
	}
	msg := fmt.Sprintf("Ваш код для входа на Beautica: *%s*\n\nНе сообщайте его никому.", code)
	if err := s.sendTelegramMessage(ctx, link.ChatID, msg); err != nil {
		return fmt.Errorf("send telegram message: %w", err)
	}
	return nil
}

func (s *TelegramOTPSender) sendTelegramMessage(ctx context.Context, chatID int64, text string) error {
	form := url.Values{}
	form.Set("chat_id", fmt.Sprintf("%d", chatID))
	form.Set("text", text)
	form.Set("parse_mode", "Markdown")

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", s.botToken),
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("telegram api status: %d", resp.StatusCode)
	}

	var payload struct {
		OK          bool   `json:"ok"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return err
	}
	if !payload.OK {
		if payload.Description == "" {
			payload.Description = "unknown telegram api error"
		}
		return errors.New(payload.Description)
	}
	return nil
}
