package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

type chatRepository struct {
	db *gorm.DB
}

func NewChatRepository(db *gorm.DB) repository.ChatRepository {
	return &chatRepository{db: db}
}

func (r *chatRepository) GetRoomByAppointment(ctx context.Context, appointmentID uuid.UUID) (*model.ChatRoom, error) {
	var room model.ChatRoom
	if err := r.db.WithContext(ctx).
		Where("appointment_id = ? AND type = ?", appointmentID, model.ChatRoomTypeExternal).
		First(&room).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *chatRepository) GetRoomBySalon(ctx context.Context, salonID uuid.UUID) (*model.ChatRoom, error) {
	var room model.ChatRoom
	if err := r.db.WithContext(ctx).
		Where("salon_id = ? AND type = ?", salonID, model.ChatRoomTypeInquiry).
		First(&room).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *chatRepository) GetRoomByID(ctx context.Context, id uuid.UUID) (*model.ChatRoom, error) {
	var room model.ChatRoom
	if err := r.db.WithContext(ctx).First(&room, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *chatRepository) GetRoomByAccessToken(ctx context.Context, token uuid.UUID) (*model.ChatRoom, error) {
	var room model.ChatRoom
	if err := r.db.WithContext(ctx).First(&room, "access_token = ?", token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &room, nil
}

func (r *chatRepository) CreateRoom(ctx context.Context, room *model.ChatRoom) error {
	return r.db.WithContext(ctx).Create(room).Error
}

func (r *chatRepository) UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.ChatRoomStatus, readonlyAt *time.Time) error {
	updates := map[string]any{
		"status":     status,
		"updated_at": time.Now(),
	}
	if readonlyAt != nil {
		updates["readonly_at"] = *readonlyAt
	}
	return r.db.WithContext(ctx).Model(&model.ChatRoom{}).
		Where("id = ?", roomID).Updates(updates).Error
}

func (r *chatRepository) UnlockRoomFirstReply(ctx context.Context, roomID uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&model.ChatRoom{}).
		Where("id = ?", roomID).
		Update("locked_until_first_reply", false).Error
}

func (r *chatRepository) InsertMessage(ctx context.Context, msg *model.ChatMessage) error {
	return r.db.WithContext(ctx).Create(msg).Error
}

func (r *chatRepository) ListMessages(ctx context.Context, roomID uuid.UUID, limit, offset int) ([]model.ChatMessage, error) {
	var msgs []model.ChatMessage
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	if err := r.db.WithContext(ctx).
		Where("room_id = ?", roomID).
		Order("created_at ASC").
		Limit(limit).Offset(offset).
		Find(&msgs).Error; err != nil {
		return nil, err
	}
	return msgs, nil
}

func (r *chatRepository) MarkAllReadInRoom(ctx context.Context, roomID, userID uuid.UUID) error {
	return r.db.WithContext(ctx).Exec(
		`INSERT INTO chat_message_reads (message_id, user_id)
		 SELECT id, ? FROM chat_messages WHERE room_id = ?
		 ON CONFLICT (message_id, user_id) DO NOTHING`,
		userID, roomID,
	).Error
}

func (r *chatRepository) FindRoomsToReadonly(ctx context.Context, completedBefore time.Time) ([]model.ChatRoom, error) {
	var rooms []model.ChatRoom
	err := r.db.WithContext(ctx).
		Joins("JOIN appointments a ON a.id = chat_rooms.appointment_id").
		Where(`chat_rooms.type = ? AND chat_rooms.status = ?
			AND a.status = 'completed' AND a.updated_at <= ?`,
			model.ChatRoomTypeExternal, model.ChatRoomStatusActive, completedBefore).
		Find(&rooms).Error
	return rooms, err
}

func (r *chatRepository) GetAppointmentChatContext(ctx context.Context, apptID uuid.UUID) (repository.AppointmentChatRow, error) {
	var apptRow struct {
		ID             uuid.UUID
		SalonID        *uuid.UUID
		MasterUserID   *uuid.UUID
		ClientUserID   *uuid.UUID
		GuestPhoneE164 *string
	}
	if err := r.db.WithContext(ctx).Raw(`
		SELECT a.id,
		       a.salon_id,
		       mp.user_id AS master_user_id,
		       a.client_user_id,
		       a.guest_phone_e164
		FROM appointments a
		LEFT JOIN master_profiles mp ON mp.id = a.master_profile_id
		WHERE a.id = ?`, apptID).Scan(&apptRow).Error; err != nil {
		return repository.AppointmentChatRow{}, err
	}
	if apptRow.ID == uuid.Nil {
		return repository.AppointmentChatRow{}, gorm.ErrRecordNotFound
	}

	out := repository.AppointmentChatRow{
		AppointmentID: apptRow.ID,
		MasterUserID:  apptRow.MasterUserID,
		GuestUserID:   apptRow.ClientUserID,
	}
	if apptRow.GuestPhoneE164 != nil {
		out.GuestPhone = *apptRow.GuestPhoneE164
	}

	if apptRow.SalonID != nil {
		var members []struct {
			UserID uuid.UUID
			Role   string
		}
		if err := r.db.WithContext(ctx).Raw(`
			SELECT user_id, role FROM salon_members
			WHERE salon_id = ? AND role IN ('owner','admin','receptionist')`,
			*apptRow.SalonID).Scan(&members).Error; err != nil {
			return repository.AppointmentChatRow{}, err
		}
		for _, m := range members {
			switch m.Role {
			case "owner":
				out.OwnerUserIDs = append(out.OwnerUserIDs, m.UserID)
			case "admin", "receptionist":
				out.ReceptionistIDs = append(out.ReceptionistIDs, m.UserID)
			}
		}
	}

	// If no master via master_profile_id, try via salon_master_id → salon_masters → master_profiles
	if out.MasterUserID == nil {
		var masterRow struct {
			MasterUserID *uuid.UUID
		}
		_ = r.db.WithContext(ctx).Raw(`
			SELECT mp.user_id AS master_user_id
			FROM appointments a
			JOIN salon_masters sm ON sm.id = a.salon_master_id
			JOIN master_profiles mp ON mp.id = sm.master_id
			WHERE a.id = ?`, apptID).Scan(&masterRow).Error
		if masterRow.MasterUserID != nil {
			out.MasterUserID = masterRow.MasterUserID
		}
	}

	return out, nil
}

func (r *chatRepository) GetSalonChatContext(ctx context.Context, salonID uuid.UUID) (repository.SalonChatRow, error) {
	// Get salon staff members
	var members []struct {
		UserID uuid.UUID
		Role   string
	}
	if err := r.db.WithContext(ctx).Raw(`
		SELECT user_id, role FROM salon_members
		WHERE salon_id = ? AND role IN ('owner','admin','receptionist')`,
		salonID).Scan(&members).Error; err != nil {
		return repository.SalonChatRow{}, err
	}

	// Get all masters for the salon
	var masters []struct {
		UserID uuid.UUID
	}
	if err := r.db.WithContext(ctx).Raw(`
		SELECT mp.user_id 
		FROM master_profiles mp
		JOIN salon_masters sm ON sm.master_id = mp.id
		WHERE sm.salon_id = ? AND sm.is_active = true`,
		salonID).Scan(&masters).Error; err != nil {
		return repository.SalonChatRow{}, err
	}

	out := repository.SalonChatRow{
		SalonID: salonID,
	}

	for _, m := range members {
		switch m.Role {
		case "owner":
			out.OwnerUserIDs = append(out.OwnerUserIDs, m.UserID)
		case "admin", "receptionist":
			out.ReceptionistUserIDs = append(out.ReceptionistUserIDs, m.UserID)
		}
	}

	for _, m := range masters {
		out.MasterUserIDs = append(out.MasterUserIDs, m.UserID)
	}

	return out, nil
}
