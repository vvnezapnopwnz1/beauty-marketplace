package push

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/beauty-marketplace/backend/pkg/models"
	"go.uber.org/zap"
)

type mockDeviceRepo struct {
	devices []models.Device
	deleted []string
}

func (m *mockDeviceRepo) Create(context.Context, *models.Device) error               { return nil }
func (m *mockDeviceRepo) GetByToken(context.Context, string) (*models.Device, error) { return nil, nil }
func (m *mockDeviceRepo) GetByUser(context.Context, string) ([]models.Device, error) { return nil, nil }
func (m *mockDeviceRepo) Update(context.Context, *models.Device) error               { return nil }
func (m *mockDeviceRepo) DeleteByUser(context.Context, string) error                 { return nil }
func (m *mockDeviceRepo) GetByUsers(context.Context, []string) ([]models.Device, error) {
	return m.devices, nil
}
func (m *mockDeviceRepo) Delete(_ context.Context, id string) error {
	m.deleted = append(m.deleted, id)
	return nil
}

func TestExpoPusher_DeviceNotRegisteredDeletesDevice(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload []map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"data": []map[string]any{
				{"status": "error", "details": map[string]any{"error": "DeviceNotRegistered"}},
			},
		})
	}))
	defer server.Close()

	repo := &mockDeviceRepo{
		devices: []models.Device{{DeviceID: "device-1", DeviceToken: "ExpoPushToken[1]"}},
	}
	pusher := NewExpoPusher(repo, zap.NewNop())
	pusher.url = server.URL

	pusher.PushForUsers(context.Background(), []string{"user-1"}, "Title", "Body", nil)

	if len(repo.deleted) != 1 || repo.deleted[0] != "device-1" {
		t.Fatalf("expected device-1 deleted, got %#v", repo.deleted)
	}
}
