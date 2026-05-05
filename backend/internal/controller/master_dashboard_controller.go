package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// MasterDashboardController handles /api/v1/master-dashboard/* (auth + master profile required).
type MasterDashboardController struct {
	svc service.MasterDashboardService
	log *zap.Logger
}

// NewMasterDashboardController constructs MasterDashboardController.
func NewMasterDashboardController(svc service.MasterDashboardService, log *zap.Logger) *MasterDashboardController {
	return &MasterDashboardController{svc: svc, log: log}
}

// JSON bodies for master personal appointments (camelCase), same shape as dashboard manual appointment APIs.
type masterCreateApptBody struct {
	ServiceIDs   []uuid.UUID `json:"serviceIds"`
	StartsAt     string      `json:"startsAt"`
	GuestName    string      `json:"guestName"`
	GuestPhone   string      `json:"guestPhone"`
	ClientNote   string      `json:"clientNote,omitempty"`
	ClientUserID *uuid.UUID  `json:"clientUserId,omitempty"`
}

type masterPutApptBody struct {
	StartsAt   *string     `json:"startsAt,omitempty"`
	EndsAt     *string     `json:"endsAt,omitempty"`
	ServiceIDs []uuid.UUID `json:"serviceIds,omitempty"`
	ClientNote *string     `json:"clientNote,omitempty"`
	GuestName  *string     `json:"guestName,omitempty"`
	GuestPhone *string     `json:"guestPhone,omitempty"`
}

type masterPatchApptStatusBody struct {
	Status string `json:"status"`
}

type masterExpenseCategoryBody struct {
	Name  string  `json:"name"`
	Emoji *string `json:"emoji,omitempty"`
}

type masterExpenseBody struct {
	CategoryID    *uuid.UUID `json:"categoryId,omitempty"`
	AppointmentID *uuid.UUID `json:"appointmentId,omitempty"`
	AmountCents   int        `json:"amountCents"`
	Description   *string    `json:"description,omitempty"`
	ExpenseDate   string     `json:"expenseDate"`
}

func parseMasterPutApptBody(id uuid.UUID, body masterPutApptBody) (service.UpdateAppointmentInput, error) {
	in := service.UpdateAppointmentInput{AppointmentID: id}
	if body.StartsAt != nil {
		t, err := time.Parse(time.RFC3339, *body.StartsAt)
		if err != nil {
			return in, err
		}
		in.StartsAt = &t
	}
	if body.EndsAt != nil {
		t, err := time.Parse(time.RFC3339, *body.EndsAt)
		if err != nil {
			return in, err
		}
		in.EndsAt = &t
	}
	in.ServiceIDs = body.ServiceIDs
	in.ClientNote = body.ClientNote
	in.GuestName = body.GuestName
	in.GuestPhone = body.GuestPhone
	return in, nil
}

// MasterDashboardRoutes dispatches under /api/v1/master-dashboard/.
func (h *MasterDashboardController) MasterDashboardRoutes(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/v1/master-dashboard")
	path = strings.Trim(path, "/")
	parts := splitPath(path)

	if len(parts) == 0 {
		http.NotFound(w, r)
		return
	}

	prof, err := h.svc.MyProfile(r.Context(), userID)
	if err != nil {
		h.log.Error("master dashboard profile gate", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if prof == nil {
		jsonError(w, "master profile required", http.StatusForbidden)
		return
	}

	switch parts[0] {
	case "service-categories":
		if len(parts) == 1 && r.Method == http.MethodGet {
			out, err := h.svc.ListMasterServiceCategories(r.Context())
			if err != nil {
				h.log.Error("master service categories", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	case "profile":
		if len(parts) != 1 {
			http.NotFound(w, r)
			return
		}
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(prof)
			return
		}
		if r.Method == http.MethodPut {
			var body service.UpdateMasterProfileCabinetInput
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			out, err := h.svc.UpdateMyProfile(r.Context(), userID, body)
			if err != nil {
				if err.Error() == "displayName is required" || strings.Contains(err.Error(), "bio exceeds") {
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				h.log.Error("master update profile", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			if out == nil {
				jsonError(w, "profile not found", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	case "invites":
		if len(parts) == 1 && r.Method == http.MethodGet {
			list, err := h.svc.ListInvites(r.Context(), userID)
			if err != nil {
				h.log.Error("master list invites", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(list)
			return
		}
		if len(parts) == 3 && parts[2] == "accept" && r.Method == http.MethodPost {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if err := h.svc.AcceptInvite(r.Context(), userID, id); err != nil {
				if err.Error() == "invite not found or not pending" {
					jsonError(w, err.Error(), http.StatusNotFound)
					return
				}
				h.log.Error("master accept invite", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
			return
		}
		if len(parts) == 3 && parts[2] == "decline" && r.Method == http.MethodPost {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if err := h.svc.DeclineInvite(r.Context(), userID, id); err != nil {
				if err.Error() == "invite not found or not pending" {
					jsonError(w, err.Error(), http.StatusNotFound)
					return
				}
				h.log.Error("master decline invite", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
			return
		}
		http.NotFound(w, r)
	case "salons":
		if len(parts) == 1 && r.Method == http.MethodGet {
			list, err := h.svc.ListSalons(r.Context(), userID)
			if err != nil {
				h.log.Error("master list salons", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(list)
			return
		}
		http.NotFound(w, r)
	case "appointments":
		if len(parts) == 1 && r.Method == http.MethodGet {
			q := r.URL.Query()
			var from, to *time.Time
			if v := q.Get("from"); v != "" {
				t, err := time.Parse("2006-01-02", v)
				if err == nil {
					utc := t.UTC()
					from = &utc
				}
			}
			if v := q.Get("to"); v != "" {
				t, err := time.Parse("2006-01-02", v)
				if err == nil {
					end := t.Add(24 * time.Hour).UTC()
					to = &end
				}
			}
			status := q.Get("status")
			search := q.Get("search")
			source := q.Get("source")
			sortBy := q.Get("sort_by")
			sortDir := q.Get("sort_dir")
			page, _ := strconv.Atoi(q.Get("page"))
			pageSize, _ := strconv.Atoi(q.Get("page_size"))

			items, total, err := h.svc.ListAppointments(r.Context(), userID, from, to, status, search, source, sortBy, sortDir, page, pageSize)
			if err != nil {
				h.log.Error("master list appointments", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			if page < 1 {
				page = 1
			}
			if pageSize < 1 {
				pageSize = 50
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"items":    items,
				"total":    total,
				"page":     page,
				"pageSize": pageSize,
			})
			return
		}
		if len(parts) == 1 && r.Method == http.MethodPost {
			var body masterCreateApptBody
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			st, err := time.Parse(time.RFC3339, body.StartsAt)
			if err != nil {
				jsonError(w, "startsAt must be RFC3339", http.StatusBadRequest)
				return
			}
			ap, err := h.svc.CreatePersonalAppointment(r.Context(), userID, service.ManualAppointmentInput{
				ServiceIDs:   body.ServiceIDs,
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
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(ap)
			return
		}
		if len(parts) == 3 && parts[2] == "status" && r.Method == http.MethodPatch {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			var body masterPatchApptStatusBody
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Status == "" {
				jsonError(w, "status required", http.StatusBadRequest)
				return
			}
			if err := h.svc.PatchPersonalAppointmentStatus(r.Context(), userID, id, body.Status); err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					jsonError(w, "not found", http.StatusNotFound)
					return
				}
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if len(parts) == 2 && r.Method == http.MethodPut {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			var body masterPutApptBody
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			in, err := parseMasterPutApptBody(id, body)
			if err != nil {
				jsonError(w, "startsAt/endsAt must be RFC3339", http.StatusBadRequest)
				return
			}
			if err := h.svc.UpdatePersonalAppointment(r.Context(), userID, in); err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					jsonError(w, "not found", http.StatusNotFound)
					return
				}
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.NotFound(w, r)
	case "services":
		if len(parts) == 1 && r.Method == http.MethodGet {
			list, err := h.svc.ListMasterServices(r.Context(), userID)
			if err != nil {
				h.log.Error("master list services", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(list)
			return
		}
		if len(parts) == 1 && r.Method == http.MethodPost {
			var body service.CreateMasterServiceInput
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			out, err := h.svc.CreateMasterService(r.Context(), userID, body)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if len(parts) == 2 {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if r.Method == http.MethodPut {
				var body service.CreateMasterServiceInput
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					jsonError(w, "invalid json", http.StatusBadRequest)
					return
				}
				out, err := h.svc.UpdateMasterService(r.Context(), userID, id, body)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						jsonError(w, "not found", http.StatusNotFound)
						return
					}
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(out)
				return
			}
			if r.Method == http.MethodDelete {
				if err := h.svc.DeleteMasterService(r.Context(), userID, id); err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						jsonError(w, "not found", http.StatusNotFound)
						return
					}
					h.log.Error("master delete service", zap.Error(err))
					jsonError(w, "internal error", http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		http.NotFound(w, r)
	case "clients":
		if len(parts) == 1 && r.Method == http.MethodGet {
			q := r.URL.Query()
			search := q.Get("search")
			sortBy := q.Get("sort_by")
			sortDir := q.Get("sort_dir")
			page, _ := strconv.Atoi(q.Get("page"))
			pageSize, _ := strconv.Atoi(q.Get("page_size"))
			items, total, err := h.svc.ListMasterClients(r.Context(), userID, search, sortBy, sortDir, page, pageSize)
			if err != nil {
				h.log.Error("master list clients", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			if page < 1 {
				page = 1
			}
			if pageSize < 1 {
				pageSize = 50
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"items":    items,
				"total":    total,
				"page":     page,
				"pageSize": pageSize,
			})
			return
		}
		if len(parts) == 1 && r.Method == http.MethodPost {
			var body service.CreateMasterClientInput
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				jsonError(w, "invalid json", http.StatusBadRequest)
				return
			}
			out, err := h.svc.CreateMasterClient(r.Context(), userID, body)
			if err != nil {
				jsonError(w, err.Error(), http.StatusBadRequest)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if len(parts) == 2 {
			id, err := uuid.Parse(parts[1])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if r.Method == http.MethodPut {
				var body service.CreateMasterClientInput
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					jsonError(w, "invalid json", http.StatusBadRequest)
					return
				}
				out, err := h.svc.UpdateMasterClient(r.Context(), userID, id, body)
				if err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						jsonError(w, "not found", http.StatusNotFound)
						return
					}
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(out)
				return
			}
			if r.Method == http.MethodDelete {
				if err := h.svc.DeleteMasterClient(r.Context(), userID, id); err != nil {
					if errors.Is(err, gorm.ErrRecordNotFound) {
						jsonError(w, "not found", http.StatusNotFound)
						return
					}
					h.log.Error("master delete client", zap.Error(err))
					jsonError(w, "internal error", http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		http.NotFound(w, r)
	case "finances":
		if len(parts) == 2 && parts[1] == "summary" && r.Method == http.MethodGet {
			q := r.URL.Query()
			source := q.Get("source")
			if source == "" {
				source = "all"
			}
			var from, to *time.Time
			if v := q.Get("from"); v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					utc := t.UTC()
					from = &utc
				}
			}
			if v := q.Get("to"); v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					end := t.Add(24 * time.Hour).UTC()
					to = &end
				}
			}
			out, err := h.svc.GetFinanceSummary(r.Context(), userID, source, from, to)
			if err != nil {
				h.log.Error("master finance summary", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if len(parts) == 2 && parts[1] == "trends" && r.Method == http.MethodGet {
			q := r.URL.Query()
			source := q.Get("source")
			if source == "" {
				source = "all"
			}
			var from, to *time.Time
			if v := q.Get("from"); v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					utc := t.UTC()
					from = &utc
				}
			}
			if v := q.Get("to"); v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					end := t.Add(24 * time.Hour).UTC()
					to = &end
				}
			}
			out, err := h.svc.GetFinanceTrend(r.Context(), userID, source, from, to)
			if err != nil {
				h.log.Error("master finance trend", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if len(parts) == 2 && parts[1] == "top-services" && r.Method == http.MethodGet {
			q := r.URL.Query()
			source := q.Get("source")
			if source == "" {
				source = "all"
			}
			var from, to *time.Time
			if v := q.Get("from"); v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					utc := t.UTC()
					from = &utc
				}
			}
			if v := q.Get("to"); v != "" {
				if t, err := time.Parse("2006-01-02", v); err == nil {
					end := t.Add(24 * time.Hour).UTC()
					to = &end
				}
			}
			out, err := h.svc.GetTopServices(r.Context(), userID, source, from, to)
			if err != nil {
				h.log.Error("master finance top services", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		if len(parts) == 2 && parts[1] == "categories" {
			if r.Method == http.MethodGet {
				out, err := h.svc.ListExpenseCategories(r.Context(), userID)
				if err != nil {
					h.log.Error("master finance categories", zap.Error(err))
					jsonError(w, "internal error", http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(out)
				return
			}
			if r.Method == http.MethodPost {
				var body masterExpenseCategoryBody
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					jsonError(w, "invalid json", http.StatusBadRequest)
					return
				}
				out, err := h.svc.CreateExpenseCategory(r.Context(), userID, service.CreateMasterExpenseCategoryInput{
					Name:  body.Name,
					Emoji: body.Emoji,
				})
				if err != nil {
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusCreated)
				_ = json.NewEncoder(w).Encode(out)
				return
			}
		}
		if len(parts) == 3 && parts[1] == "categories" {
			id, err := uuid.Parse(parts[2])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if r.Method == http.MethodPut {
				var body masterExpenseCategoryBody
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					jsonError(w, "invalid json", http.StatusBadRequest)
					return
				}
				out, err := h.svc.UpdateExpenseCategory(r.Context(), userID, id, service.CreateMasterExpenseCategoryInput{
					Name:  body.Name,
					Emoji: body.Emoji,
				})
				if err != nil {
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				if out == nil {
					jsonError(w, "not found", http.StatusNotFound)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(out)
				return
			}
			if r.Method == http.MethodDelete {
				if err := h.svc.DeleteExpenseCategory(r.Context(), userID, id); err != nil {
					jsonError(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		if len(parts) == 2 && parts[1] == "expenses" {
			if r.Method == http.MethodGet {
				q := r.URL.Query()
				var from, to *time.Time
				if v := q.Get("from"); v != "" {
					if t, err := time.Parse("2006-01-02", v); err == nil {
						utc := t.UTC()
						from = &utc
					}
				}
				if v := q.Get("to"); v != "" {
					if t, err := time.Parse("2006-01-02", v); err == nil {
						end := t.Add(24 * time.Hour).UTC()
						to = &end
					}
				}
				page, _ := strconv.Atoi(q.Get("page"))
				pageSize, _ := strconv.Atoi(q.Get("page_size"))
				out, err := h.svc.ListExpenses(r.Context(), userID, from, to, page, pageSize)
				if err != nil {
					h.log.Error("master finance expenses", zap.Error(err))
					jsonError(w, "internal error", http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(out)
				return
			}
			if r.Method == http.MethodPost {
				var body masterExpenseBody
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					jsonError(w, "invalid json", http.StatusBadRequest)
					return
				}
				out, err := h.svc.CreateExpense(r.Context(), userID, service.CreateMasterExpenseInput{
					CategoryID:    body.CategoryID,
					AppointmentID: body.AppointmentID,
					AmountCents:   body.AmountCents,
					Description:   body.Description,
					ExpenseDate:   body.ExpenseDate,
				})
				if err != nil {
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusCreated)
				_ = json.NewEncoder(w).Encode(out)
				return
			}
		}
		if len(parts) == 3 && parts[1] == "expenses" {
			id, err := uuid.Parse(parts[2])
			if err != nil {
				jsonError(w, "invalid id", http.StatusBadRequest)
				return
			}
			if r.Method == http.MethodPut {
				var body masterExpenseBody
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					jsonError(w, "invalid json", http.StatusBadRequest)
					return
				}
				out, err := h.svc.UpdateExpense(r.Context(), userID, id, service.CreateMasterExpenseInput{
					CategoryID:    body.CategoryID,
					AppointmentID: body.AppointmentID,
					AmountCents:   body.AmountCents,
					Description:   body.Description,
					ExpenseDate:   body.ExpenseDate,
				})
				if err != nil {
					jsonError(w, err.Error(), http.StatusBadRequest)
					return
				}
				if out == nil {
					jsonError(w, "not found", http.StatusNotFound)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(out)
				return
			}
			if r.Method == http.MethodDelete {
				if err := h.svc.DeleteExpense(r.Context(), userID, id); err != nil {
					jsonError(w, err.Error(), http.StatusInternalServerError)
					return
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		if len(parts) == 2 && parts[1] == "export" && r.Method == http.MethodGet {
			q := r.URL.Query()
			month := q.Get("month")
			out, err := h.svc.ExportNpdReport(r.Context(), userID, month)
			if err != nil {
				h.log.Error("master finance export", zap.Error(err))
				jsonError(w, "internal error", http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(out)
			return
		}
		http.NotFound(w, r)
	default:
		http.NotFound(w, r)
	}
}
