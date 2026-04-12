package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/yourusername/beauty-marketplace/internal/errs"
	"github.com/yourusername/beauty-marketplace/internal/model"
	"github.com/yourusername/beauty-marketplace/internal/service"
	"go.uber.org/zap"
)

// PlacesController handles catalog search HTTP API.
type PlacesController struct {
	svc service.PlacesService
	log *zap.Logger
}

// NewPlacesController constructs PlacesController.
func NewPlacesController(svc service.PlacesService, log *zap.Logger) *PlacesController {
	return &PlacesController{svc: svc, log: log}
}

// SearchPlaces handles GET /api/v1/places/search?q=&lat=&lon=&radius=&page=&page_size=
func (h *PlacesController) SearchPlaces(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	v := r.URL.Query()
	queryStr := v.Get("q")
	if queryStr == "" {
		http.Error(w, "missing q", http.StatusBadRequest)
		return
	}
	latStr := v.Get("lat")
	lonStr := v.Get("lon")
	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		http.Error(w, "invalid or missing lat", http.StatusBadRequest)
		return
	}
	lon, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		http.Error(w, "invalid or missing lon", http.StatusBadRequest)
		return
	}
	radius := 2000
	if s := v.Get("radius"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			radius = n
		}
	}
	page := 1
	if s := v.Get("page"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			page = n
		}
	}
	pageSize := 10
	if s := v.Get("page_size"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 && n <= 50 {
			pageSize = n
		}
	}
	regionID := 0
	if s := v.Get("region_id"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			regionID = n
		}
	}
	var rubricIDs []int
	if raw := strings.TrimSpace(v.Get("rubric_id")); raw != "" {
		for _, part := range strings.Split(raw, ",") {
			id, err := strconv.Atoi(strings.TrimSpace(part))
			if err != nil || id <= 0 {
				continue
			}
			rubricIDs = append(rubricIDs, id)
		}
	}

	in := model.PlacesSearchInput{
		Query:     queryStr,
		Category:  v.Get("category"),
		RegionID:  regionID,
		RubricIDs: rubricIDs,
		Lat:       lat,
		Lon:       lon,
		RadiusM:   radius,
		Locale:    v.Get("locale"),
		Page:      page,
		PageSize:  pageSize,
	}

	out, err := h.svc.SearchNearby(r.Context(), in)
	if err != nil {
		h.log.Warn("places search failed", zap.Error(err))
		if errors.Is(err, errs.CatalogAPIKeyMissing) {
			http.Error(w, "catalog API is not configured", http.StatusServiceUnavailable)
			return
		}
		http.Error(w, "upstream search failed", http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(out)
}

// GetPlaceByID handles GET /api/v1/places/item/{id}
func (h *PlacesController) GetPlaceByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "missing id", http.StatusBadRequest)
		return
	}
	locale := r.URL.Query().Get("locale")
	if locale == "" {
		locale = "ru_RU"
	}

	out, err := h.svc.GetByExternalID(r.Context(), id, locale)
	if err != nil {
		h.log.Warn("places get by id failed", zap.Error(err))
		if errors.Is(err, errs.CatalogAPIKeyMissing) {
			http.Error(w, "catalog API is not configured", http.StatusServiceUnavailable)
			return
		}
		http.Error(w, "upstream lookup failed", http.StatusBadGateway)
		return
	}
	if out == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(out)
}
