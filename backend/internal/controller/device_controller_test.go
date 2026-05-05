package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/service"
	"github.com/beauty-marketplace/backend/pkg/models"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type mockDeviceRepo struct {
	createFn     func(ctx context.Context, device *models.Device) error
	getByTokenFn func(ctx context.Context, token string) (*models.Device, error)
	updateFn     func(ctx context.Context, device *models.Device) error
	deleteFn     func(ctx context.Context, deviceID string) error
	deleteByUser func(ctx context.Context, userID string) error
}

func (m *mockDeviceRepo) Create(ctx context.Context, device *models.Device) error {
	if m.createFn != nil {
		return m.createFn(ctx, device)
	}
	return nil
}

func (m *mockDeviceRepo) GetByToken(ctx context.Context, token string) (*models.Device, error) {
	if m.getByTokenFn != nil {
		return m.getByTokenFn(ctx, token)
	}
		return nil, errors.New("not found")
}

func (m *mockDeviceRepo) GetByUser(ctx context.Context, userID string) ([]models.Device, error) {
	return nil, nil
}

func (m *mockDeviceRepo) Update(ctx context.Context, device *models.Device) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, device)
	}
	return nil
}

func (m *mockDeviceRepo) Delete(ctx context.Context, deviceID string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, deviceID)
	}
	return nil
}

func (m *mockDeviceRepo) DeleteByUser(ctx context.Context, userID string) error {
	if m.deleteByUser != nil {
		return m.deleteByUser(ctx, userID)
	}
	return nil
}

func authHeader(t *testing.T, userID uuid.UUID) string {
	t.Helper()
	jwtMgr := auth.NewJWTManager("test-secret")
	token, _, err := jwtMgr.GenerateAccessToken(userID, "user")
	if err != nil {
		t.Fatalf("generate access token: %v", err)
	}
	return "Bearer " + token
}

func TestDeviceControllerRegister(t *testing.T) {
	t.Run("created with device_token", func(t *testing.T) {
		repo := &mockDeviceRepo{
			getByTokenFn: func(ctx context.Context, token string) (*models.Device, error) {
				return nil, errors.New("not found")
			},
		}
		svc := service.NewDeviceService(repo)
		ctrl := NewDeviceController(svc, zap.NewNop())
		uid := uuid.New()

		body := `{"device_token":"ExpoPushToken[abc123]","platform":"ios","app_version":"1.0.0"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/devices", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", authHeader(t, uid))

		rec := httptest.NewRecorder()
		handler := auth.RequireAuth(auth.NewJWTManager("test-secret"), ctrl.Register)
		handler(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected %d got %d body=%s", http.StatusCreated, rec.Code, rec.Body.String())
		}

		var resp map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("parse response: %v", err)
		}
		if _, ok := resp["device"]; !ok {
			t.Fatalf("expected device in response: %v", resp)
		}
	})

	t.Run("created with legacy token field", func(t *testing.T) {
		repo := &mockDeviceRepo{
			getByTokenFn: func(ctx context.Context, token string) (*models.Device, error) {
				return nil, errors.New("not found")
			},
		}
		svc := service.NewDeviceService(repo)
		ctrl := NewDeviceController(svc, zap.NewNop())
		uid := uuid.New()

		body := `{"token":"ExpoPushToken[legacy]","platform":"android"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/devices", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", authHeader(t, uid))

		rec := httptest.NewRecorder()
		handler := auth.RequireAuth(auth.NewJWTManager("test-secret"), ctrl.Register)
		handler(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected %d got %d body=%s", http.StatusCreated, rec.Code, rec.Body.String())
		}
	})

	t.Run("conflict when token belongs to another user", func(t *testing.T) {
		other := uuid.New().String()
		repo := &mockDeviceRepo{
			getByTokenFn: func(ctx context.Context, token string) (*models.Device, error) {
				return &models.Device{DeviceID: uuid.New().String(), UserID: other, DeviceToken: token}, nil
			},
			updateFn: func(ctx context.Context, device *models.Device) error {
				return errors.New("must not update")
			},
		}
		svc := service.NewDeviceService(repo)
		ctrl := NewDeviceController(svc, zap.NewNop())
		uid := uuid.New()

		body := `{"device_token":"ExpoPushToken[abc123]","platform":"ios"}`
		req := httptest.NewRequest(http.MethodPost, "/api/v1/devices", bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", authHeader(t, uid))

		rec := httptest.NewRecorder()
		handler := auth.RequireAuth(auth.NewJWTManager("test-secret"), ctrl.Register)
		handler(rec, req)

		if rec.Code != http.StatusConflict {
			t.Fatalf("expected %d got %d body=%s", http.StatusConflict, rec.Code, rec.Body.String())
		}
	})

	t.Run("validation failed on missing token", func(t *testing.T) {
		repo := &mockDeviceRepo{}
		svc := service.NewDeviceService(repo)
		ctrl := NewDeviceController(svc, zap.NewNop())
		uid := uuid.New()

		req := httptest.NewRequest(http.MethodPost, "/api/v1/devices", bytes.NewBufferString(`{"platform":"ios"}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", authHeader(t, uid))

		rec := httptest.NewRecorder()
		handler := auth.RequireAuth(auth.NewJWTManager("test-secret"), ctrl.Register)
		handler(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected %d got %d body=%s", http.StatusBadRequest, rec.Code, rec.Body.String())
		}
	})
}
