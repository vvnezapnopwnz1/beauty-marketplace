package controller

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/service"
	"github.com/google/uuid"
)

func TestChatRoomResponseCanExposeAccessTokenForGuestCredential(t *testing.T) {
	salonID := uuid.New()
	masterProfileID := uuid.New()
	token := uuid.New()
	room := &model.ChatRoom{
		ID:                    uuid.New(),
		Type:                  model.ChatRoomTypeInquiry,
		SalonID:               &salonID,
		MasterProfileID:       &masterProfileID,
		Status:                model.ChatRoomStatusActive,
		LockedUntilFirstReply: true,
		AccessToken:           token,
	}

	payload, err := json.Marshal(chatRoomResponse(room, true))
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(payload, &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if got["accessToken"] != token.String() {
		t.Fatalf("expected accessToken %q, got %#v", token.String(), got["accessToken"])
	}
	if got["salonId"] != salonID.String() {
		t.Fatalf("expected salonId %q, got %#v", salonID.String(), got["salonId"])
	}
	if got["masterProfileId"] != masterProfileID.String() {
		t.Fatalf("expected masterProfileId %q, got %#v", masterProfileID.String(), got["masterProfileId"])
	}
}

func TestChatRoomResponseHidesAccessTokenByDefault(t *testing.T) {
	room := &model.ChatRoom{
		ID:          uuid.New(),
		Type:        model.ChatRoomTypeInquiry,
		Status:      model.ChatRoomStatusActive,
		AccessToken: uuid.New(),
	}

	payload, err := json.Marshal(chatRoomResponse(room, false))
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(payload, &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if _, ok := got["accessToken"]; ok {
		t.Fatalf("expected accessToken to be hidden, got %#v", got["accessToken"])
	}
}

func TestGetInquiryRoomRequiresAccessToken(t *testing.T) {
	roomID := uuid.New()
	token := uuid.New()
	ctrl := NewChatController(&stubChatService{
		room: &model.ChatRoom{
			ID:          roomID,
			Type:        model.ChatRoomTypeInquiry,
			Status:      model.ChatRoomStatusActive,
			AccessToken: token,
		},
	}, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/inquiry/rooms/"+roomID.String(), nil)
	req.SetPathValue("roomId", roomID.String())
	rec := httptest.NewRecorder()

	ctrl.GetInquiryRoom(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected unauthorized without accessToken, got %d body=%q", rec.Code, rec.Body.String())
	}
}

func TestGetInquiryRoomAcceptsMatchingAccessTokenAndHidesToken(t *testing.T) {
	roomID := uuid.New()
	token := uuid.New()
	ctrl := NewChatController(&stubChatService{
		room: &model.ChatRoom{
			ID:          roomID,
			Type:        model.ChatRoomTypeInquiry,
			Status:      model.ChatRoomStatusActive,
			AccessToken: token,
		},
	}, nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/inquiry/rooms/"+roomID.String()+"?accessToken="+token.String(), nil)
	req.SetPathValue("roomId", roomID.String())
	rec := httptest.NewRecorder()

	ctrl.GetInquiryRoom(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected ok for matching accessToken, got %d body=%q", rec.Code, rec.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if _, ok := got["accessToken"]; ok {
		t.Fatalf("expected accessToken to be hidden, got %#v", got["accessToken"])
	}
}

type stubChatService struct {
	service.ChatService
	room *model.ChatRoom
}

func (s *stubChatService) GetRoom(_ context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	if s.room == nil || s.room.ID != id {
		return nil, service.ErrChatRoomNotFound
	}
	return s.room, nil
}
