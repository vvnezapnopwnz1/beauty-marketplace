package controller

import (
	"encoding/json"
	"errors"
	"io"
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
	svc     service.DashboardService
	booking service.BookingService
	clients *SalonClientController
	log     *zap.Logger
}

// NewDashboardController constructs DashboardController.
func NewDashboardController(svc service.DashboardService, booking service.BookingService, clients *SalonClientController, log *zap.Logger) *DashboardController {
	return &DashboardController{svc: svc, booking: booking, clients: clients, log: log}
}

// resolveSalonMembership validates auth context and salon membership. Writes JSON errors on failure.
func (h *DashboardController) resolveSalonMembership(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return uuid.Nil, false
	}
	mem, err := h.svc.Membership(r.Context(), uid)
	if err != nil {
		h.log.Error("dashboard membership", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return uuid.Nil, false
	}
	if mem == nil {
		jsonError(w, "no salon access", http.StatusForbidden)
		return uuid.Nil, false
	}
	return mem.SalonID, true
}

// PostDashboardClientCreate handles POST /api/v1/dashboard/clients (explicit mux route; see server wiring).
func (h *DashboardController) PostDashboardClientCreate(w http.ResponseWriter, r *http.Request) {
	salonID, ok := h.resolveSalonMembership(w, r)
	if !ok {
		return
	}
	h.clients.HandleClients(w, r, salonID, []string{"clients"})
}

// DeleteDashboardClient handles DELETE /api/v1/dashboard/clients/{id} (explicit mux route; see server wiring).
func (h *DashboardController) DeleteDashboardClient(w http.ResponseWriter, r *http.Request) {
	salonID, ok := h.resolveSalonMembership(w, r)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		jsonError(w, "invalid client id", http.StatusBadRequest)
		return
	}
	h.clients.HandleClients(w, r, salonID, []string{"clients", id})
}

// DashboardRoutes dispatches under /api/v1/dashboard/ (caller strips prefix or full path).
func (h *DashboardController) DashboardRoutes(w http.ResponseWriter, r *http.Request) {
	salonID, ok := h.resolveSalonMembership(w, r)
	if !ok {
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/dashboard")
	path = strings.Trim(path, "/")
	parts := splitPath(path)

	if len(parts) == 0 {
		http.NotFound(w, r)
		return
	}

	switch parts[0] {
	case "clients":
		h.clients.HandleClients(w, r, salonID, parts)
	case "appointments":
		h.handleAppointments(w, r, salonID, parts)
	case "service-categories":
		if len(parts) == 1 && r.Method == http.MethodGet {
			full := r.URL.Query().Get("full") == "1" || strings.EqualFold(r.URL.Query().Get("full"), "true")
			out, err := h.svc.ListServiceCategories(r.Context(), salonID, full)
			if err != nil {
				h.log.Error("service categories", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	case "services":
		h.handleServices(w, r, salonID, parts)
	case "staff", "salon-masters":
		h.handleSalonMasters(w, r, salonID, parts)
	case "masters":
		if len(parts) >= 2 && parts[1] == "lookup" && r.Method == http.MethodGet {
			h.lookupMasterByPhone(w, r)
			return
		}
		http.NotFound(w, r)
	case "master-invites":
		if len(parts) == 1 && r.Method == http.MethodPost {
			h.createMasterInvite(w, r, salonID)
			return
		}
		http.NotFound(w, r)
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
	case "slots":
		if len(parts) == 1 && r.Method == http.MethodGet {
			h.listDashboardSlots(w, r, salonID)
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
	if len(parts) == 2 {
		if r.Method == http.MethodGet {
			h.getAppointment(w, r, salonID, id)
			return
		}
		if r.Method == http.MethodPut {
			h.putAppointment(w, r, salonID, id)
			return
		}
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (h *DashboardController) getAppointment(w http.ResponseWriter, r *http.Request, salonID, id uuid.UUID) {
	out, err := h.svc.GetAppointment(r.Context(), salonID, id)
	if err != nil {
		h.log.Error("get appointment", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if out == nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
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
	if v := q.Get("status"); v != "" {
		for _, s := range strings.Split(v, ",") {
			if s = strings.TrimSpace(s); s != "" {
				f.Statuses = append(f.Statuses, s)
			}
		}
	}
	f.SortBy = q.Get("sort_by")
	f.SortDir = q.Get("sort_dir")
	f.Search = q.Get("search")
	if v := q.Get("salon_master_id"); v != "" {
		if sid, err := uuid.Parse(v); err == nil {
			f.StaffID = &sid
		}
	}
	if f.StaffID == nil {
		if v := q.Get("staff_id"); v != "" {
			if sid, err := uuid.Parse(v); err == nil {
				f.StaffID = &sid
			}
		}
	}
	if v := q.Get("service_id"); v != "" {
		if svcID, err := uuid.Parse(v); err == nil {
			f.ServiceID = &svcID
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
		ID            uuid.UUID   `json:"id"`
		StartsAt      time.Time   `json:"startsAt"`
		EndsAt        time.Time   `json:"endsAt"`
		Status        string      `json:"status"`
		ServiceName   string      `json:"serviceName"` //nolint:tagliatelle // legacy frontend compatibility
		ServiceNames  []string    `json:"serviceNames"`
		StaffName     *string     `json:"staffName,omitempty"`
		ClientLabel   string      `json:"clientLabel"`
		ClientPhone   *string     `json:"clientPhone,omitempty"`
		GuestName     *string     `json:"guestName,omitempty"`
		GuestPhone    *string     `json:"guestPhone,omitempty"`
		ClientUserID  *uuid.UUID  `json:"clientUserId,omitempty"`
		ServiceID     uuid.UUID   `json:"serviceId"` //nolint:tagliatelle // legacy frontend compatibility
		ServiceIDs    []uuid.UUID `json:"serviceIds"`
		SalonMasterID *uuid.UUID  `json:"salonMasterId,omitempty"`
		ClientNote    *string     `json:"clientNote,omitempty"`
	}
	out := make([]rowDTO, len(rows))
	for i, row := range rows {
		a := row.Appointment
		out[i] = rowDTO{
			ID: a.ID, StartsAt: a.StartsAt, EndsAt: a.EndsAt, Status: a.Status,
			ServiceName: row.ServiceName, ServiceNames: row.ServiceNames, StaffName: row.StaffName, ClientLabel: row.ClientLabel,
			ClientPhone: row.ClientPhone, GuestName: a.GuestName, GuestPhone: a.GuestPhoneE164,
			ClientUserID: a.ClientUserID, ServiceID: a.ServiceID, ServiceIDs: row.ServiceIDs, SalonMasterID: a.SalonMasterID, ClientNote: a.ClientNote,
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"items": out, "total": total})
}

type createApptBody struct {
	ServiceIDs    []uuid.UUID `json:"serviceIds"`
	SalonMasterID *uuid.UUID  `json:"salonMasterId"`
	StaffID       *uuid.UUID  `json:"staffId"` // deprecated; prefer salonMasterId
	StartsAt      string      `json:"startsAt"`
	GuestName     string      `json:"guestName"`
	GuestPhone    string      `json:"guestPhone"`
	ClientNote    string      `json:"clientNote,omitempty"`
	ClientUserID  *uuid.UUID  `json:"clientUserId,omitempty"`
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
	staffRef := body.SalonMasterID
	if staffRef == nil {
		staffRef = body.StaffID
	}
	ap, err := h.svc.CreateManualAppointment(r.Context(), salonID, service.ManualAppointmentInput{
		ServiceIDs:   body.ServiceIDs,
		StaffID:      staffRef,
		StartsAt:     st,
		GuestName:    body.GuestName,
		GuestPhone:   body.GuestPhone,
		ClientNote:   body.ClientNote,
		ClientUserID: body.ClientUserID,
	})
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	type apOut struct {
		ID             uuid.UUID  `json:"id"`
		SalonID        uuid.UUID  `json:"salonId"`
		ServiceID      uuid.UUID  `json:"serviceId"`
		SalonMasterID  *uuid.UUID `json:"salonMasterId,omitempty"`
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
		ID: ap.ID, SalonID: ap.SalonID, ServiceID: ap.ServiceID, SalonMasterID: ap.SalonMasterID,
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
	StartsAt           *string     `json:"startsAt"`
	EndsAt             *string     `json:"endsAt"`
	SalonMasterID      *uuid.UUID  `json:"salonMasterId"`
	StaffID            *uuid.UUID  `json:"staffId"` // deprecated
	ClearSalonMasterID *bool       `json:"clearSalonMasterId"`
	ClearStaffID       *bool       `json:"clearStaffId"` // deprecated
	ServiceIDs         []uuid.UUID `json:"serviceIds"`
	ClientNote         *string     `json:"clientNote"`
	GuestName          *string     `json:"guestName"`
	GuestPhone         *string     `json:"guestPhone"`
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
	clear := (body.ClearSalonMasterID != nil && *body.ClearSalonMasterID) ||
		(body.ClearStaffID != nil && *body.ClearStaffID)
	if clear {
		in.ClearStaffID = true
	} else {
		if body.SalonMasterID != nil {
			in.StaffID = body.SalonMasterID
		} else {
			in.StaffID = body.StaffID
		}
	}
	in.ServiceIDs = body.ServiceIDs
	in.ClientNote = body.ClientNote
	in.GuestName = body.GuestName
	in.GuestPhone = body.GuestPhone
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
			namesMap, err := h.svc.ServiceStaffNamesMap(r.Context(), salonID)
			if err != nil {
				h.log.Error("service staff names", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			type svcRow struct {
				ID              uuid.UUID `json:"id"`
				SalonID         uuid.UUID `json:"salonId"`
				Name            string    `json:"name"`
				Category        *string   `json:"category"`
				CategorySlug    *string   `json:"categorySlug"`
				Description     *string   `json:"description"`
				DurationMinutes int       `json:"durationMinutes"`
				PriceCents      *int64    `json:"priceCents"`
				IsActive        bool      `json:"isActive"`
				SortOrder       int       `json:"sortOrder"`
				StaffNames      []string  `json:"staffNames"`
			}
			out := make([]svcRow, len(list))
			for i, s := range list {
				sn := namesMap[s.ID]
				if sn == nil {
					sn = []string{}
				}
				out[i] = svcRow{
					ID: s.ID, SalonID: s.SalonID, Name: s.Name, Category: s.Category, CategorySlug: s.CategorySlug, Description: s.Description,
					DurationMinutes: s.DurationMinutes, PriceCents: s.PriceCents, IsActive: s.IsActive, SortOrder: s.SortOrder,
					StaffNames: sn,
				}
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
			namesMap, _ := h.svc.ServiceStaffNamesMap(r.Context(), salonID)
			sn := namesMap[svc.ID]
			if sn == nil {
				sn = []string{}
			}
			type svcRow struct {
				ID              uuid.UUID `json:"id"`
				SalonID         uuid.UUID `json:"salonId"`
				Name            string    `json:"name"`
				Category        *string   `json:"category"`
				CategorySlug    *string   `json:"categorySlug"`
				Description     *string   `json:"description"`
				DurationMinutes int       `json:"durationMinutes"`
				PriceCents      *int64    `json:"priceCents"`
				IsActive        bool      `json:"isActive"`
				SortOrder       int       `json:"sortOrder"`
				StaffNames      []string  `json:"staffNames"`
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(svcRow{
				ID: svc.ID, SalonID: svc.SalonID, Name: svc.Name, Category: svc.Category, CategorySlug: svc.CategorySlug, Description: svc.Description,
				DurationMinutes: svc.DurationMinutes, PriceCents: svc.PriceCents, IsActive: svc.IsActive, SortOrder: svc.SortOrder,
				StaffNames: sn,
			})
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
		namesMap, _ := h.svc.ServiceStaffNamesMap(r.Context(), salonID)
		sn := namesMap[svc.ID]
		if sn == nil {
			sn = []string{}
		}
		type svcRow struct {
			ID              uuid.UUID `json:"id"`
			SalonID         uuid.UUID `json:"salonId"`
			Name            string    `json:"name"`
			Category        *string   `json:"category"`
			CategorySlug    *string   `json:"categorySlug"`
			Description     *string   `json:"description"`
			DurationMinutes int       `json:"durationMinutes"`
			PriceCents      *int64    `json:"priceCents"`
			IsActive        bool      `json:"isActive"`
			SortOrder       int       `json:"sortOrder"`
			StaffNames      []string  `json:"staffNames"`
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(svcRow{
			ID: svc.ID, SalonID: svc.SalonID, Name: svc.Name, Category: svc.Category, CategorySlug: svc.CategorySlug, Description: svc.Description,
			DurationMinutes: svc.DurationMinutes, PriceCents: svc.PriceCents, IsActive: svc.IsActive, SortOrder: svc.SortOrder,
			StaffNames: sn,
		})
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

func (h *DashboardController) handleSalonMasters(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	if len(parts) == 1 {
		if r.Method == http.MethodGet {
			list, err := h.svc.ListStaffDashboard(r.Context(), salonID)
			if err != nil {
				h.log.Error("list staff dashboard", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(list)
			return
		}
		if r.Method == http.MethodPost {
			var in service.StaffInput
			if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			st, err := h.svc.CreateStaff(r.Context(), salonID, in)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			det, err := h.svc.GetSalonMasterDashboardDetail(r.Context(), salonID, st.ID)
			if err != nil || det == nil {
				h.log.Error("get salon master after create", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(det)
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
	if len(parts) == 3 && parts[2] == "services" && r.Method == http.MethodPut {
		var rows []service.SalonMasterServiceAssignmentInput
		if err := json.NewDecoder(r.Body).Decode(&rows); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		if err := h.svc.ReplaceSalonMasterServices(r.Context(), salonID, id, rows); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		det, err := h.svc.GetSalonMasterDashboardDetail(r.Context(), salonID, id)
		if err != nil || det == nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(det)
		return
	}
	if len(parts) == 3 && parts[2] == "schedule" {
		if r.Method == http.MethodGet {
			bundle, err := h.svc.GetStaffScheduleBundle(r.Context(), salonID, id)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(staffScheduleBundleJSON(bundle))
			return
		}
		if r.Method == http.MethodPut {
			raw, err := io.ReadAll(r.Body)
			if err != nil {
				jsonError(w, "read body", http.StatusBadRequest)
				return
			}
			if len(raw) > 0 && raw[0] == '[' {
				var rows []service.StaffWorkingHourInput
				if err := json.Unmarshal(raw, &rows); err != nil {
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
			var payload service.StaffSchedulePayload
			if err := json.Unmarshal(raw, &payload); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			if err := h.svc.PutStaffScheduleBundle(r.Context(), salonID, id, payload); err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if len(parts) == 3 && parts[2] == "appointments" && r.Method == http.MethodGet {
		q := r.URL.Query()
		f := repository.AppointmentListFilter{SalonID: salonID, StaffID: &id, Page: 1, PageSize: 20}
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
		rows, total, err := h.svc.ListAppointments(r.Context(), salonID, f)
		if err != nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		type rowDTO struct {
			ID            uuid.UUID   `json:"id"`
			StartsAt      time.Time   `json:"startsAt"`
			EndsAt        time.Time   `json:"endsAt"`
			Status        string      `json:"status"`
			ServiceName   string      `json:"serviceName"` //nolint:tagliatelle // legacy frontend compatibility
			ServiceNames  []string    `json:"serviceNames"`
			StaffName     *string     `json:"staffName,omitempty"`
			ClientLabel   string      `json:"clientLabel"`
			ClientPhone   *string     `json:"clientPhone,omitempty"`
			ServiceID     uuid.UUID   `json:"serviceId"` //nolint:tagliatelle // legacy frontend compatibility
			ServiceIDs    []uuid.UUID `json:"serviceIds"`
			SalonMasterID *uuid.UUID  `json:"salonMasterId,omitempty"`
		}
		out := make([]rowDTO, len(rows))
		for i, x := range rows {
			out[i] = rowDTO{
				ID: x.Appointment.ID, StartsAt: x.Appointment.StartsAt, EndsAt: x.Appointment.EndsAt,
				Status: x.Appointment.Status, ServiceName: x.ServiceName, ServiceNames: x.ServiceNames, StaffName: x.StaffName,
				ClientLabel: x.ClientLabel, ClientPhone: x.ClientPhone, ServiceID: x.Appointment.ServiceID, ServiceIDs: x.ServiceIDs,
				SalonMasterID: x.Appointment.SalonMasterID,
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"items": out, "total": total})
		return
	}
	if len(parts) == 3 && parts[2] == "metrics" && r.Method == http.MethodGet {
		period := r.URL.Query().Get("period")
		if period == "" {
			period = "month"
		}
		met, err := h.svc.StaffMetrics(r.Context(), salonID, id, period)
		if err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(met)
		return
	}
	if len(parts) == 2 && r.Method == http.MethodGet {
		det, err := h.svc.GetSalonMasterDashboardDetail(r.Context(), salonID, id)
		if err != nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		if det == nil {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(det)
		return
	}
	if len(parts) == 2 && r.Method == http.MethodPut {
		var in service.StaffInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		_, err := h.svc.UpdateStaff(r.Context(), salonID, id, in)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				jsonError(w, "not found", http.StatusNotFound)
				return
			}
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		det, err := h.svc.GetSalonMasterDashboardDetail(r.Context(), salonID, id)
		if err != nil || det == nil {
			jsonError(w, "internal error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(det)
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
	bundle, err := h.svc.GetSalonScheduleBundle(r.Context(), salonID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	type whRow struct {
		ID            uuid.UUID  `json:"id"`
		SalonID       uuid.UUID  `json:"salonId"`
		DayOfWeek     int16      `json:"dayOfWeek"`
		OpensAt       string     `json:"opensAt"`
		ClosesAt      string     `json:"closesAt"`
		IsClosed      bool       `json:"isClosed"`
		BreakStartsAt *string    `json:"breakStartsAt,omitempty"`
		BreakEndsAt   *string    `json:"breakEndsAt,omitempty"`
		ValidFrom     *time.Time `json:"validFrom,omitempty"`
		ValidTo       *time.Time `json:"validTo,omitempty"`
	}
	wh := make([]whRow, len(bundle.WorkingHours))
	for i, row := range bundle.WorkingHours {
		wh[i] = whRow{
			ID: row.ID, SalonID: row.SalonID, DayOfWeek: row.DayOfWeek, OpensAt: row.OpensAt, ClosesAt: row.ClosesAt,
			IsClosed: row.IsClosed, BreakStartsAt: row.BreakStartsAt, BreakEndsAt: row.BreakEndsAt,
			ValidFrom: row.ValidFrom, ValidTo: row.ValidTo,
		}
	}
	type ovRow struct {
		ID       uuid.UUID `json:"id"`
		OnDate   string    `json:"onDate"`
		IsClosed bool      `json:"isClosed"`
		Note     *string   `json:"note,omitempty"`
	}
	ov := make([]ovRow, len(bundle.DateOverrides))
	for i, o := range bundle.DateOverrides {
		ov[i] = ovRow{ID: o.ID, OnDate: o.OnDate.Format("2006-01-02"), IsClosed: o.IsClosed, Note: o.Note}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"slotDurationMinutes": bundle.SlotDurationMinutes,
		"workingHours":        wh,
		"dateOverrides":       ov,
	})
}

func (h *DashboardController) putSchedule(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		jsonError(w, "read body", http.StatusBadRequest)
		return
	}
	if len(raw) > 0 && raw[0] == '[' {
		var rows []service.WorkingHourInput
		if err := json.Unmarshal(raw, &rows); err != nil {
			jsonError(w, "invalid json", http.StatusBadRequest)
			return
		}
		if err := h.svc.PutSchedule(r.Context(), salonID, rows); err != nil {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}
	var payload service.SalonSchedulePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	if err := h.svc.PutSalonScheduleBundle(r.Context(), salonID, payload); err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DashboardController) listDashboardSlots(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	q := r.URL.Query()
	dateStr := strings.TrimSpace(q.Get("date"))
	if dateStr == "" {
		jsonError(w, "date is required (YYYY-MM-DD)", http.StatusBadRequest)
		return
	}
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		jsonError(w, "invalid date, expected YYYY-MM-DD", http.StatusBadRequest)
		return
	}
	params := service.SlotParams{SalonID: salonID, Date: date}
	if raw := strings.TrimSpace(q.Get("serviceIds")); raw != "" {
		for _, part := range strings.Split(raw, ",") {
			if id, err := uuid.Parse(strings.TrimSpace(part)); err == nil {
				params.ServiceIDs = append(params.ServiceIDs, id)
			}
		}
	}
	if len(params.ServiceIDs) == 0 {
		if raw := strings.TrimSpace(q.Get("serviceId")); raw != "" {
			if id, err := uuid.Parse(raw); err == nil {
				params.ServiceID = &id
			}
		}
	}
	if raw := strings.TrimSpace(q.Get("salonMasterId")); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			jsonError(w, "invalid salonMasterId", http.StatusBadRequest)
			return
		}
		params.SalonMasterID = &id
	}
	slots, masters, meta, err := h.booking.GetAvailableSlots(r.Context(), params)
	if err != nil {
		if err.Error() == "salon not found" || err.Error() == "service not found for this salon" {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		h.log.Error("dashboard slots", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(slotsResponseBody{
		Date:                meta.Date,
		SlotDurationMinutes: meta.SlotDurationMinutes,
		Slots:               slots,
		Masters:             masters,
	})
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
	scopes, err := h.svc.GetSalonCategoryScopes(r.Context(), salonID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	type out struct {
		ID                   uuid.UUID `json:"id"`
		NameOverride         *string   `json:"nameOverride"`
		Description          *string   `json:"description"`
		PhonePublic          *string   `json:"phonePublic"`
		CategoryID           *string   `json:"categoryId"`
		SalonType            *string   `json:"salonType"`
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
		OnboardingCompleted  bool      `json:"onboardingCompleted"`
		SalonCategoryScopes  []string  `json:"salonCategoryScopes"`
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out{
		ID: s.ID, NameOverride: s.NameOverride, Description: s.Description, PhonePublic: s.PhonePublic,
		CategoryID: s.CategoryID, SalonType: s.SalonType, BusinessType: s.BusinessType, OnlineBookingEnabled: s.OnlineBookingEnabled,
		AddressOverride: s.AddressOverride, Address: s.Address, District: s.District, Lat: s.Lat, Lng: s.Lng,
		PhotoURL: s.PhotoURL, Timezone: s.Timezone, CachedRating: s.CachedRating, CachedReviewCount: s.CachedReviewCount,
		OnboardingCompleted: s.OnboardingCompleted,
		SalonCategoryScopes: scopes,
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
	scopes, err := h.svc.GetSalonCategoryScopes(r.Context(), salonID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	type out struct {
		ID                   uuid.UUID `json:"id"`
		NameOverride         *string   `json:"nameOverride"`
		Description          *string   `json:"description"`
		PhonePublic          *string   `json:"phonePublic"`
		CategoryID           *string   `json:"categoryId"`
		SalonType            *string   `json:"salonType"`
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
		OnboardingCompleted  bool      `json:"onboardingCompleted"`
		SalonCategoryScopes  []string  `json:"salonCategoryScopes"`
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out{
		ID: s.ID, NameOverride: s.NameOverride, Description: s.Description, PhonePublic: s.PhonePublic,
		CategoryID: s.CategoryID, SalonType: s.SalonType, BusinessType: s.BusinessType, OnlineBookingEnabled: s.OnlineBookingEnabled,
		AddressOverride: s.AddressOverride, Address: s.Address, District: s.District, Lat: s.Lat, Lng: s.Lng,
		PhotoURL: s.PhotoURL, Timezone: s.Timezone, CachedRating: s.CachedRating, CachedReviewCount: s.CachedReviewCount,
		OnboardingCompleted: s.OnboardingCompleted,
		SalonCategoryScopes: scopes,
	})
}

func (h *DashboardController) lookupMasterByPhone(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimSpace(r.URL.Query().Get("phone"))
	mp, found, err := h.svc.LookupMasterByPhone(r.Context(), phone)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if !found || mp == nil {
		_ = json.NewEncoder(w).Encode(map[string]any{"found": false})
		return
	}
	type profOut struct {
		ID              uuid.UUID `json:"id"`
		DisplayName     string    `json:"displayName"`
		Bio             *string   `json:"bio"`
		Specializations []string  `json:"specializations"`
		AvatarURL       *string   `json:"avatarUrl"`
		YearsExperience *int      `json:"yearsExperience"`
		PhoneE164       *string   `json:"phoneE164"`
	}
	specs := make([]string, len(mp.Specializations))
	copy(specs, []string(mp.Specializations))
	_ = json.NewEncoder(w).Encode(map[string]any{
		"found": true,
		"profile": profOut{
			ID: mp.ID, DisplayName: mp.DisplayName, Bio: mp.Bio,
			Specializations: specs, AvatarURL: mp.AvatarURL,
			YearsExperience: mp.YearsExperience, PhoneE164: mp.PhoneE164,
		},
	})
}

func (h *DashboardController) createMasterInvite(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body struct {
		MasterProfileID uuid.UUID `json:"masterProfileId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MasterProfileID == uuid.Nil {
		jsonError(w, "masterProfileId required", http.StatusBadRequest)
		return
	}
	st, err := h.svc.CreateMasterInvite(r.Context(), salonID, body.MasterProfileID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	det, err := h.svc.GetSalonMasterDashboardDetail(r.Context(), salonID, st.ID)
	if err != nil || det == nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(det)
}

func staffScheduleBundleJSON(b *service.StaffScheduleBundle) map[string]any {
	rows := make([]map[string]any, len(b.Rows))
	for i, wh := range b.Rows {
		m := map[string]any{
			"id": wh.ID, "staffId": wh.SalonMasterID, "dayOfWeek": wh.DayOfWeek,
			"opensAt": wh.OpensAt, "closesAt": wh.ClosesAt, "isDayOff": wh.IsDayOff,
		}
		if wh.BreakStartsAt != nil {
			m["breakStartsAt"] = *wh.BreakStartsAt
		}
		if wh.BreakEndsAt != nil {
			m["breakEndsAt"] = *wh.BreakEndsAt
		}
		rows[i] = m
	}
	abs := make([]map[string]any, len(b.Absences))
	for i, a := range b.Absences {
		abs[i] = map[string]any{
			"id": a.ID, "startsOn": a.StartsOn.Format("2006-01-02"),
			"endsOn": a.EndsOn.Format("2006-01-02"), "kind": a.Kind,
		}
	}
	return map[string]any{"rows": rows, "absences": abs}
}
