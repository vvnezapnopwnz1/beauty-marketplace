package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	domainmodel "github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/repository"
)

var (
	ErrClaimAlreadyClaimed   = errors.New("salon already claimed by platform")
	ErrClaimAlreadySubmitted = errors.New("active claim already submitted")
	ErrClaimNotFound         = errors.New("claim not found")
	ErrClaimNotPending       = errors.New("claim is not in pending state")
)

// SubmitClaimInput is the payload for Submit.
type SubmitClaimInput struct {
	UserID          uuid.UUID
	Source          string
	ExternalID      string
	RelationType    string
	Comment         *string
	SnapshotName    string
	SnapshotAddress *string
	SnapshotPhone   *string
	SnapshotPhoto   *string
}

// SalonClaimService handles salon claim business logic.
type SalonClaimService interface {
	// Submit validates and persists a new claim. Returns ErrClaimAlreadyClaimed if
	// the external place is already linked to a platform salon, or ErrClaimAlreadySubmitted
	// if this user already has an active claim for this place.
	Submit(ctx context.Context, in SubmitClaimInput) (*model.SalonClaim, error)
	// GetStatus returns the caller's active claim for a given place, or nil if none.
	GetStatus(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error)
	// ListForAdmin returns paginated claims filtered by status for the admin page.
	ListForAdmin(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error)
	// Approve approves a pending claim and creates the salon+members atomically.
	// Returns the new salon UUID.
	Approve(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error)
	// Reject marks a pending claim rejected with a reason.
	Reject(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error
}

type salonClaimService struct {
	claimRepo repository.SalonClaimRepository
	salonRepo repository.SalonRepository
	dashRepo  repository.DashboardRepository
	places    PlacesService
	notify    NotificationService
}

// NewSalonClaimService constructs SalonClaimService.
func NewSalonClaimService(
	claimRepo repository.SalonClaimRepository,
	salonRepo repository.SalonRepository,
	dashRepo repository.DashboardRepository,
	places PlacesService,
	notify NotificationService,
) SalonClaimService {
	return &salonClaimService{
		claimRepo: claimRepo,
		salonRepo: salonRepo,
		dashRepo:  dashRepo,
		places:    places,
		notify:    notify,
	}
}

func (s *salonClaimService) Submit(ctx context.Context, in SubmitClaimInput) (*model.SalonClaim, error) {
	existing, err := s.salonRepo.FindByExternalID(ctx, in.Source, in.ExternalID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrClaimAlreadyClaimed
	}

	active, err := s.claimRepo.FindActiveByUserAndPlace(ctx, in.UserID, in.Source, in.ExternalID)
	if err != nil {
		return nil, err
	}
	if active != nil {
		return nil, ErrClaimAlreadySubmitted
	}

	relType := in.RelationType
	if relType == "" {
		relType = "owner"
	}

	c := &model.SalonClaim{
		UserID:          in.UserID,
		RelationType:    relType,
		Comment:         in.Comment,
		Source:          in.Source,
		ExternalID:      in.ExternalID,
		SnapshotName:    in.SnapshotName,
		SnapshotAddress: in.SnapshotAddress,
		SnapshotPhone:   in.SnapshotPhone,
		SnapshotPhoto:   in.SnapshotPhoto,
		Status:          "pending",
	}
	if err := s.claimRepo.Create(ctx, c); err != nil {
		return nil, err
	}
	if s.notify != nil {
		payload, _ := json.Marshal(map[string]any{"claimId": c.ID, "source": c.Source, "externalId": c.ExternalID, "status": c.Status})
		_ = s.notify.CreateForUsers(ctx, []uuid.UUID{c.UserID}, "claim.submitted", "Заявка отправлена", "Заявка на салон отправлена на модерацию", payload)
	}
	return c, nil
}

func (s *salonClaimService) GetStatus(ctx context.Context, userID uuid.UUID, source, externalID string) (*model.SalonClaim, error) {
	return s.claimRepo.FindActiveByUserAndPlace(ctx, userID, source, externalID)
}

func (s *salonClaimService) ListForAdmin(ctx context.Context, status string, page, pageSize int) ([]repository.SalonClaimRow, int64, error) {
	return s.claimRepo.ListByStatus(ctx, status, page, pageSize)
}

func (s *salonClaimService) Approve(ctx context.Context, claimID, reviewerID uuid.UUID) (uuid.UUID, error) {
	claim, err := s.claimRepo.GetByID(ctx, claimID)
	if err != nil {
		return uuid.Nil, err
	}
	if claim == nil {
		return uuid.Nil, ErrClaimNotFound
	}
	if claim.Status != "pending" {
		return uuid.Nil, ErrClaimNotPending
	}
	salonID, err := s.claimRepo.ApproveClaim(ctx, claimID, reviewerID)
	if err != nil {
		return uuid.Nil, err
	}
	_ = s.bootstrapSalonSchedule(ctx, salonID, claim)
	if s.notify != nil {
		payload, _ := json.Marshal(map[string]any{"claimId": claimID, "salonId": salonID, "status": "approved"})
		_ = s.notify.CreateForUsers(ctx, []uuid.UUID{claim.UserID}, "claim.approved", "Заявка одобрена", "Ваш салон успешно добавлен в платформу", payload)
	}
	return salonID, nil
}

func (s *salonClaimService) Reject(ctx context.Context, claimID, reviewerID uuid.UUID, reason string) error {
	claim, err := s.claimRepo.GetByID(ctx, claimID)
	if err != nil {
		return err
	}
	if claim == nil {
		return ErrClaimNotFound
	}
	if claim.Status != "pending" {
		return ErrClaimNotPending
	}
	if err := s.claimRepo.RejectClaim(ctx, claimID, reviewerID, reason); err != nil {
		return err
	}
	if s.notify != nil {
		payload, _ := json.Marshal(map[string]any{"claimId": claimID, "status": "rejected", "reason": reason})
		_ = s.notify.CreateForUsers(ctx, []uuid.UUID{claim.UserID}, "claim.rejected", "Заявка отклонена", "Заявка на салон отклонена модератором", payload)
	}
	return nil
}

func (s *salonClaimService) bootstrapSalonSchedule(ctx context.Context, salonID uuid.UUID, claim *model.SalonClaim) error {
	existing, err := s.dashRepo.ListWorkingHours(ctx, salonID)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil
	}

	rows := defaultSalonWorkingHours(salonID)
	if claim != nil && strings.EqualFold(claim.Source, "2gis") && strings.TrimSpace(claim.ExternalID) != "" {
		detail, err := s.places.GetByExternalID(ctx, claim.ExternalID, "ru_RU")
		if err == nil && detail != nil {
			if from2GIS := mapWorkingHoursFromPlaceDetail(salonID, detail); len(from2GIS) > 0 {
				rows = from2GIS
			}
		}
	}
	return s.dashRepo.ReplaceWorkingHours(ctx, salonID, rows)
}

func defaultSalonWorkingHours(salonID uuid.UUID) []model.WorkingHour {
	rows := make([]model.WorkingHour, 0, 7)
	for day := 0; day < 7; day++ {
		rows = append(rows, model.WorkingHour{
			SalonID:   salonID,
			DayOfWeek: int16(day),
			OpensAt:   "10:00:00",
			ClosesAt:  "21:00:00",
			IsClosed:  day == 0, // Sunday.
		})
	}
	return rows
}

func mapWorkingHoursFromPlaceDetail(salonID uuid.UUID, detail *domainmodel.PlaceDetail) []model.WorkingHour {
	byDay := map[int]model.WorkingHour{}
	for day := 0; day < 7; day++ {
		byDay[day] = model.WorkingHour{
			SalonID:   salonID,
			DayOfWeek: int16(day),
			OpensAt:   "10:00:00",
			ClosesAt:  "21:00:00",
			IsClosed:  true,
		}
	}

	if detail == nil {
		return nil
	}
	for _, day := range detail.WeeklySchedule {
		dow, ok := dayToWeekday(day.Day)
		if !ok {
			continue
		}
		row := byDay[dow]
		if detail.Schedule247 || day.Is247 {
			row.IsClosed = false
			row.OpensAt = "00:00:00"
			row.ClosesAt = "23:59:00"
			row.BreakStartsAt = nil
			row.BreakEndsAt = nil
			byDay[dow] = row
			continue
		}
		if len(day.WorkingHours) == 0 {
			row.IsClosed = true
			row.BreakStartsAt = nil
			row.BreakEndsAt = nil
			byDay[dow] = row
			continue
		}
		firstFrom, okFrom := normalizeScheduleClock(day.WorkingHours[0].From)
		firstTo, okTo := normalizeScheduleClock(day.WorkingHours[0].To)
		if !okFrom || !okTo {
			continue
		}
		row.IsClosed = false
		row.OpensAt = firstFrom
		row.ClosesAt = firstTo
		row.BreakStartsAt = nil
		row.BreakEndsAt = nil
		if len(day.WorkingHours) > 1 {
			bs, okBS := normalizeScheduleClock(day.WorkingHours[0].To)
			be, okBE := normalizeScheduleClock(day.WorkingHours[1].From)
			if okBS && okBE && bs < be {
				row.BreakStartsAt = &bs
				row.BreakEndsAt = &be
			}
			lastTo, okLast := normalizeScheduleClock(day.WorkingHours[len(day.WorkingHours)-1].To)
			if okLast {
				row.ClosesAt = lastTo
			}
		}
		byDay[dow] = row
	}

	rows := make([]model.WorkingHour, 0, 7)
	for day := 0; day < 7; day++ {
		rows = append(rows, byDay[day])
	}
	return rows
}

func dayToWeekday(day string) (int, bool) {
	switch strings.ToLower(strings.TrimSpace(day)) {
	case "sun":
		return 0, true
	case "mon":
		return 1, true
	case "tue":
		return 2, true
	case "wed":
		return 3, true
	case "thu":
		return 4, true
	case "fri":
		return 5, true
	case "sat":
		return 6, true
	default:
		return 0, false
	}
}

func normalizeScheduleClock(v string) (string, bool) {
	s := strings.TrimSpace(v)
	if len(s) == 5 {
		return s + ":00", true
	}
	if len(s) == 8 {
		return s, true
	}
	return "", false
}
