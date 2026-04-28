package controller

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	domainrepo "github.com/yourusername/beauty-marketplace/internal/repository"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type DevController struct {
	cfg       *config.Config
	log       *zap.Logger
	authSvc   *service.AuthService
	claimSvc  service.SalonClaimService
	salonRepo domainrepo.SalonRepository
	db        *gorm.DB
}

func NewDevController(
	cfg *config.Config,
	log *zap.Logger,
	authSvc *service.AuthService,
	claimSvc service.SalonClaimService,
	salonRepo domainrepo.SalonRepository,
	db *gorm.DB,
) *DevController {
	return &DevController{
		cfg:       cfg,
		log:       log,
		authSvc:   authSvc,
		claimSvc:  claimSvc,
		salonRepo: salonRepo,
		db:        db,
	}
}

func (h *DevController) ClaimByExternal(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}
	if !h.cfg.DevEndpoints {
		http.NotFound(w, r)
		return
	}

	var body struct {
		Phone           string  `json:"phone"`
		Source          string  `json:"source"`
		ExternalID      string  `json:"externalId"`
		SnapshotName    string  `json:"snapshotName"`
		SnapshotAddress *string `json:"snapshotAddress"`
		SnapshotPhone   *string `json:"snapshotPhone"`
		SnapshotPhoto   *string `json:"snapshotPhoto"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	phone := normalizePhone(body.Phone)
	source := strings.TrimSpace(body.Source)
	if source == "" {
		source = "2gis"
	}
	externalID := strings.TrimSpace(body.ExternalID)
	if phone == "" || externalID == "" {
		jsonError(w, "phone and externalId are required", http.StatusBadRequest)
		return
	}
	snapshotName := strings.TrimSpace(body.SnapshotName)
	if snapshotName == "" {
		snapshotName = "Dev salon " + externalID
	}

	verify, err := h.authSvc.VerifyOTP(r.Context(), phone, "0000")
	if err != nil {
		jsonError(w, "dev auth failed: "+err.Error(), http.StatusBadRequest)
		return
	}
	userID := verify.User.ID

	salonID, err := h.ensureSalonForExternal(r.Context(), userID, source, externalID, snapshotName, body.SnapshotAddress, body.SnapshotPhone, body.SnapshotPhoto)
	if err != nil {
		h.log.Error("dev claim by external failed", zap.Error(err))
		jsonError(w, "dev claim failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":           true,
		"phone":        phone,
		"userId":       userID,
		"salonId":      salonID,
		"dashboardUrl": "/dashboard/" + salonID.String(),
		"tokenPair":    verify.TokenPair,
		"isNew":        verify.IsNew,
	})
}

func (h *DevController) SeedSalon(w http.ResponseWriter, r *http.Request) {
	h.ClaimByExternal(w, r)
}

func (h *DevController) ensureSalonForExternal(
	ctx context.Context,
	userID uuid.UUID,
	source, externalID, snapshotName string,
	snapshotAddress, snapshotPhone, snapshotPhoto *string,
) (uuid.UUID, error) {
	existing, err := h.salonRepo.FindByExternalID(ctx, source, externalID)
	if err != nil {
		return uuid.Nil, err
	}
	if existing != nil {
		if err := h.ensureOwnerMembership(ctx, existing.ID, userID); err != nil {
			return uuid.Nil, err
		}
		return existing.ID, nil
	}

	claim, err := h.claimSvc.Submit(ctx, service.SubmitClaimInput{
		UserID:          userID,
		Source:          source,
		ExternalID:      externalID,
		RelationType:    "owner",
		SnapshotName:    snapshotName,
		SnapshotAddress: snapshotAddress,
		SnapshotPhone:   snapshotPhone,
		SnapshotPhoto:   snapshotPhoto,
	})
	if err != nil {
		if errors.Is(err, service.ErrClaimAlreadySubmitted) {
			active, getErr := h.claimSvc.GetStatus(ctx, userID, source, externalID)
			if getErr == nil && active != nil {
				if active.SalonID != nil {
					if err := h.ensureOwnerMembership(ctx, *active.SalonID, userID); err != nil {
						return uuid.Nil, err
					}
					return *active.SalonID, nil
				}
				// Dev fallback: if there is already an active pending claim
				// for this user/place, approve it right away.
				if active.Status == "pending" {
					salonID, approveErr := h.claimSvc.Approve(ctx, active.ID, userID)
					if approveErr == nil {
						if err := h.ensureOwnerMembership(ctx, salonID, userID); err != nil {
							return uuid.Nil, err
						}
						return salonID, nil
					}
				}
			}
		}
		return uuid.Nil, err
	}

	salonID, err := h.claimSvc.Approve(ctx, claim.ID, userID)
	if err != nil {
		return uuid.Nil, err
	}
	if err := h.ensureOwnerMembership(ctx, salonID, userID); err != nil {
		return uuid.Nil, err
	}
	return salonID, nil
}

func (h *DevController) ensureOwnerMembership(ctx context.Context, salonID, userID uuid.UUID) error {
	return h.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var member model.SalonMember
		err := tx.Where("salon_id = ? AND user_id = ?", salonID, userID).First(&member).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			member = model.SalonMember{SalonID: salonID, UserID: userID, Role: "owner"}
			return tx.Create(&member).Error
		}
		if err != nil {
			return err
		}
		if member.Role != "owner" {
			return tx.Model(&member).Update("role", "owner").Error
		}
		return nil
	})
}
