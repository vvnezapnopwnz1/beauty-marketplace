package controller

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
)

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
