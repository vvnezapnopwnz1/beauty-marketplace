package push

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/pkg/models"
	"go.uber.org/zap"
)

const defaultExpoURL = "https://exp.host/--/api/v2/push/send"

type ExpoPusher struct {
	deviceRepo repository.DeviceRepository
	client     *http.Client
	log        *zap.Logger
	url        string
}

func NewExpoPusher(deviceRepo repository.DeviceRepository, log *zap.Logger) *ExpoPusher {
	url := os.Getenv("EXPO_PUSH_API_URL")
	if url == "" {
		url = defaultExpoURL
	}
	return &ExpoPusher{
		deviceRepo: deviceRepo,
		client:     &http.Client{Timeout: 10 * time.Second},
		log:        log,
		url:        url,
	}
}

func (p *ExpoPusher) PushForUsers(ctx context.Context, userIDs []string, title, body string, data json.RawMessage) {
	if p == nil || len(userIDs) == 0 {
		return
	}
	devices, err := p.deviceRepo.GetByUsers(ctx, userIDs)
	if err != nil {
		p.log.Warn("expo push: list devices", zap.Error(err))
		return
	}
	if len(devices) == 0 {
		return
	}

	for i := 0; i < len(devices); i += 100 {
		end := i + 100
		if end > len(devices) {
			end = len(devices)
		}
		if err := p.pushBatch(ctx, devices[i:end], title, body, data); err != nil {
			p.log.Warn("expo push batch failed", zap.Error(err))
		}
	}
}

func (p *ExpoPusher) pushBatch(ctx context.Context, devices []models.Device, title, body string, data json.RawMessage) error {
	messages := make([]map[string]any, 0, len(devices))
	for _, d := range devices {
		messages = append(messages, map[string]any{
			"to":    d.DeviceToken,
			"title": title,
			"body":  body,
			"data":  json.RawMessage(data),
		})
	}

	backoff := []time.Duration{time.Second, 5 * time.Second, 30 * time.Second}
	var lastErr error
	for attempt := 0; attempt < len(backoff)+1; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff[attempt-1]):
			}
		}

		body, _ := json.Marshal(messages)
		req, _ := http.NewRequestWithContext(ctx, http.MethodPost, p.url, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := p.client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		var expoResp struct {
			Data []struct {
				Status  string `json:"status"`
				Details struct {
					Error string `json:"error"`
				} `json:"details"`
			} `json:"data"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&expoResp)
		_ = resp.Body.Close()
		if resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("expo status %d", resp.StatusCode)
			continue
		}
		for idx, ticket := range expoResp.Data {
			if ticket.Details.Error == "DeviceNotRegistered" && idx < len(devices) {
				_ = p.deviceRepo.Delete(ctx, devices[idx].DeviceID)
			}
		}
		return nil
	}
	return lastErr
}
