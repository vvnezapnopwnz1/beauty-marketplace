package controller

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

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
