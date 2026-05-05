package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
)

type DeviceController struct {
	svc *service.DeviceService
	log *zap.Logger
}

func NewDeviceController(svc *service.DeviceService, log *zap.Logger) *DeviceController {
	return &DeviceController{svc: svc, log: log}
}

type registerDeviceRequest struct {
	Token      string `json:"token,omitempty"`
	DeviceToken string `json:"device_token,omitempty"`
	Platform   string `json:"platform"`
	AppVersion string `json:"app_version,omitempty"`
}

func (h *DeviceController) Register(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		writeMachineError(w, "unauthorized", http.StatusUnauthorized, "", "")
		return
	}

	var body registerDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeMachineError(w, "validation_failed", http.StatusBadRequest, "invalid json", "")
		return
	}

	body.Token = strings.TrimSpace(body.Token)
	body.DeviceToken = strings.TrimSpace(body.DeviceToken)
	body.Platform = strings.ToLower(strings.TrimSpace(body.Platform))
	body.AppVersion = strings.TrimSpace(body.AppVersion)

	token := body.DeviceToken
	if token == "" {
		token = body.Token
	}

	if token == "" {
		writeMachineError(w, "validation_failed", http.StatusBadRequest, "device token is required", "token")
		return
	}
	if body.Platform != "ios" && body.Platform != "android" {
		writeMachineError(w, "validation_failed", http.StatusBadRequest, "platform must be ios or android", "platform")
		return
	}

	device, err := h.svc.RegisterDevice(r.Context(), userID.String(), token, body.Platform, body.AppVersion)
	if err != nil {
		if errors.Is(err, service.ErrDeviceTokenTaken) {
			writeMachineError(w, "conflict", http.StatusConflict, "device token already registered", "token")
			return
		}
		h.log.Error("register device", zap.Error(err))
		writeMachineError(w, "internal_error", http.StatusInternalServerError, "", "")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{"device": device})
}
