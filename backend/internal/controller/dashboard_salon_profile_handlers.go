package controller

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/service"
)

func (h *DashboardController) getSalonProfile(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	s, err := h.svc.GetSalonProfile(r.Context(), salonID)
	if err != nil || s == nil {
		jsonError(w, "not found", http.StatusNotFound)
		return
	}
	scopes, err := h.svc.GetSalonCategoryScopes(r.Context(), salonID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	type out struct {
		ID                   uuid.UUID `json:"id"`
		NameOverride         *string   `json:"nameOverride"`
		Description          *string   `json:"description"`
		PhonePublic          *string   `json:"phonePublic"`
		CategoryID           *string   `json:"categoryId"`
		SalonType            *string   `json:"salonType"`
		BusinessType         *string   `json:"businessType"`
		OnlineBookingEnabled bool      `json:"onlineBookingEnabled"`
		AddressOverride      *string   `json:"addressOverride"`
		Address              *string   `json:"address"`
		District             *string   `json:"district"`
		Lat                  *float64  `json:"lat"`
		Lng                  *float64  `json:"lng"`
		PhotoURL             *string   `json:"photoUrl"`
		Timezone             string    `json:"timezone"`
		CachedRating         *float64  `json:"cachedRating"`
		CachedReviewCount    *int      `json:"cachedReviewCount"`
		OnboardingCompleted  bool      `json:"onboardingCompleted"`
		SalonCategoryScopes  []string  `json:"salonCategoryScopes"`
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out{
		ID: s.ID, NameOverride: s.NameOverride, Description: s.Description, PhonePublic: s.PhonePublic,
		CategoryID: s.CategoryID, SalonType: s.SalonType, BusinessType: s.BusinessType, OnlineBookingEnabled: s.OnlineBookingEnabled,
		AddressOverride: s.AddressOverride, Address: s.Address, District: s.District, Lat: s.Lat, Lng: s.Lng,
		PhotoURL: s.PhotoURL, Timezone: s.Timezone, CachedRating: s.CachedRating, CachedReviewCount: s.CachedReviewCount,
		OnboardingCompleted: s.OnboardingCompleted,
		SalonCategoryScopes: scopes,
	})
}

func (h *DashboardController) putSalonProfile(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var in service.SalonProfileInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}
	s, err := h.svc.PutSalonProfile(r.Context(), salonID, in)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	scopes, err := h.svc.GetSalonCategoryScopes(r.Context(), salonID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	type out struct {
		ID                   uuid.UUID `json:"id"`
		NameOverride         *string   `json:"nameOverride"`
		Description          *string   `json:"description"`
		PhonePublic          *string   `json:"phonePublic"`
		CategoryID           *string   `json:"categoryId"`
		SalonType            *string   `json:"salonType"`
		BusinessType         *string   `json:"businessType"`
		OnlineBookingEnabled bool      `json:"onlineBookingEnabled"`
		AddressOverride      *string   `json:"addressOverride"`
		Address              *string   `json:"address"`
		District             *string   `json:"district"`
		Lat                  *float64  `json:"lat"`
		Lng                  *float64  `json:"lng"`
		PhotoURL             *string   `json:"photoUrl"`
		Timezone             string    `json:"timezone"`
		CachedRating         *float64  `json:"cachedRating"`
		CachedReviewCount    *int      `json:"cachedReviewCount"`
		OnboardingCompleted  bool      `json:"onboardingCompleted"`
		SalonCategoryScopes  []string  `json:"salonCategoryScopes"`
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out{
		ID: s.ID, NameOverride: s.NameOverride, Description: s.Description, PhonePublic: s.PhonePublic,
		CategoryID: s.CategoryID, SalonType: s.SalonType, BusinessType: s.BusinessType, OnlineBookingEnabled: s.OnlineBookingEnabled,
		AddressOverride: s.AddressOverride, Address: s.Address, District: s.District, Lat: s.Lat, Lng: s.Lng,
		PhotoURL: s.PhotoURL, Timezone: s.Timezone, CachedRating: s.CachedRating, CachedReviewCount: s.CachedReviewCount,
		OnboardingCompleted: s.OnboardingCompleted,
		SalonCategoryScopes: scopes,
	})
}

func (h *DashboardController) lookupMasterByPhone(w http.ResponseWriter, r *http.Request) {
	phone := strings.TrimSpace(r.URL.Query().Get("phone"))
	mp, found, err := h.svc.LookupMasterByPhone(r.Context(), phone)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if !found || mp == nil {
		_ = json.NewEncoder(w).Encode(map[string]any{"found": false})
		return
	}
	type profOut struct {
		ID              uuid.UUID `json:"id"`
		DisplayName     string    `json:"displayName"`
		Bio             *string   `json:"bio"`
		Specializations []string  `json:"specializations"`
		AvatarURL       *string   `json:"avatarUrl"`
		YearsExperience *int      `json:"yearsExperience"`
		PhoneE164       *string   `json:"phoneE164"`
	}
	specs := make([]string, len(mp.Specializations))
	copy(specs, []string(mp.Specializations))
	_ = json.NewEncoder(w).Encode(map[string]any{
		"found": true,
		"profile": profOut{
			ID: mp.ID, DisplayName: mp.DisplayName, Bio: mp.Bio,
			Specializations: specs, AvatarURL: mp.AvatarURL,
			YearsExperience: mp.YearsExperience, PhoneE164: mp.PhoneE164,
		},
	})
}

func (h *DashboardController) createMasterInvite(w http.ResponseWriter, r *http.Request, salonID uuid.UUID) {
	var body struct {
		MasterProfileID uuid.UUID `json:"masterProfileId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.MasterProfileID == uuid.Nil {
		jsonError(w, "masterProfileId required", http.StatusBadRequest)
		return
	}
	st, err := h.svc.CreateMasterInvite(r.Context(), salonID, body.MasterProfileID)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	det, err := h.svc.GetSalonMasterDashboardDetail(r.Context(), salonID, st.ID)
	if err != nil || det == nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(det)
}
