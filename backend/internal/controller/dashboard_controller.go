package controller

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/auth"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
)

// DashboardController handles /api/v1/dashboard/* (auth required).
type DashboardController struct {
	svc      service.DashboardService
	booking  service.BookingService
	clients  *SalonClientController
	phoneOTP *service.StaffPhoneOTPService
	log      *zap.Logger
}

// NewDashboardController constructs DashboardController.
func NewDashboardController(svc service.DashboardService, booking service.BookingService, clients *SalonClientController, phoneOTP *service.StaffPhoneOTPService, log *zap.Logger) *DashboardController {
	return &DashboardController{svc: svc, booking: booking, clients: clients, phoneOTP: phoneOTP, log: log}
}

// resolveSalonMembership validates auth context and salon membership. Writes JSON errors on failure.
func (h *DashboardController) resolveSalonMembership(w http.ResponseWriter, r *http.Request) (uuid.UUID, string, bool) {
	uid, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return uuid.Nil, "", false
	}
	rawSalonID := r.Header.Get("X-Salon-Id")
	if rawSalonID == "" {
		jsonError(w, "X-Salon-Id header required", http.StatusBadRequest)
		return uuid.Nil, "", false
	}
	salonID, err := uuid.Parse(rawSalonID)
	if err != nil {
		jsonError(w, "invalid X-Salon-Id", http.StatusBadRequest)
		return uuid.Nil, "", false
	}
	mem, err := h.svc.Membership(r.Context(), uid, salonID)
	if err != nil {
		h.log.Error("dashboard membership", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return uuid.Nil, "", false
	}
	if mem == nil {
		jsonError(w, "no salon access", http.StatusForbidden)
		return uuid.Nil, "", false
	}
	return mem.SalonID, mem.Role, true
}

// PostDashboardClientCreate handles POST /api/v1/dashboard/clients (explicit mux route; see server wiring).
func (h *DashboardController) PostDashboardClientCreate(w http.ResponseWriter, r *http.Request) {
	salonID, _, ok := h.resolveSalonMembership(w, r)
	if !ok {
		return
	}
	h.clients.HandleClients(w, r, salonID, []string{"clients"})
}

// DeleteDashboardClient handles DELETE /api/v1/dashboard/clients/{id} (explicit mux route; see server wiring).
func (h *DashboardController) DeleteDashboardClient(w http.ResponseWriter, r *http.Request) {
	salonID, _, ok := h.resolveSalonMembership(w, r)
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
	salonID, role, ok := h.resolveSalonMembership(w, r)
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
	case "services", "salon-masters", "master-invites", "schedule", "slots":
		if role == "receptionist" {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
		switch parts[0] {
		case "services":
			h.handleServices(w, r, salonID, parts)
		case "staff", "salon-masters":
			h.handleSalonMasters(w, r, salonID, parts)
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
		case "slots":
			if len(parts) == 1 && r.Method == http.MethodGet {
				h.listDashboardSlots(w, r, salonID)
				return
			}
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	case "staff":
		if role == "receptionist" {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
		h.handleSalonMasters(w, r, salonID, parts)
	case "masters":
		if len(parts) >= 2 && parts[1] == "lookup" && r.Method == http.MethodGet {
			h.lookupMasterByPhone(w, r)
			return
		}
		http.NotFound(w, r)
	case "stats":
		if role == "receptionist" {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
		if len(parts) == 1 && r.Method == http.MethodGet {
			h.getStats(w, r, salonID)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	case "staff-invites":
		if role != "owner" {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
		h.handleStaffInvites(w, r, salonID, parts)
	case "salon-members":
		if role != "owner" {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
		h.handleSalonMembers(w, r, salonID, parts)
	case "salon":
		if len(parts) == 2 && parts[1] == "profile" {
			if r.Method == http.MethodGet {
				h.getSalonProfile(w, r, salonID)
				return
			}
			if r.Method == http.MethodPut {
				if role != "owner" {
					jsonError(w, "forbidden", http.StatusForbidden)
					return
				}
				h.putSalonProfile(w, r, salonID)
				return
			}
		}
		http.NotFound(w, r)
	case "phone-otp":
		if role == "receptionist" {
			jsonError(w, "forbidden", http.StatusForbidden)
			return
		}
		h.handleStaffPhoneOTP(w, r, salonID, parts)
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
