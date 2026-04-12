package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// DashboardController handles /api/v1/dashboard/* (auth required).
type DashboardController struct {
	svc service.DashboardService
	log *zap.Logger
}

// NewDashboardController constructs DashboardController.
func NewDashboardController(svc service.DashboardService, log *zap.Logger) *DashboardController {
	return &DashboardController{svc: svc, log: log}
}

// DashboardRoutes dispatches under /api/v1/dashboard/ (caller strips prefix or full path).
func (h *DashboardController) DashboardRoutes(w http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	mem, err := h.svc.Membership(r.Context(), uid)
	if err != nil {
		h.log.Error("dashboard membership", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if mem == nil {
		jsonError(w, "no salon access", http.StatusForbidden)
		return
	}
	salonID := mem.SalonID

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/dashboard")
	path = strings.Trim(path, "/")
	parts := splitPath(path)

	if len(parts) == 0 {
		http.NotFound(w, r)
		return
	}

	switch parts[0] {
	case "appointments":
		h.handleAppointments(w, r, salonID, parts)
	case "services":
		h.handleServices(w, r, salonID, parts)
	case "staff":
		h.handleStaff(w, r, salonID, parts)
	case "schedule":
		if len(parts) == 1 {
			if r.Method == http.MethodGet {
				h.getSchedule(w, r, salonID)
				return
			}
			if r.Method == http.MethodPut {
				h.putSchedule(w, r, salonID)
				return
			}
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	case "stats":
		if len(parts) == 1 && r.Method == http.MethodGet {
			h.getStats(w, r, salonID)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	case "salon":
		if len(parts) == 2 && parts[1] == "profile" {
			if r.Method == http.MethodGet {
				h.getSalonProfile(w, r, salonID)
				return
			}
			if r.Method == http.MethodPut {
				h.putSalonProfile(w, r, salonID)
				return
			}
		}
		http.NotFound(w, r)
	default:
		http.NotFound(w, r)
	}
}

func splitPath(p string) []string {
	if p == "" {
		return nil
	}
	var out []string
	for _, s := range strings.Split(p, "/") {
		if s != "" {
			out = append(out, s)
		}
	}
	return out
}

func (h *DashboardController) handleAppointments(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	if len(parts) == 1 {
		if r.Method == http.MethodGet {
			h.listAppointments(w, r, salonID)
			return
		}
		if r.Method == http.MethodPost {
			h.createAppointment(w, r, salonID)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		jsonError(w, "invalid appointment id", http.StatusBadRequest)
		return
	}
	if len(parts) == 3 && parts[2] == "status" && r.Method == http.MethodPatch {
		h.patchAppointmentStatus(w, r, salonID, id)
		return
	}
	if len(parts) == 2 && r.Method == http.MethodPut {
		h.putAppointment(w, r, salonID, id)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (h *DashboardController) listAppointments(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	q := r.URL.Query()
	f := repository.AppointmentListFilter{SalonID: salonID}
	if v := q.Get("from"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err == nil {
			utc := t.UTC()
			f.From = &utc
		}
	}
	if v := q.Get("to"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err == nil {
			end := t.Add(24 * time.Hour).UTC()
			f.To = &end
		}
	}
	f.Status = q.Get("status")
	if v := q.Get("staff_id"); v != "" {
		if sid, err := uuid.Parse(v); err == nil {
			f.StaffID = &sid
		}
	}
	if v := q.Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			f.Page = n
		}
	}
	if v := q.Get("page_size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			f.PageSize = n
		}
	}
	rows, total, err := h.svc.ListAppointments(r.Context(), salonID, f)
	if err != nil {
		h.log.Error("list appointments", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	type rowDTO struct {
		ID             uuid.UUID  `json:"id"`
		StartsAt       time.Time  `json:"startsAt"`
		EndsAt         time.Time  `json:"endsAt"`
		Status         string     `json:"status"`
		ServiceName    string     `json:"serviceName"`
		StaffName      *string    `json:"staffName,omitempty"`
		ClientLabel    string     `json:"clientLabel"`
		ClientPhone    *string    `json:"clientPhone,omitempty"`
		GuestName      *string    `json:"guestName,omitempty"`
		GuestPhone     *string    `json:"guestPhone,omitempty"`
		ClientUserID   *uuid.UUID `json:"clientUserId,omitempty"`
		ServiceID      uuid.UUID  `json:"serviceId"`
		StaffID        *uuid.UUID `json:"staffId,omitempty"`
		ClientNote     *string    `json:"clientNote,omitempty"`
	}
	out := make([]rowDTO, len(rows))
	for i, row := range rows {
		a := row.Appointment
		out[i] = rowDTO{
			ID: a.ID, StartsAt: a.StartsAt, EndsAt: a.EndsAt, Status: a.Status,
			ServiceName: row.ServiceName, StaffName: row.StaffName, ClientLabel: row.ClientLabel,
			ClientPhone: row.ClientPhone, GuestName: a.GuestName, GuestPhone: a.GuestPhoneE164,
			ClientUserID: a.ClientUserID, ServiceID: a.ServiceID, StaffID: a.StaffID, ClientNote: a.ClientNote,
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"items": out, "total": total})
}

type createApptBody struct {
	ServiceID      uuid.UUID  `json:"serviceId"`
	StaffID        *uuid.UUID `json:"staffId"`
	StartsAt       string     `json:"startsAt"`
	GuestName      string     `json:"guestName"`
	GuestPhone     string     `json:"guestPhone"`
	ClientNote     string     `json:"clientNote,omitempty"`
	ClientUserID   *uuid.UUID `json:"clientUserId,omitempty"`
}

func (h *DashboardController) createAppointment(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body createApptBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	st, err := time.Parse(time.RFC3339, body.StartsAt)
	if err != nil {
		jsonError(w, "startsAt must be RFC3339", http.StatusBadRequest)
		return
	}
	ap, err := h.svc.CreateManualAppointment(r.Context(), salonID, service.ManualAppointmentInput{
		ServiceID:      body.ServiceID,
		StaffID:        body.StaffID,
		StartsAt:       st,
		GuestName:      body.GuestName,
		GuestPhone:     body.GuestPhone,
		ClientNote:     body.ClientNote,
		ClientUserID:   body.ClientUserID,
	})
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	type apOut struct {
		ID             uuid.UUID  `json:"id"`
		SalonID        uuid.UUID  `json:"salonId"`
		ServiceID      uuid.UUID  `json:"serviceId"`
		StaffID        *uuid.UUID `json:"staffId,omitempty"`
		StartsAt       time.Time  `json:"startsAt"`
		EndsAt         time.Time  `json:"endsAt"`
		Status         string     `json:"status"`
		GuestName      *string    `json:"guestName,omitempty"`
		GuestPhoneE164 *string    `json:"guestPhone,omitempty"`
		ClientUserID   *uuid.UUID `json:"clientUserId,omitempty"`
		ClientNote     *string    `json:"clientNote,omitempty"`
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(apOut{
		ID: ap.ID, SalonID: ap.SalonID, ServiceID: ap.ServiceID, StaffID: ap.StaffID,
		StartsAt: ap.StartsAt, EndsAt: ap.EndsAt, Status: ap.Status,
		GuestName: ap.GuestName, GuestPhoneE164: ap.GuestPhoneE164, ClientUserID: ap.ClientUserID, ClientNote: ap.ClientNote,
	})
}

type patchStatusBody struct {
	Status string `json:"status"`
}

func (h *DashboardController) patchAppointmentStatus(w http.ResponseWriter, r *http.Request, salonID, id uuid.UUID) {
	var body patchStatusBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Status == "" {
		jsonError(w, "status required", http.StatusBadRequest)
		return
	}
	err := h.svc.UpdateAppointmentStatus(r.Context(), salonID, id, body.Status)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type putApptBody struct {
	StartsAt   *string    `json:"startsAt"`
	EndsAt     *string    `json:"endsAt"`
	StaffID    *uuid.UUID `json:"staffId"`
	ServiceID  *uuid.UUID `json:"serviceId"`
	ClientNote *string    `json:"clientNote"`
}

func (h *DashboardController) putAppointment(w http.ResponseWriter, r *http.Request, salonID, id uuid.UUID) {
	var body putApptBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	in := service.UpdateAppointmentInput{AppointmentID: id}
	if body.StartsAt != nil {
		t, err := time.Parse(time.RFC3339, *body.StartsAt)
		if err != nil {
			jsonError(w, "startsAt RFC3339", http.StatusBadRequest)
			return
		}
		in.StartsAt = &t
	}
	if body.EndsAt != nil {
		t, err := time.Parse(time.RFC3339, *body.EndsAt)
		if err != nil {
			jsonError(w, "endsAt RFC3339", http.StatusBadRequest)
			return
		}
		in.EndsAt = &t
	}
	in.StaffID = body.StaffID
	in.ServiceID = body.ServiceID
	in.ClientNote = body.ClientNote
	if err := h.svc.UpdateAppointment(r.Context(), salonID, in); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DashboardController) handleServices(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	if len(parts) == 1 {
		if r.Method == http.MethodGet {
			list, err := h.svc.ListServices(r.Context(), salonID)
			if err != nil {
				h.log.Error("list services", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			type svcRow struct {
				ID              uuid.UUID `json:"id"`
				SalonID         uuid.UUID `json:"salonId"`
				Name            string    `json:"name"`
				DurationMinutes int       `json:"durationMinutes"`
				PriceCents      *int64    `json:"priceCents"`
				IsActive        bool      `json:"isActive"`
				SortOrder       int       `json:"sortOrder"`
			}
			out := make([]svcRow, len(list))
			for i, s := range list {
				out[i] = svcRow{ID: s.ID, SalonID: s.SalonID, Name: s.Name, DurationMinutes: s.DurationMinutes, PriceCents: s.PriceCents, IsActive: s.IsActive, SortOrder: s.SortOrder}
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if r.Method == http.MethodPost {
			var in service.ServiceInput
			if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			svc, err := h.svc.CreateService(r.Context(), salonID, in)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			type svcRow struct {
				ID              uuid.UUID `json:"id"`
				SalonID         uuid.UUID `json:"salonId"`
				Name            string    `json:"name"`
				DurationMinutes int       `json:"durationMinutes"`
				PriceCents      *int64    `json:"priceCents"`
				IsActive        bool      `json:"isActive"`
				SortOrder       int       `json:"sortOrder"`
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(svcRow{ID: svc.ID, SalonID: svc.SalonID, Name: svc.Name, DurationMinutes: svc.DurationMinutes, PriceCents: svc.PriceCents, IsActive: svc.IsActive, SortOrder: svc.SortOrder})
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	if r.Method == http.MethodPut {
		var in service.ServiceInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		svc, err := h.svc.UpdateService(r.Context(), salonID, id, in)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		type svcRow struct {
			ID              uuid.UUID `json:"id"`
			SalonID         uuid.UUID `json:"salonId"`
			Name            string    `json:"name"`
			DurationMinutes int       `json:"durationMinutes"`
			PriceCents      *int64    `json:"priceCents"`
			IsActive        bool      `json:"isActive"`
			SortOrder       int       `json:"sortOrder"`
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(svcRow{ID: svc.ID, SalonID: svc.SalonID, Name: svc.Name, DurationMinutes: svc.DurationMinutes, PriceCents: svc.PriceCents, IsActive: svc.IsActive, SortOrder: svc.SortOrder})
		return
	}
	if r.Method == http.MethodDelete {
		if err := h.svc.DeleteService(r.Context(), salonID, id); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			h.log.Error("delete service", zap.Error(err))
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (h *DashboardController) handleStaff(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	if len(parts) == 1 {
		if r.Method == http.MethodGet {
			list, err := h.svc.ListStaff(r.Context(), salonID)
			if err != nil {
				h.log.Error("list staff", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			type staffRow struct {
				ID          uuid.UUID `json:"id"`
				SalonID     uuid.UUID `json:"salonId"`
				DisplayName string    `json:"displayName"`
				IsActive    bool      `json:"isActive"`
				CreatedAt   time.Time `json:"createdAt"`
			}
			out := make([]staffRow, len(list))
			for i, s := range list {
				out[i] = staffRow{ID: s.ID, SalonID: s.SalonID, DisplayName: s.DisplayName, IsActive: s.IsActive, CreatedAt: s.CreatedAt}
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if r.Method == http.MethodPost {
			var body struct {
				DisplayName string `json:"displayName"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			st, err := h.svc.CreateStaff(r.Context(), salonID, body.DisplayName)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			type staffRow struct {
				ID          uuid.UUID `json:"id"`
				SalonID     uuid.UUID `json:"salonId"`
				DisplayName string    `json:"displayName"`
				IsActive    bool      `json:"isActive"`
				CreatedAt   time.Time `json:"createdAt"`
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(staffRow{ID: st.ID, SalonID: st.SalonID, DisplayName: st.DisplayName, IsActive: st.IsActive, CreatedAt: st.CreatedAt})
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		jsonError(w, "invalid id", http.StatusBadRequest)
		return
	}
	if len(parts) == 3 && parts[2] == "schedule" {
		if r.Method == http.MethodGet {
			rows, err := h.svc.GetStaffSchedule(r.Context(), salonID, id)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			type row struct {
				ID        uuid.UUID `json:"id"`
				StaffID   uuid.UUID `json:"staffId"`
				DayOfWeek int16     `json:"dayOfWeek"`
				OpensAt   string    `json:"opensAt"`
				ClosesAt  string    `json:"closesAt"`
				IsDayOff  bool      `json:"isDayOff"`
			}
			out := make([]row, len(rows))
			for i, wh := range rows {
				out[i] = row{ID: wh.ID, StaffID: wh.StaffID, DayOfWeek: wh.DayOfWeek, OpensAt: wh.OpensAt, ClosesAt: wh.ClosesAt, IsDayOff: wh.IsDayOff}
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if r.Method == http.MethodPut {
			var rows []service.StaffWorkingHourInput
			if err := json.NewDecoder(r.Body).Decode(&rows); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			if err := h.svc.PutStaffSchedule(r.Context(), salonID, id, rows); err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if len(parts) == 2 && r.Method == http.MethodPut {
		var body struct {
			DisplayName string `json:"displayName"`
			IsActive    bool   `json:"isActive"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		st, err := h.svc.UpdateStaff(r.Context(), salonID, id, body.DisplayName, body.IsActive)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		type staffRow struct {
			ID          uuid.UUID `json:"id"`
			SalonID     uuid.UUID `json:"salonId"`
			DisplayName string    `json:"displayName"`
			IsActive    bool      `json:"isActive"`
			CreatedAt   time.Time `json:"createdAt"`
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(staffRow{ID: st.ID, SalonID: st.SalonID, DisplayName: st.DisplayName, IsActive: st.IsActive, CreatedAt: st.CreatedAt})
		return
	}
	if len(parts) == 2 && r.Method == http.MethodDelete {
		if err := h.svc.DeleteStaff(r.Context(), salonID, id); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			jsonError(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (h *DashboardController) getSchedule(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	rows, err := h.svc.GetSchedule(r.Context(), salonID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	type row struct {
		ID        uuid.UUID  `json:"id"`
		SalonID   uuid.UUID  `json:"salonId"`
		DayOfWeek int16      `json:"dayOfWeek"`
		OpensAt   string     `json:"opensAt"`
		ClosesAt  string     `json:"closesAt"`
		IsClosed  bool       `json:"isClosed"`
		ValidFrom *time.Time `json:"validFrom,omitempty"`
		ValidTo   *time.Time `json:"validTo,omitempty"`
	}
	out := make([]row, len(rows))
	for i, wh := range rows {
		out[i] = row{ID: wh.ID, SalonID: wh.SalonID, DayOfWeek: wh.DayOfWeek, OpensAt: wh.OpensAt, ClosesAt: wh.ClosesAt, IsClosed: wh.IsClosed, ValidFrom: wh.ValidFrom, ValidTo: wh.ValidTo}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func (h *DashboardController) putSchedule(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var rows []service.WorkingHourInput
	if err := json.NewDecoder(r.Body).Decode(&rows); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	if err := h.svc.PutSchedule(r.Context(), salonID, rows); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DashboardController) getStats(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "week"
	}
	st, err := h.svc.Stats(r.Context(), salonID, period)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(st)
}

func (h *DashboardController) getSalonProfile(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	s, err := h.svc.GetSalonProfile(r.Context(), salonID)
	if err != nil || s == nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	type out struct {
		ID                     uuid.UUID `json:"id"`
		NameOverride           *string   `json:"nameOverride"`
		Description            *string   `json:"description"`
		PhonePublic            *string   `json:"phonePublic"`
		CategoryID             *string   `json:"categoryId"`
		BusinessType           *string   `json:"businessType"`
		OnlineBookingEnabled   bool      `json:"onlineBookingEnabled"`
		AddressOverride        *string   `json:"addressOverride"`
		Address                *string   `json:"address"`
		District               *string   `json:"district"`
		Lat                    *float64  `json:"lat"`
		Lng                    *float64  `json:"lng"`
		PhotoURL               *string   `json:"photoUrl"`
		Timezone               string    `json:"timezone"`
		CachedRating           *float64  `json:"cachedRating"`
		CachedReviewCount      *int      `json:"cachedReviewCount"`
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out{
		ID: s.ID, NameOverride: s.NameOverride, Description: s.Description, PhonePublic: s.PhonePublic,
		CategoryID: s.CategoryID, BusinessType: s.BusinessType, OnlineBookingEnabled: s.OnlineBookingEnabled,
		AddressOverride: s.AddressOverride, Address: s.Address, District: s.District, Lat: s.Lat, Lng: s.Lng,
		PhotoURL: s.PhotoURL, Timezone: s.Timezone, CachedRating: s.CachedRating, CachedReviewCount: s.CachedReviewCount,
	})
}

func (h *DashboardController) putSalonProfile(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var in service.SalonProfileInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	s, err := h.svc.PutSalonProfile(r.Context(), salonID, in)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	type out struct {
		ID                   uuid.UUID `json:"id"`
		NameOverride         *string   `json:"nameOverride"`
		Description          *string   `json:"description"`
		PhonePublic          *string   `json:"phonePublic"`
		CategoryID           *string   `json:"categoryId"`
		BusinessType         *string   `json:"businessType"`
		OnlineBookingEnabled bool      `json:"onlineBookingEnabled"`
		AddressOverride      *string   `json:"addressOverride"`
		Address              *string   `json:"address"`
		District             *string   `json:"district"`
		Lat                  *float64  `json:"lat"`
		Lng                  *float64  `json:"lng"`
		PhotoURL             *string   `json:"photoUrl"`
		Timezone             string    `json:"timezone"`
		CachedRating         *float64  `json:"cachedRating"`
		CachedReviewCount    *int      `json:"cachedReviewCount"`
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out{
		ID: s.ID, NameOverride: s.NameOverride, Description: s.Description, PhonePublic: s.PhonePublic,
		CategoryID: s.CategoryID, BusinessType: s.BusinessType, OnlineBookingEnabled: s.OnlineBookingEnabled,
		AddressOverride: s.AddressOverride, Address: s.Address, District: s.District, Lat: s.Lat, Lng: s.Lng,
		PhotoURL: s.PhotoURL, Timezone: s.Timezone, CachedRating: s.CachedRating, CachedReviewCount: s.CachedReviewCount,
	})
}
