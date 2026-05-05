package controller

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
)

// SalonClientController handles /api/v1/dashboard/clients/*.
type SalonClientController struct {
	svc  service.SalonClientService
	dash service.DashboardService
	log  *zap.Logger
}

// NewSalonClientController constructs SalonClientController.
func NewSalonClientController(svc service.SalonClientService, dash service.DashboardService, log *zap.Logger) *SalonClientController {
	return &SalonClientController{svc: svc, dash: dash, log: log}
}

// HandleClients dispatches /api/v1/dashboard/clients/* after salonID is resolved.
func (h *SalonClientController) HandleClients(w http.ResponseWriter, r *http.Request, salonID uuid.UUID, parts []string) {
	// parts[0] == "clients"
	if len(parts) == 1 {
		switch r.Method {
		case http.MethodGet:
			h.listClients(w, r, salonID)
		case http.MethodPost:
			h.createClient(w, r, salonID)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// /clients/tags
	if parts[1] == "tags" {
		if len(parts) == 2 {
			switch r.Method {
			case http.MethodGet:
				h.listTags(w, r, salonID)
			case http.MethodPost:
				h.createTag(w, r, salonID)
			default:
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			}
			return
		}
		http.NotFound(w, r)
		return
	}

	clientID, err := uuid.Parse(parts[1])
	if err != nil {
		jsonError(w, "invalid client id", http.StatusBadRequest)
		return
	}

	if len(parts) == 2 {
		switch r.Method {
		case http.MethodGet:
			h.getClient(w, r, salonID, clientID)
		case http.MethodPut:
			h.updateClient(w, r, salonID, clientID)
		case http.MethodDelete:
			h.deleteClient(w, r, salonID, clientID)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	switch parts[2] {
	case "appointments":
		if len(parts) == 3 && r.Method == http.MethodGet {
			h.listClientAppointments(w, r, salonID, clientID)
			return
		}
	case "tags":
		if len(parts) == 3 && r.Method == http.MethodPost {
			h.assignTag(w, r, salonID, clientID)
			return
		}
		if len(parts) == 4 && r.Method == http.MethodDelete {
			tagID, err := uuid.Parse(parts[3])
			if err != nil {
				jsonError(w, "invalid tag id", http.StatusBadRequest)
				return
			}
			h.removeTag(w, r, salonID, clientID, tagID)
			return
		}
	case "merge":
		if len(parts) == 3 && r.Method == http.MethodPost {
			h.mergeToUser(w, r, salonID, clientID)
			return
		}
	case "restore":
		if len(parts) == 3 && r.Method == http.MethodPost {
			h.restoreClient(w, r, salonID, clientID)
			return
		}
	}
	http.NotFound(w, r)
}

type clientTagOut struct {
	ID      uuid.UUID  `json:"id"`
	SalonID *uuid.UUID `json:"salonId,omitempty"`
	Name    string     `json:"name"`
	Color   string     `json:"color"`
}

type clientOut struct {
	ID              uuid.UUID      `json:"id"`
	SalonID         uuid.UUID      `json:"salonId"`
	UserID          *uuid.UUID     `json:"userId,omitempty"`
	PhoneE164       *string        `json:"phoneE164,omitempty"`
	ExtraContact    *string        `json:"extraContact,omitempty"`
	DisplayName     string         `json:"displayName"`
	Notes           *string        `json:"notes,omitempty"`
	Tags            []clientTagOut `json:"tags"`
	VisitCount      int64          `json:"visitCount"`
	LastVisitAt     *time.Time     `json:"lastVisitAt,omitempty"`
	UserPhone       *string        `json:"userPhone,omitempty"`
	UserDisplayName *string        `json:"userDisplayName,omitempty"`
	DeletedAt       *time.Time     `json:"deletedAt,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
}

func toClientOut(row repository.SalonClientRow) clientOut {
	tags := make([]clientTagOut, len(row.Tags))
	for i, t := range row.Tags {
		tags[i] = clientTagOut{ID: t.ID, SalonID: t.SalonID, Name: t.Name, Color: t.Color}
	}
	out := clientOut{
		ID:              row.Client.ID,
		SalonID:         row.Client.SalonID,
		UserID:          row.Client.UserID,
		PhoneE164:       row.Client.PhoneE164,
		ExtraContact:    row.Client.ExtraContact,
		DisplayName:     row.Client.DisplayName,
		Notes:           row.Client.Notes,
		Tags:            tags,
		VisitCount:      row.VisitCount,
		LastVisitAt:     row.LastVisitAt,
		UserPhone:       row.UserPhone,
		UserDisplayName: row.UserDisplayName,
		CreatedAt:       row.Client.CreatedAt,
	}
	if row.Client.DeletedAt.Valid {
		t := row.Client.DeletedAt.Time
		out.DeletedAt = &t
	}
	return out
}

func (h *SalonClientController) listClients(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	q := r.URL.Query()
	f := repository.SalonClientListFilter{}
	f.Search = q.Get("search")
	if v := q.Get("tag_ids"); v != "" {
		for _, s := range splitCSV(v) {
			if id, err := uuid.Parse(s); err == nil {
				f.TagIDs = append(f.TagIDs, id)
			}
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
	f.IncludeDeleted = q.Get("include_deleted") == "true"

	rows, total, err := h.svc.ListClients(r.Context(), salonID, f)
	if err != nil {
		h.log.Error("list clients", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	out := make([]clientOut, len(rows))
	for i, row := range rows {
		out[i] = toClientOut(row)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"items": out, "total": total})
}

func (h *SalonClientController) getClient(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	row, err := h.svc.GetClient(r.Context(), salonID, clientID)
	if err != nil {
		h.log.Error("get client", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	if row == nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(toClientOut(*row))
}

func (h *SalonClientController) updateClient(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	var body struct {
		DisplayName  *string `json:"displayName"`
		Notes        *string `json:"notes"`
		PhoneE164    *string `json:"phoneE164"`
		ExtraContact *string `json:"extraContact"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	row, err := h.svc.UpdateClient(r.Context(), salonID, clientID, body.DisplayName, body.Notes, body.PhoneE164, body.ExtraContact)
	if err != nil {
		if err.Error() == "client not found" {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		h.log.Error("update client", zap.Error(err))
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(toClientOut(*row))
}

func (h *SalonClientController) createClient(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body struct {
		DisplayName string `json:"displayName"`
		PhoneE164   string `json:"phoneE164"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	row, err := h.svc.CreateClient(r.Context(), salonID, body.DisplayName, body.PhoneE164)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(toClientOut(*row))
}

func (h *SalonClientController) deleteClient(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	if err := h.svc.DeleteClient(r.Context(), salonID, clientID); err != nil {
		switch err.Error() {
		case "client not found":
			jsonError(w, "not found", http.StatusNotFound)
		case "client already deleted":
			jsonError(w, "client already deleted", http.StatusConflict)
		default:
			h.log.Error("delete client", zap.Error(err))
			jsonError(w, "internal error", http.StatusInternalServerError)
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SalonClientController) restoreClient(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	row, err := h.svc.RestoreClient(r.Context(), salonID, clientID)
	if err != nil {
		if err.Error() == "client not found or not deleted" {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		h.log.Error("restore client", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(toClientOut(*row))
}

type apptRowOut struct {
	ID          uuid.UUID `json:"id"`
	StartsAt    time.Time `json:"startsAt"`
	EndsAt      time.Time `json:"endsAt"`
	Status      string    `json:"status"`
	ServiceName string    `json:"serviceName"`
	StaffName   *string   `json:"staffName,omitempty"`
	ClientLabel string    `json:"clientLabel"`
	ClientPhone *string   `json:"clientPhone,omitempty"`
}

func (h *SalonClientController) listClientAppointments(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	q := r.URL.Query()
	page, pageSize := 1, 25
	if v := q.Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			page = n
		}
	}
	if v := q.Get("page_size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			pageSize = n
		}
	}
	rows, total, err := h.svc.ListClientAppointments(r.Context(), salonID, clientID, page, pageSize)
	if err != nil {
		h.log.Error("list client appointments", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	out := make([]apptRowOut, len(rows))
	for i, row := range rows {
		out[i] = apptRowOut{
			ID:          row.Appointment.ID,
			StartsAt:    row.Appointment.StartsAt,
			EndsAt:      row.Appointment.EndsAt,
			Status:      row.Appointment.Status,
			ServiceName: row.ServiceName,
			StaffName:   row.StaffName,
			ClientLabel: row.ClientLabel,
			ClientPhone: row.ClientPhone,
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"items": out, "total": total})
}

func (h *SalonClientController) assignTag(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	var body struct {
		TagID uuid.UUID `json:"tagId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	if err := h.svc.AssignTag(r.Context(), salonID, clientID, body.TagID); err != nil {
		if err.Error() == "client not found" {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		h.log.Error("assign tag", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SalonClientController) removeTag(w http.ResponseWriter, r *http.Request, salonID, clientID, tagID uuid.UUID) {
	if err := h.svc.RemoveTag(r.Context(), salonID, clientID, tagID); err != nil {
		if err.Error() == "client not found" {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		h.log.Error("remove tag", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SalonClientController) mergeToUser(w http.ResponseWriter, r *http.Request, salonID, clientID uuid.UUID) {
	var body struct {
		UserID uuid.UUID `json:"userId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	c, err := h.svc.MergeToUser(r.Context(), salonID, clientID, body.UserID)
	if err != nil {
		if err.Error() == "client not found" {
			jsonError(w, "not found", http.StatusNotFound)
			return
		}
		h.log.Error("merge client to user", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(salonClientModelOut(c))
}

func salonClientModelOut(c *model.SalonClient) map[string]any {
	return map[string]any{
		"id":          c.ID,
		"salonId":     c.SalonID,
		"userId":      c.UserID,
		"phoneE164":   c.PhoneE164,
		"displayName": c.DisplayName,
		"notes":       c.Notes,
	}
}

func (h *SalonClientController) listTags(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	tags, err := h.svc.ListTags(r.Context(), salonID)
	if err != nil {
		h.log.Error("list tags", zap.Error(err))
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	out := make([]clientTagOut, len(tags))
	for i, t := range tags {
		out[i] = clientTagOut{ID: t.ID, SalonID: t.SalonID, Name: t.Name, Color: t.Color}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func (h *SalonClientController) createTag(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	t, err := h.svc.CreateTag(r.Context(), salonID, body.Name, body.Color)
	if err != nil {
		h.log.Error("create tag", zap.Error(err))
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(clientTagOut{ID: t.ID, SalonID: t.SalonID, Name: t.Name, Color: t.Color})
}

func splitCSV(s string) []string {
	var out []string
	for _, p := range splitPath(s) {
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
