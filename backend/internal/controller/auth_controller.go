package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"

	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/errs"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

var phoneE164Re = regexp.MustCompile(`^\+7\d{10}$`)

type AuthController struct {
	svc    *service.AuthService
	jwt    *auth.JWTManager
	logger *zap.Logger
}

func NewAuthController(svc *service.AuthService, jwt *auth.JWTManager, logger *zap.Logger) *AuthController {
	return &AuthController{svc: svc, jwt: jwt, logger: logger}
}

type otpRequestBody struct {
	Phone string `json:"phone"`
}

func (c *AuthController) RequestOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var body otpRequestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	phone := normalizePhone(body.Phone)
	if !phoneE164Re.MatchString(phone) {
		jsonError(w, "invalid phone number, expected +7XXXXXXXXXX", http.StatusBadRequest)
		return
	}

	result, err := c.svc.RequestOTP(r.Context(), phone)
	if err != nil {
		if errors.Is(err, errs.ErrOTPTooMany) {
			jsonError(w, err.Error(), http.StatusTooManyRequests)
			return
		}
		c.logger.Error("request otp", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, result)
}

type otpVerifyBody struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

func (c *AuthController) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var body otpVerifyBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	phone := normalizePhone(body.Phone)
	if !phoneE164Re.MatchString(phone) {
		jsonError(w, "invalid phone number", http.StatusBadRequest)
		return
	}
	if body.Code == "" {
		jsonError(w, "code is required", http.StatusBadRequest)
		return
	}

	result, err := c.svc.VerifyOTP(r.Context(), phone, body.Code)
	if err != nil {
		if errors.Is(err, errs.ErrOTPNotFound) || errors.Is(err, errs.ErrOTPInvalid) {
			jsonError(w, err.Error(), http.StatusUnauthorized)
			return
		}
		c.logger.Error("verify otp", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, result)
}

type refreshBody struct {
	RefreshToken string `json:"refreshToken"`
}

func (c *AuthController) Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var body refreshBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if body.RefreshToken == "" {
		jsonError(w, "refreshToken is required", http.StatusBadRequest)
		return
	}

	pair, err := c.svc.RefreshTokens(r.Context(), body.RefreshToken)
	if err != nil {
		if errors.Is(err, errs.ErrRefreshTokenInvalid) {
			jsonError(w, err.Error(), http.StatusUnauthorized)
			return
		}
		c.logger.Error("refresh tokens", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, pair)
}

func (c *AuthController) Me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	info, err := c.svc.GetMe(r.Context(), userID)
	if err != nil {
		if errors.Is(err, errs.ErrUserNotFound) {
			jsonError(w, "user not found", http.StatusNotFound)
			return
		}
		c.logger.Error("get me", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, info)
}

func (c *AuthController) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := c.svc.Logout(r.Context(), userID); err != nil {
		c.logger.Error("logout", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonOK(w, map[string]bool{"ok": true})
}

func normalizePhone(raw string) string {
	cleaned := ""
	for _, ch := range raw {
		if ch >= '0' && ch <= '9' || ch == '+' {
			cleaned += string(ch)
		}
	}
	if len(cleaned) == 11 && cleaned[0] == '8' {
		cleaned = "+7" + cleaned[1:]
	}
	if len(cleaned) > 0 && cleaned[0] != '+' {
		cleaned = "+" + cleaned
	}
	return cleaned
}

func jsonOK(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
