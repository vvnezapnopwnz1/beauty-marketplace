package controller

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

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
