package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

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
		ID: ap.ID, SalonID: *ap.SalonID, ServiceID: ap.ServiceID, SalonMasterID: ap.SalonMasterID,
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
