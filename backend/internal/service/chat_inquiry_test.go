package service_test

import (
    "context"
    "testing"
    "time"
    "encoding/json"

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
func (f *fakeChatRepo) GetRoomByMasterProfile(_ context.Context, masterProfileID uuid.UUID) (*model.ChatRoom, error) {
    for _, r := range f.rooms {
        if r.MasterProfileID != nil && *r.MasterProfileID == masterProfileID {
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
func (fakeBroadcaster) SubscribeRoom(_ uuid.UUID, _ chan<- []byte) func()                         { return func() {} }

func newTestChatService(repo *fakeChatRepo, ir service.InquiryResolver) service.ChatService {
    return service.NewChatService(repo, fakeApptResolver{}, ir, fakeBroadcaster{})
}

// --- Test: GetRoomByMasterProfile ---

func TestGetRoomByMasterProfile_NotFound(t *testing.T) {
    repo := newFakeChatRepo()
    room, err := repo.GetRoomByMasterProfile(context.Background(), uuid.New())
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
