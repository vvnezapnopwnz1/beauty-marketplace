package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

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
	if len(parts) == 5 && parts[4] == "slots" && r.Method == http.MethodGet {
		h.listPublicSlots(w, r, salonID)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

type slotsResponseBody struct {
	Date                string                   `json:"date"`
	SlotDurationMinutes int                      `json:"slotDurationMinutes"`
	Slots               []service.AvailableSlot  `json:"slots"`
	Masters             []service.SlotMasterInfo `json:"masters"`
}

func (h *SalonController) listPublicSlots(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
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
	const maxPublicSlotServices = 10
	if raw := strings.TrimSpace(q.Get("serviceIds")); raw != "" {
		seen := make(map[uuid.UUID]struct{})
		for _, part := range strings.Split(raw, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			id, err := uuid.Parse(part)
			if err != nil {
				jsonError(w, "invalid serviceIds", http.StatusBadRequest)
				return
			}
			if _, ok := seen[id]; ok {
				continue
			}
			seen[id] = struct{}{}
			params.ServiceIDs = append(params.ServiceIDs, id)
		}
		if len(params.ServiceIDs) > maxPublicSlotServices {
			jsonError(w, "too many serviceIds (max 10)", http.StatusBadRequest)
			return
		}
	}
	if len(params.ServiceIDs) == 0 {
		if raw := strings.TrimSpace(q.Get("serviceId")); raw != "" {
			id, err := uuid.Parse(raw)
			if err != nil {
				jsonError(w, "invalid serviceId", http.StatusBadRequest)
				return
			}
			params.ServiceID = &id
		}
	}
	var masterProfileID *uuid.UUID
	if raw := strings.TrimSpace(q.Get("masterProfileId")); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			jsonError(w, "invalid masterProfileId", http.StatusBadRequest)
			return
		}
		masterProfileID = &id
		params.MasterProfileID = masterProfileID
	}
	var salonMasterID *uuid.UUID
	if raw := strings.TrimSpace(q.Get("salonMasterId")); raw != "" {
		id, err := uuid.Parse(raw)
		if err != nil {
			jsonError(w, "invalid salonMasterId", http.StatusBadRequest)
			return
		}
		salonMasterID = &id
		params.SalonMasterID = salonMasterID
	}
	if masterProfileID != nil && salonMasterID != nil {
		jsonError(w, "use only one of masterProfileId or salonMasterId", http.StatusBadRequest)
		return
	}
	slots, masters, meta, err := h.booking.GetAvailableSlots(r.Context(), params)
	if err != nil {
		if errors.Is(err, service.ErrBookingUnavailable) || err.Error() == "salon not found" || err.Error() == "service not found for this salon" {
			jsonError(w, err.Error(), http.StatusBadRequest)
			return
		}
		h.log.Error("list public slots", zap.Error(err))
		jsonError(w, "internal server error", http.StatusInternalServerError)
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
	ServiceID       uuid.UUID   `json:"serviceId"`
	ServiceIDs      []uuid.UUID `json:"serviceIds,omitempty"`
	Name            string      `json:"name"`
	Phone           string      `json:"phone"`
	Note            string      `json:"note,omitempty"`
	StartsAt        *time.Time  `json:"startsAt,omitempty"`
	EndsAt          *time.Time  `json:"endsAt,omitempty"`
	SalonMasterID   *uuid.UUID  `json:"salonMasterId,omitempty"`
	MasterProfileID *uuid.UUID  `json:"masterProfileId,omitempty"`
}

func collectGuestBookingServiceIDs(body guestBookingBody) ([]uuid.UUID, error) {
	seen := make(map[uuid.UUID]struct{})
	out := make([]uuid.UUID, 0, len(body.ServiceIDs)+1)
	for _, id := range body.ServiceIDs {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	if len(out) > 0 {
		return out, nil
	}
	if body.ServiceID != uuid.Nil {
		return []uuid.UUID{body.ServiceID}, nil
	}
	return nil, errors.New("at least one service is required")
}

func (h *SalonController) createGuestBooking(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body guestBookingBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json body", http.StatusBadRequest)
		return
	}
	const maxGuestBookingServices = 10
	serviceIDs, err := collectGuestBookingServiceIDs(body)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	if len(serviceIDs) > maxGuestBookingServices {
		jsonError(w, "too many services (max 10)", http.StatusBadRequest)
		return
	}

	phone := normalizePhone(body.Phone)
	result, err := h.booking.CreateGuestBooking(r.Context(), service.GuestBookingInput{
		SalonID:         salonID,
		ServiceID:       serviceIDs[0],
		ServiceIDs:      serviceIDs,
		Name:            body.Name,
		PhoneE164:       phone,
		Note:            body.Note,
		StartsAt:        body.StartsAt,
		EndsAt:          body.EndsAt,
		SalonMasterID:   body.SalonMasterID,
		MasterProfileID: body.MasterProfileID,
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
			if strings.Contains(msg, "invalid phone") || strings.Contains(msg, "name is required") ||
				strings.Contains(msg, "at least one service") || strings.Contains(msg, "too many services") ||
				strings.Contains(msg, "master does not provide") || strings.Contains(msg, "slot duration") ||
				strings.Contains(msg, "invalid slot") {
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
