package service_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/internal/service"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// fakeChatRepo is a full in-memory implementation of repository.ChatRepository.
type fakeChatRepo struct {
	rooms    map[uuid.UUID]*model.ChatRoom
	messages []model.ChatMessage
}

func newFakeChatRepo() *fakeChatRepo {
	return &fakeChatRepo{rooms: map[uuid.UUID]*model.ChatRoom{}}
}

func (f *fakeChatRepo) GetRoomByAppointment(_ context.Context, _ uuid.UUID) (*model.ChatRoom, error) {
	return nil, nil
}
func (f *fakeChatRepo) GetRoomBySalon(_ context.Context, salonID uuid.UUID) (*model.ChatRoom, error) {
	for _, r := range f.rooms {
		if r.SalonID != nil && *r.SalonID == salonID && r.Type == model.ChatRoomTypeInquiry && r.MasterProfileID == nil {
			return r, nil
		}
	}
	return nil, nil
}
func (f *fakeChatRepo) GetRoomByMasterProfile(_ context.Context, salonID, masterProfileID uuid.UUID) (*model.ChatRoom, error) {
	for _, r := range f.rooms {
		if r.SalonID != nil && *r.SalonID == salonID && r.MasterProfileID != nil && *r.MasterProfileID == masterProfileID {
			return r, nil
		}
	}
	return nil, nil
}
func (f *fakeChatRepo) GetRoomByID(_ context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	r, ok := f.rooms[id]
	if !ok {
		return nil, nil
	}
	return r, nil
}
func (f *fakeChatRepo) GetRoomByAccessToken(_ context.Context, token uuid.UUID) (*model.ChatRoom, error) {
	for _, r := range f.rooms {
		if r.AccessToken == token {
			return r, nil
		}
	}
	return nil, nil
}
func (f *fakeChatRepo) CreateRoom(_ context.Context, room *model.ChatRoom) error {
	f.rooms[room.ID] = room
	return nil
}
func (f *fakeChatRepo) UpdateRoomStatus(_ context.Context, roomID uuid.UUID, status model.ChatRoomStatus, _ *time.Time) error {
	if r, ok := f.rooms[roomID]; ok {
		r.Status = status
	}
	return nil
}
func (f *fakeChatRepo) UnlockRoomFirstReply(_ context.Context, roomID uuid.UUID) error {
	if r, ok := f.rooms[roomID]; ok {
		r.LockedUntilFirstReply = false
	}
	return nil
}
func (f *fakeChatRepo) InsertMessage(_ context.Context, msg *model.ChatMessage) error {
	msg.ID = uuid.New()
	msg.CreatedAt = time.Now()
	f.messages = append(f.messages, *msg)
	return nil
}
func (f *fakeChatRepo) ListMessages(_ context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
	var out []model.ChatMessage
	for _, m := range f.messages {
		if m.RoomID == roomID {
			out = append(out, m)
		}
	}
	if offset < len(out) {
		out = out[offset:]
	} else {
		out = nil
	}
	if limit > 0 && limit < len(out) {
		out = out[:limit]
	}
	return out, nil
}
func (f *fakeChatRepo) MarkAllReadInRoom(_ context.Context, _, _ uuid.UUID) error { return nil }
func (f *fakeChatRepo) FindRoomsToReadonly(_ context.Context, _ time.Time) ([]model.ChatRoom, error) {
	return nil, nil
}
func (f *fakeChatRepo) GetAppointmentChatContext(_ context.Context, _ uuid.UUID) (repository.AppointmentChatRow, error) {
	return repository.AppointmentChatRow{}, nil
}
func (f *fakeChatRepo) GetSalonChatContext(_ context.Context, salonID uuid.UUID) (repository.SalonChatRow, error) {
	return repository.SalonChatRow{SalonID: salonID}, nil
}
func (f *fakeChatRepo) GetInquiryParticipants(_ context.Context, salonID uuid.UUID, _ *uuid.UUID) (repository.SalonChatRow, error) {
	return repository.SalonChatRow{SalonID: salonID}, nil
}
func (f *fakeChatRepo) ListInquiryRooms(_ context.Context, salonID uuid.UUID, _, _ int) ([]model.ChatRoom, error) {
	var out []model.ChatRoom
	for _, room := range f.rooms {
		if room.SalonID != nil && *room.SalonID == salonID && room.Type == model.ChatRoomTypeInquiry {
			out = append(out, *room)
		}
	}
	return out, nil
}
func (f *fakeChatRepo) GetUnreadCount(_ context.Context, _, _ uuid.UUID) (int, error) {
	return 0, nil
}
func (f *fakeChatRepo) GetUnreadCounts(_ context.Context, _ []uuid.UUID, _ uuid.UUID) (map[uuid.UUID]int, error) {
	return map[uuid.UUID]int{}, nil
}
func (f *fakeChatRepo) FindUnansweredInquiries(_ context.Context, _ time.Duration) ([]model.ChatRoom, error) {
	return nil, nil
}

type fakeApptResolver struct{}

func (fakeApptResolver) ResolveChatParticipants(_ context.Context, _ uuid.UUID) (service.ChatParticipants, error) {
	return service.ChatParticipants{}, nil
}

type fakeInquiryResolver struct {
	ownerIDs []uuid.UUID
	masterID *uuid.UUID
}

func (f *fakeInquiryResolver) ResolveInquiryParticipants(_ context.Context, _ uuid.UUID, _ *uuid.UUID) (service.ChatParticipants, error) {
	return service.ChatParticipants{
		OwnerUserIDs: f.ownerIDs,
		MasterUserID: f.masterID,
	}, nil
}

type fakeBroadcaster struct{}

func (fakeBroadcaster) BroadcastChatMessage(_ context.Context, _ []uuid.UUID, _ json.RawMessage) {}
func (fakeBroadcaster) BroadcastToRoom(_ context.Context, _ uuid.UUID, _ json.RawMessage)        {}
func (fakeBroadcaster) SubscribeRoom(_ uuid.UUID, _ chan<- []byte) func()                        { return func() {} }

type fakeNotifSvc struct{}

func (fakeNotifSvc) List(_ context.Context, _ uuid.UUID, _ bool, _, _ int) ([]repository.NotificationRow, error) {
	return nil, nil
}
func (fakeNotifSvc) Count(_ context.Context, _ uuid.UUID) (service.NotificationCounters, error) {
	return service.NotificationCounters{}, nil
}
func (fakeNotifSvc) MarkSeen(_ context.Context, _, _ uuid.UUID) (bool, error)  { return true, nil }
func (fakeNotifSvc) MarkAllSeen(_ context.Context, _ uuid.UUID) (int64, error) { return 0, nil }
func (fakeNotifSvc) MarkRead(_ context.Context, _, _ uuid.UUID) (bool, error)  { return true, nil }
func (fakeNotifSvc) MarkAllRead(_ context.Context, _ uuid.UUID) (int64, error) { return 0, nil }
func (fakeNotifSvc) CreateForUsers(_ context.Context, _ []uuid.UUID, _, _, _ string, _ json.RawMessage) error {
	return nil
}
func (fakeNotifSvc) Subscribe(_ uuid.UUID) (<-chan repository.NotificationRow, func()) {
	return nil, func() {}
}
func (fakeNotifSvc) PublishEvent(_ []uuid.UUID, _ string, _ json.RawMessage) {}

func newTestChatService(repo *fakeChatRepo, ir service.InquiryResolver) service.ChatService {
	return service.NewChatService(repo, fakeApptResolver{}, ir, fakeBroadcaster{}, fakeNotifSvc{})
}

// --- Test: GetRoomByMasterProfile ---

func TestGetRoomByMasterProfile_NotFound(t *testing.T) {
	repo := newFakeChatRepo()
	room, err := repo.GetRoomByMasterProfile(context.Background(), uuid.New(), uuid.New())
	require.NoError(t, err)
	require.Nil(t, room)
}

// --- Test: EnsureRoomForMasterInquiry ---

func TestEnsureRoomForMasterInquiry_CreatesNew(t *testing.T) {
	repo := newFakeChatRepo()
	svc := newTestChatService(repo, &fakeInquiryResolver{})

	salonID := uuid.New()
	masterProfileID := uuid.New()

	room, err := svc.EnsureRoomForMasterInquiry(context.Background(), salonID, masterProfileID)
	require.NoError(t, err)
	require.NotNil(t, room)
	require.Equal(t, model.ChatRoomTypeInquiry, room.Type)
	require.Equal(t, &salonID, room.SalonID)
	require.Equal(t, &masterProfileID, room.MasterProfileID)
}

func TestEnsureRoomForMasterInquiry_ReturnsExisting(t *testing.T) {
	repo := newFakeChatRepo()
	svc := newTestChatService(repo, &fakeInquiryResolver{})

	salonID := uuid.New()
	masterProfileID := uuid.New()

	room1, _ := svc.EnsureRoomForMasterInquiry(context.Background(), salonID, masterProfileID)
	room2, err := svc.EnsureRoomForMasterInquiry(context.Background(), salonID, masterProfileID)
	require.NoError(t, err)
	require.Equal(t, room1.ID, room2.ID)
}

func TestEnsureRoomForMasterInquiryScopesExistingRoomBySalon(t *testing.T) {
	repo := newFakeChatRepo()
	svc := newTestChatService(repo, &fakeInquiryResolver{})

	masterProfileID := uuid.New()
	room1, err := svc.EnsureRoomForMasterInquiry(context.Background(), uuid.New(), masterProfileID)
	require.NoError(t, err)
	room2, err := svc.EnsureRoomForMasterInquiry(context.Background(), uuid.New(), masterProfileID)
	require.NoError(t, err)

	require.NotEqual(t, room1.ID, room2.ID)
}

func TestListInquiryRoomsRejectsNonParticipant(t *testing.T) {
	repo := newFakeChatRepo()
	ownerID := uuid.New()
	svc := newTestChatService(repo, &fakeInquiryResolver{
		ownerIDs: []uuid.UUID{ownerID},
	})

	salonID := uuid.New()
	_, err := svc.EnsureRoomForInquiry(context.Background(), salonID)
	require.NoError(t, err)

	_, err = svc.ListInquiryRooms(context.Background(), salonID, uuid.New(), 50, 0)
	require.ErrorIs(t, err, service.ErrChatNotParticipant)
}

func TestGetUnreadCountsRejectsNonParticipant(t *testing.T) {
	repo := newFakeChatRepo()
	ownerID := uuid.New()
	svc := newTestChatService(repo, &fakeInquiryResolver{
		ownerIDs: []uuid.UUID{ownerID},
	})

	salonID := uuid.New()
	room, err := svc.EnsureRoomForInquiry(context.Background(), salonID)
	require.NoError(t, err)

	_, err = svc.GetUnreadCounts(context.Background(), []uuid.UUID{room.ID}, uuid.New())
	require.ErrorIs(t, err, service.ErrChatNotParticipant)
}

func TestRequestAppointmentRejectsNonParticipant(t *testing.T) {
	repo := newFakeChatRepo()
	ownerID := uuid.New()
	svc := newTestChatService(repo, &fakeInquiryResolver{
		ownerIDs: []uuid.UUID{ownerID},
	})

	salonID := uuid.New()
	room, err := svc.EnsureRoomForInquiry(context.Background(), salonID)
	require.NoError(t, err)

	_, err = svc.RequestAppointment(context.Background(), room.ID, uuid.New())
	require.ErrorIs(t, err, service.ErrChatNotParticipant)
}

func TestRequestAppointmentFromParticipantCreatesActionMessage(t *testing.T) {
	repo := newFakeChatRepo()
	ownerID := uuid.New()
	svc := newTestChatService(repo, &fakeInquiryResolver{
		ownerIDs: []uuid.UUID{ownerID},
	})

	salonID := uuid.New()
	room, err := svc.EnsureRoomForInquiry(context.Background(), salonID)
	require.NoError(t, err)

	msg, err := svc.RequestAppointment(context.Background(), room.ID, ownerID)
	require.NoError(t, err)
	require.Equal(t, "appointment_request", msg.Type)
	require.False(t, msg.IsSystem)
	require.Equal(t, model.ChatSenderRoleOwner, msg.SenderRole)
	require.Equal(t, &ownerID, msg.SenderUserID)
}

func TestSendMessageWithAttachment_Inquiry(t *testing.T) {
	repo := newFakeChatRepo()
	svc := newTestChatService(repo, &fakeInquiryResolver{
		ownerIDs: []uuid.UUID{uuid.New()},
	})

	salonID := uuid.New()
	room, _ := svc.EnsureRoomForInquiry(context.Background(), salonID)

	p := service.SendMessageWithAttachmentParams{
		RoomID:         room.ID,
		Body:           "Check this out",
		AttachmentURL:  "https://example.com/image.jpg",
		AttachmentType: "image/jpeg",
		AccessToken:    &room.AccessToken,
	}
	msg, err := svc.SendMessageWithAttachment(context.Background(), p)
	require.NoError(t, err)
	require.NotNil(t, msg)
	require.Equal(t, "https://example.com/image.jpg", *msg.AttachmentURL)
}
