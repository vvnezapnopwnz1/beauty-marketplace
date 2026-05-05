package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
)

func (s *dashboardService) ListStaff(ctx context.Context, salonID uuid.UUID) ([]model.SalonMaster, error) {
	return s.dash.ListStaff(ctx, salonID)
}

func (s *dashboardService) CreateStaff(ctx context.Context, salonID uuid.UUID, in StaffInput) (*model.SalonMaster, error) {
	n := trimSpace(in.DisplayName)
	if n == "" {
		return nil, fmt.Errorf("display name is required")
	}
	specs := pq.StringArray(in.Specializations)
	if specs == nil {
		specs = pq.StringArray{}
	}
	var bioPtr *string
	if in.Bio != nil && trimSpace(*in.Bio) != "" {
		b := trimSpace(*in.Bio)
		bioPtr = &b
	}
	normalizedPhone := normalizePhoneE164Ptr(in.Phone)
	if normalizedPhone != nil {
		if in.PhoneVerificationProof == nil || *in.PhoneVerificationProof == "" {
			return nil, fmt.Errorf("phone verification proof is required when setting phone")
		}
		proofID, err := uuid.Parse(*in.PhoneVerificationProof)
		if err != nil {
			return nil, fmt.Errorf("invalid phone verification proof")
		}
		if err := s.phoneOTP.ValidateAndConsumeProof(ctx, proofID, *normalizedPhone, salonID); err != nil {
			return nil, fmt.Errorf("phone verification failed: %w", err)
		}
	}
	mp := &model.MasterProfile{
		DisplayName:     n,
		Bio:             bioPtr,
		Specializations: specs,
		YearsExperience: in.YearsExperience,
		PhoneE164:       normalizedPhone,
	}
	if err := s.dash.CreateMasterProfile(ctx, mp); err != nil {
		return nil, err
	}
	mid := mp.ID
	status := "active"
	if !in.IsActive {
		status = "inactive"
	}
	st := &model.SalonMaster{
		SalonID:               salonID,
		MasterID:              &mid,
		DisplayName:           n,
		Role:                  in.Role,
		Level:                 in.Level,
		Phone:                 in.Phone,
		TelegramUsername:      in.TelegramUsername,
		Email:                 in.Email,
		Color:                 in.Color,
		DashboardAccess:       in.DashboardAccess,
		TelegramNotifications: in.TelegramNotifications,
		IsActive:              in.IsActive,
		Status:                status,
	}
	if in.JoinedAt != nil && trimSpace(*in.JoinedAt) != "" {
		t, err := time.Parse("2006-01-02", trimSpace(*in.JoinedAt))
		if err == nil {
			st.JoinedAt = &t
		}
	}
	if err := s.dash.CreateStaff(ctx, st); err != nil {
		return nil, err
	}
	if err := s.applyStaffServiceAssignments(ctx, salonID, st.ID, in); err != nil {
		return nil, err
	}
	if err := s.initStaffScheduleFromSalon(ctx, salonID, st.ID); err != nil {
		return nil, err
	}
	return st, nil
}

// initStaffScheduleFromSalon copies the salon's working_hours into salon_master_hours for a
// newly created staff member so their schedule is non-empty by default.
func (s *dashboardService) initStaffScheduleFromSalon(ctx context.Context, salonID, staffID uuid.UUID) error {
	salonHours, err := s.dash.ListWorkingHours(ctx, salonID)
	if err != nil {
		return err
	}
	var rows []model.SalonMasterHour
	if len(salonHours) > 0 {
		rows = make([]model.SalonMasterHour, 0, len(salonHours))
		for _, h := range salonHours {
			rows = append(rows, model.SalonMasterHour{
				DayOfWeek:     h.DayOfWeek,
				OpensAt:       h.OpensAt,
				ClosesAt:      h.ClosesAt,
				IsDayOff:      h.IsClosed,
				BreakStartsAt: h.BreakStartsAt,
				BreakEndsAt:   h.BreakEndsAt,
			})
		}
	} else {
		// Salon has no schedule yet — use the platform default (Mon–Sat 10:00–21:00, Sun off).
		rows = make([]model.SalonMasterHour, 0, 7)
		for day := 0; day < 7; day++ {
			rows = append(rows, model.SalonMasterHour{
				DayOfWeek: int16(day),
				OpensAt:   "10:00:00",
				ClosesAt:  "21:00:00",
				IsDayOff:  day == 0,
			})
		}
	}
	return s.dash.ReplaceStaffWorkingHours(ctx, staffID, salonID, rows)
}

func (s *dashboardService) UpdateStaff(ctx context.Context, salonID, staffID uuid.UUID, in StaffInput) (*model.SalonMaster, error) {
	st, err := s.dash.GetStaff(ctx, salonID, staffID)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, gorm.ErrRecordNotFound
	}
	if trimSpace(in.DisplayName) != "" {
		st.DisplayName = trimSpace(in.DisplayName)
	}
	st.Role = in.Role
	st.Level = in.Level
	st.Bio = in.Bio
	st.Phone = in.Phone
	st.TelegramUsername = in.TelegramUsername
	st.Email = in.Email
	st.Color = in.Color
	if in.JoinedAt != nil {
		if trimSpace(*in.JoinedAt) == "" {
			st.JoinedAt = nil
		} else {
			t, err := time.Parse("2006-01-02", trimSpace(*in.JoinedAt))
			if err == nil {
				st.JoinedAt = &t
			}
		}
	}
	st.DashboardAccess = in.DashboardAccess
	st.TelegramNotifications = in.TelegramNotifications
	if st.Status == "pending" {
		st.IsActive = false
	} else {
		st.IsActive = in.IsActive
		if in.IsActive {
			st.Status = "active"
		} else {
			st.Status = "inactive"
		}
	}
	if err := s.dash.UpdateStaff(ctx, st); err != nil {
		return nil, err
	}
	if st.MasterID != nil {
		mp, err := s.dash.GetMasterProfile(ctx, *st.MasterID)
		if err != nil {
			return nil, err
		}
		if mp != nil && mp.UserID == nil {
			if trimSpace(in.DisplayName) != "" {
				mp.DisplayName = trimSpace(in.DisplayName)
			}
			if in.Bio != nil {
				if trimSpace(*in.Bio) == "" {
					mp.Bio = nil
				} else {
					b := trimSpace(*in.Bio)
					mp.Bio = &b
				}
			}
			if in.Specializations != nil {
				mp.Specializations = pq.StringArray(in.Specializations)
			}
			if in.YearsExperience != nil {
				mp.YearsExperience = in.YearsExperience
			}
			if in.Phone != nil {
				newPhone := normalizePhoneE164Ptr(in.Phone)
				phoneChanged := false
				if newPhone == nil && mp.PhoneE164 != nil {
					phoneChanged = true
				} else if newPhone != nil && (mp.PhoneE164 == nil || *newPhone != *mp.PhoneE164) {
					phoneChanged = true
				}
				if phoneChanged && newPhone != nil {
					if in.PhoneVerificationProof == nil || *in.PhoneVerificationProof == "" {
						return nil, fmt.Errorf("phone verification proof is required when changing phone")
					}
					proofID, err := uuid.Parse(*in.PhoneVerificationProof)
					if err != nil {
						return nil, fmt.Errorf("invalid phone verification proof")
					}
					if err := s.phoneOTP.ValidateAndConsumeProof(ctx, proofID, *newPhone, salonID); err != nil {
						return nil, fmt.Errorf("phone verification failed: %w", err)
					}
				}
				if newPhone == nil {
					mp.PhoneE164 = nil
				} else {
					mp.PhoneE164 = newPhone
				}
			}
			if err := s.dash.UpdateMasterProfile(ctx, mp); err != nil {
				return nil, err
			}
		}
	}
	if in.ServiceIDs != nil || len(in.ServiceAssignments) > 0 {
		if err := s.applyStaffServiceAssignments(ctx, salonID, staffID, in); err != nil {
			return nil, err
		}
	}
	return st, nil
}

func (s *dashboardService) applyStaffServiceAssignments(ctx context.Context, salonID, salonMasterID uuid.UUID, in StaffInput) error {
	if len(in.ServiceAssignments) > 0 {
		rows := make([]repository.SalonMasterServiceAssignment, 0, len(in.ServiceAssignments))
		for _, a := range in.ServiceAssignments {
			var po *int
			if a.PriceOverrideCents != nil {
				v := int(*a.PriceOverrideCents)
				po = &v
			}
			rows = append(rows, repository.SalonMasterServiceAssignment{
				ServiceID:               a.ServiceID,
				PriceOverrideCents:      po,
				DurationOverrideMinutes: a.DurationOverrideMinutes,
			})
		}
		return s.dash.ReplaceSalonMasterServiceAssignments(ctx, salonID, salonMasterID, rows)
	}
	if len(in.ServiceIDs) > 0 {
		return s.dash.ReplaceStaffServices(ctx, salonID, salonMasterID, dedupeUUIDs(in.ServiceIDs))
	}
	return nil
}

func (s *dashboardService) GetStaff(ctx context.Context, salonID, staffID uuid.UUID) (*model.SalonMaster, []uuid.UUID, error) {
	st, err := s.dash.GetStaff(ctx, salonID, staffID)
	if err != nil {
		return nil, nil, err
	}
	if st == nil {
		return nil, nil, nil
	}
	ids, err := s.dash.ListStaffServiceIDs(ctx, salonID, staffID)
	if err != nil {
		return nil, nil, err
	}
	return st, ids, nil
}

func (s *dashboardService) GetSalonMasterDashboardDetail(ctx context.Context, salonID, salonMasterID uuid.UUID) (*SalonMasterDashboardDetail, error) {
	st, err := s.dash.GetStaff(ctx, salonID, salonMasterID)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, nil
	}
	ids, err := s.dash.ListStaffServiceIDs(ctx, salonID, salonMasterID)
	if err != nil {
		return nil, err
	}
	details, err := s.dash.ListSalonMasterServiceDetails(ctx, salonID, salonMasterID)
	if err != nil {
		return nil, err
	}
	var mpLite *MasterProfileLite
	if st.MasterID != nil {
		mp, err := s.dash.GetMasterProfile(ctx, *st.MasterID)
		if err != nil {
			return nil, err
		}
		mpLite = masterProfileLiteFrom(mp)
	}
	svcOut := make([]SalonMasterServiceOut, 0, len(details))
	for _, row := range details {
		var po *int64
		if row.PriceOverrideCents != nil {
			v := int64(*row.PriceOverrideCents)
			po = &v
		}
		svcOut = append(svcOut, SalonMasterServiceOut{
			ServiceID:               row.ServiceID,
			ServiceName:             row.ServiceName,
			SalonPriceCents:         row.SalonPriceCents,
			SalonDurationMinutes:    row.SalonDurationMinutes,
			PriceOverrideCents:      po,
			DurationOverrideMinutes: row.DurationOverrideMinutes,
		})
	}
	status := st.Status
	if status == "" {
		if st.IsActive {
			status = "active"
		} else {
			status = "inactive"
		}
	}
	return &SalonMasterDashboardDetail{
		ID:                    st.ID,
		SalonID:               st.SalonID,
		DisplayName:           st.DisplayName,
		Color:                 st.Color,
		IsActive:              st.IsActive,
		Status:                status,
		Role:                  st.Role,
		Level:                 st.Level,
		Bio:                   st.Bio,
		Phone:                 st.Phone,
		TelegramUsername:      st.TelegramUsername,
		Email:                 st.Email,
		JoinedAt:              st.JoinedAt,
		DashboardAccess:       st.DashboardAccess,
		TelegramNotifications: st.TelegramNotifications,
		CreatedAt:             st.CreatedAt,
		MasterProfile:         mpLite,
		Services:              svcOut,
		ServiceIds:            ids,
	}, nil
}

func (s *dashboardService) DeleteStaff(ctx context.Context, salonID, staffID uuid.UUID) error {
	return s.dash.SoftDeleteStaff(ctx, salonID, staffID)
}

func (s *dashboardService) ListStaffDashboard(ctx context.Context, salonID uuid.UUID) ([]SalonMasterDashboardListItem, error) {
	staffList, err := s.dash.ListStaff(ctx, salonID)
	if err != nil {
		return nil, err
	}
	details, err := s.dash.ListSalonMasterServiceDetailsForSalon(ctx, salonID)
	if err != nil {
		return nil, err
	}
	byMaster := make(map[uuid.UUID][]repository.SalonMasterServiceDetail)
	for _, d := range details {
		byMaster[d.SalonMasterID] = append(byMaster[d.SalonMasterID], d)
	}
	out := make([]SalonMasterDashboardListItem, 0, len(staffList))
	for _, st := range staffList {
		m, err := s.StaffMetrics(ctx, salonID, st.ID, "month")
		if err != nil {
			return nil, err
		}
		var mpLite *MasterProfileLite
		if st.MasterID != nil {
			mp, err := s.dash.GetMasterProfile(ctx, *st.MasterID)
			if err != nil {
				return nil, err
			}
			mpLite = masterProfileLiteFrom(mp)
		}
		svcOut := make([]SalonMasterServiceOut, 0, len(byMaster[st.ID]))
		for _, row := range byMaster[st.ID] {
			var po *int64
			if row.PriceOverrideCents != nil {
				v := int64(*row.PriceOverrideCents)
				po = &v
			}
			svcOut = append(svcOut, SalonMasterServiceOut{
				ServiceID:               row.ServiceID,
				ServiceName:             row.ServiceName,
				SalonPriceCents:         row.SalonPriceCents,
				SalonDurationMinutes:    row.SalonDurationMinutes,
				PriceOverrideCents:      po,
				DurationOverrideMinutes: row.DurationOverrideMinutes,
			})
		}
		status := st.Status
		if status == "" {
			if st.IsActive {
				status = "active"
			} else {
				status = "inactive"
			}
		}
		out = append(out, SalonMasterDashboardListItem{
			ID:                    st.ID,
			SalonID:               st.SalonID,
			DisplayName:           st.DisplayName,
			Color:                 st.Color,
			IsActive:              st.IsActive,
			Status:                status,
			Role:                  st.Role,
			Level:                 st.Level,
			JoinedAt:              st.JoinedAt,
			DashboardAccess:       st.DashboardAccess,
			TelegramNotifications: st.TelegramNotifications,
			MasterProfile:         mpLite,
			Services:              svcOut,
			LoadPercentWeek:       m.LoadPercent,
			RatingAvg:             m.Rating,
			ReviewCount:           m.ReviewCount,
			CompletedVisits:       m.TotalVisits,
			RevenueMonthCents:     m.RevenueMonthCents,
		})
	}
	return out, nil
}

func (s *dashboardService) LookupMasterByPhone(ctx context.Context, phoneE164 string) (*model.MasterProfile, bool, error) {
	p := strings.TrimSpace(phoneE164)
	if p == "" {
		return nil, false, fmt.Errorf("phone required")
	}
	p = strings.ReplaceAll(p, " ", "")
	p = strings.ReplaceAll(p, "-", "")
	if strings.HasPrefix(p, "8") && len(p) == 11 {
		p = "+7" + p[1:]
	}
	if !phoneDashRe.MatchString(p) {
		return nil, false, fmt.Errorf("invalid phone, use E.164 +7XXXXXXXXXX")
	}
	mp, err := s.dash.GetMasterProfileByPhoneE164(ctx, p)
	if err != nil {
		return nil, false, err
	}
	if mp == nil {
		return nil, false, nil
	}
	return mp, true, nil
}

func (s *dashboardService) CreateMasterInvite(ctx context.Context, salonID, masterProfileID uuid.UUID) (*model.SalonMaster, error) {
	mp, err := s.dash.GetMasterProfile(ctx, masterProfileID)
	if err != nil {
		return nil, err
	}
	if mp == nil {
		return nil, fmt.Errorf("master profile not found")
	}
	st := &model.SalonMaster{
		SalonID:               salonID,
		MasterID:              &masterProfileID,
		DisplayName:           mp.DisplayName,
		IsActive:              false,
		Status:                "pending",
		DashboardAccess:       false,
		TelegramNotifications: true,
	}
	if err := s.dash.CreateStaff(ctx, st); err != nil {
		return nil, err
	}
	return st, nil
}

func (s *dashboardService) ReplaceSalonMasterServices(ctx context.Context, salonID, salonMasterID uuid.UUID, rows []SalonMasterServiceAssignmentInput) error {
	out := make([]repository.SalonMasterServiceAssignment, 0, len(rows))
	for _, a := range rows {
		var po *int
		if a.PriceOverrideCents != nil {
			v := int(*a.PriceOverrideCents)
			po = &v
		}
		out = append(out, repository.SalonMasterServiceAssignment{
			ServiceID:               a.ServiceID,
			PriceOverrideCents:      po,
			DurationOverrideMinutes: a.DurationOverrideMinutes,
		})
	}
	return s.dash.ReplaceSalonMasterServiceAssignments(ctx, salonID, salonMasterID, out)
}
