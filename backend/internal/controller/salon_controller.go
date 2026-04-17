package controller

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

// SalonController handles salon HTTP API.
type SalonController struct {
	svc          service.SalonService
	booking      service.BookingService
	masterPublic service.MasterPublicService
	log          *zap.Logger
}

// NewSalonController constructs SalonController.
func NewSalonController(svc service.SalonService, booking service.BookingService, masterPublic service.MasterPublicService, log *zap.Logger) *SalonController {
	return &SalonController{svc: svc, booking: booking, masterPublic: masterPublic, log: log}
}

// ListSalons handles GET /api/v1/salons?lat=&lon=&category=&online_only=true
func (h *SalonController) ListSalons(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	filter := service.SalonFilter{
		Category:   q.Get("category"),
		OnlineOnly: q.Get("online_only") == "true",
	}
	if raw := q.Get("lat"); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil {
			filter.Lat = &v
		}
	}
	if raw := q.Get("lon"); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil {
			filter.Lon = &v
		}
	}

	salons, err := h.svc.GetAllSalons(r.Context(), filter)
	if err != nil {
		h.log.Error("failed to get salons", zap.Error(err))
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(salons)
}

// SalonRoutes handles GET /api/v1/salons/{id} and POST /api/v1/salons/{id}/bookings
func (h *SalonController) SalonRoutes(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) == 4 && parts[0] == "api" && parts[1] == "v1" && parts[2] == "salons" && parts[3] == "by-external" && r.Method == http.MethodGet {
		h.getSalonByExternal(w, r)
		return
	}
	if len(parts) < 4 || parts[0] != "api" || parts[1] != "v1" || parts[2] != "salons" {
		http.NotFound(w, r)
		return
	}
	salonID, err := uuid.Parse(parts[3])
	if err != nil {
		http.Error(w, "invalid salon id", http.StatusBadRequest)
		return
	}

	if len(parts) == 4 && r.Method == http.MethodGet {
		h.getSalonByID(w, r, salonID)
		return
	}
	if len(parts) == 5 && parts[4] == "bookings" && r.Method == http.MethodPost {
		h.createGuestBooking(w, r, salonID)
		return
	}
	if len(parts) == 5 && parts[4] == "masters" && r.Method == http.MethodGet {
		h.listPublicSalonMasters(w, r, salonID)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (h *SalonController) listPublicSalonMasters(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	list, err := h.masterPublic.ListSalonMastersPublic(r.Context(), salonID)
	if err != nil {
		h.log.Error("list public salon masters", zap.Error(err))
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *SalonController) getSalonByID(w http.ResponseWriter, r *http.Request, id uuid.UUID) {
	salon, err := h.svc.GetSalonByID(r.Context(), id)
	if err != nil {
		h.log.Error("failed to get salon by id", zap.Error(err))
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if salon == nil {
		http.Error(w, "salon not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(salon)
}

func (h *SalonController) getSalonByExternal(w http.ResponseWriter, r *http.Request) {
	source := strings.TrimSpace(r.URL.Query().Get("source"))
	externalID := strings.TrimSpace(r.URL.Query().Get("id"))
	if source == "" || externalID == "" {
		http.Error(w, "source and id are required", http.StatusBadRequest)
		return
	}
	result, err := h.svc.FindIDByExternal(r.Context(), source, externalID)
	if err != nil {
		h.log.Error("failed to find salon by external id", zap.Error(err))
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if result == nil {
		http.Error(w, "salon not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

type guestBookingBody struct {
	ServiceID uuid.UUID `json:"serviceId"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Note      string    `json:"note,omitempty"`
}

func (h *SalonController) createGuestBooking(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body guestBookingBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json body", http.StatusBadRequest)
		return
	}
	if body.ServiceID == uuid.Nil {
		jsonError(w, "serviceId is required", http.StatusBadRequest)
		return
	}

	phone := normalizePhone(body.Phone)
	result, err := h.booking.CreateGuestBooking(r.Context(), service.GuestBookingInput{
		SalonID:   salonID,
		ServiceID: body.ServiceID,
		Name:      body.Name,
		PhoneE164: phone,
		Note:      body.Note,
	})
	if err != nil {
		msg := err.Error()
		switch msg {
		case "salon not found":
			jsonError(w, msg, http.StatusNotFound)
		case "online booking is disabled for this salon":
			jsonError(w, msg, http.StatusForbidden)
		case "service not found for this salon":
			jsonError(w, msg, http.StatusBadRequest)
		default:
			if strings.Contains(msg, "invalid phone") || strings.Contains(msg, "name is required") {
				jsonError(w, msg, http.StatusBadRequest)
				return
			}
			h.log.Error("guest booking", zap.Error(err))
			jsonError(w, "could not create booking", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(result)
}
