package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

// SalonClaimController handles /api/v1/salons/claim* and /api/v1/admin/claims*.
type SalonClaimController struct {
	svc service.SalonClaimService
	log *zap.Logger
}

// NewSalonClaimController constructs SalonClaimController.
func NewSalonClaimController(svc service.SalonClaimService, log *zap.Logger) *SalonClaimController {
	return &SalonClaimController{svc: svc, log: log}
}

// SubmitClaim handles POST /api/v1/salons/claim (JWT required, any role).
func (h *SalonClaimController) SubmitClaim(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Source       string  `json:"source"`
		ExternalID   string  `json:"externalId"`
		RelationType string  `json:"relationType"`
		Comment      *string `json:"comment"`
		SnapshotName string  `json:"snapshotName"`

		SnapshotAddress *string `json:"snapshotAddress"`
		SnapshotPhone   *string `json:"snapshotPhone"`
		SnapshotPhoto   *string `json:"snapshotPhoto"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.Source == "" || body.ExternalID == "" || body.SnapshotName == "" {
		jsonError(w, "source, externalId and snapshotName are required", http.StatusBadRequest)
		return
	}

	claim, err := h.svc.Submit(r.Context(), service.SubmitClaimInput{
		UserID:          userID,
		Source:          body.Source,
		ExternalID:      body.ExternalID,
		RelationType:    body.RelationType,
		Comment:         body.Comment,
		SnapshotName:    body.SnapshotName,
		SnapshotAddress: body.SnapshotAddress,
		SnapshotPhone:   body.SnapshotPhone,
		SnapshotPhoto:   body.SnapshotPhoto,
	})
	if errors.Is(err, service.ErrClaimAlreadyClaimed) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "already_claimed"})
		return
	}
	if errors.Is(err, service.ErrClaimAlreadySubmitted) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":  "claim_already_submitted",
			"status": "pending",
		})
		return
	}
	if err != nil {
		h.log.Error("submit claim", zap.Error(err))
		jsonError(w, "internal", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"claimId":             claim.ID,
		"status":              claim.Status,
		"estimatedReviewDays": 3,
	})
}

// GetMyStatus handles GET /api/v1/salons/claim/my-status?source=2gis&externalId=...
func (h *SalonClaimController) GetMyStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	q := r.URL.Query()
	source := q.Get("source")
	externalID := q.Get("externalId")
	if source == "" || externalID == "" {
		jsonError(w, "source and externalId are required", http.StatusBadRequest)
		return
	}

	claim, err := h.svc.GetStatus(r.Context(), userID, source, externalID)
	if err != nil {
		h.log.Error("get claim status", zap.Error(err))
		jsonError(w, "internal", http.StatusInternalServerError)
		return
	}
	if claim == nil {
		jsonError(w, "no_active_claim", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"claimId":         claim.ID,
		"status":          claim.Status,
		"rejectionReason": claim.RejectionReason,
		"salonId":         claim.SalonID,
		"createdAt":       claim.CreatedAt,
	})
}

// AdminClaimsRoutes handles /api/v1/admin/claims and /api/v1/admin/claims/:id/...
func (h *SalonClaimController) AdminClaimsRoutes(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	// GET /api/v1/admin/claims
	if len(parts) == 4 && r.Method == http.MethodGet {
		h.listClaims(w, r)
		return
	}
	// PUT /api/v1/admin/claims/:id/approve
	// PUT /api/v1/admin/claims/:id/reject
	if len(parts) == 6 && r.Method == http.MethodPut {
		id, err := uuid.Parse(parts[4])
		if err != nil {
			jsonError(w, "invalid claim id", http.StatusBadRequest)
			return
		}
		switch parts[5] {
		case "approve":
			h.approveClaim(w, r, id)
		case "reject":
			h.rejectClaim(w, r, id)
		default:
			http.NotFound(w, r)
		}
		return
	}
	http.NotFound(w, r)
}

func (h *SalonClaimController) listClaims(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status := q.Get("status")
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))

	rows, total, err := h.svc.ListForAdmin(r.Context(), status, page, pageSize)
	if err != nil {
		h.log.Error("list claims", zap.Error(err))
		jsonError(w, "internal", http.StatusInternalServerError)
		return
	}

	type placeDTO struct {
		Name    string  `json:"name"`
		Address *string `json:"address"`
		Phone   *string `json:"phone"`
		Photo   *string `json:"photoUrl"`
	}
	type userDTO struct {
		ID          string  `json:"id"`
		Phone       string  `json:"phone"`
		DisplayName *string `json:"displayName"`
	}
	type itemDTO struct {
		ID           string   `json:"id"`
		Status       string   `json:"status"`
		RelationType string   `json:"relationType"`
		Comment      *string  `json:"comment"`
		CreatedAt    string   `json:"createdAt"`
		User         userDTO  `json:"user"`
		Place        placeDTO `json:"place"`
	}

	items := make([]itemDTO, len(rows))
	for i, row := range rows {
		items[i] = itemDTO{
			ID:           row.Claim.ID.String(),
			Status:       row.Claim.Status,
			RelationType: row.Claim.RelationType,
			Comment:      row.Claim.Comment,
			CreatedAt:    row.Claim.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			User: userDTO{
				ID:          row.Claim.UserID.String(),
				Phone:       row.UserPhone,
				DisplayName: row.UserDisplayName,
			},
			Place: placeDTO{
				Name:    row.Claim.SnapshotName,
				Address: row.Claim.SnapshotAddress,
				Phone:   row.Claim.SnapshotPhone,
				Photo:   row.Claim.SnapshotPhoto,
			},
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"items": items,
		"total": total,
	})
}

func (h *SalonClaimController) approveClaim(w http.ResponseWriter, r *http.Request, claimID uuid.UUID) {
	reviewerID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	salonID, err := h.svc.Approve(r.Context(), claimID, reviewerID)
	if errors.Is(err, service.ErrClaimNotFound) {
		jsonError(w, "claim_not_found", http.StatusNotFound)
		return
	}
	if errors.Is(err, service.ErrClaimNotPending) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "claim_already_approved"})
		return
	}
	if err != nil {
		h.log.Error("approve claim", zap.Error(err))
		jsonError(w, "internal", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"salonId": salonID.String()})
}

func (h *SalonClaimController) rejectClaim(w http.ResponseWriter, r *http.Request, claimID uuid.UUID) {
	reviewerID, ok := auth.UserIDFromCtx(r.Context())
	if !ok {
		jsonError(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Reason == "" {
		jsonError(w, "reason is required", http.StatusBadRequest)
		return
	}

	err := h.svc.Reject(r.Context(), claimID, reviewerID, body.Reason)
	if errors.Is(err, service.ErrClaimNotFound) {
		jsonError(w, "claim_not_found", http.StatusNotFound)
		return
	}
	if errors.Is(err, service.ErrClaimNotPending) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "claim_not_pending"})
		return
	}
	if err != nil {
		h.log.Error("reject claim", zap.Error(err))
		jsonError(w, "internal", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "rejected"})
}
