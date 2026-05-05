package controller

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/beauty-marketplace/backend/internal/errs"
	"github.com/beauty-marketplace/backend/internal/model"
	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
)

// SearchController handles unified search HTTP API.
type SearchController struct {
	svc service.SearchService
	log *zap.Logger
}

// NewSearchController constructs SearchController.
func NewSearchController(svc service.SearchService, log *zap.Logger) *SearchController {
	return &SearchController{svc: svc, log: log}
}

// Search handles GET /api/v1/search
func (h *SearchController) Search(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	v := r.URL.Query()

	var userLat, userLon *float64
	latStr, lonStr := v.Get("lat"), v.Get("lon")
	if latStr != "" || lonStr != "" {
		if latStr == "" || lonStr == "" {
			http.Error(w, "lat and lon must both be set or both omitted", http.StatusBadRequest)
			return
		}
		lat, err := strconv.ParseFloat(latStr, 64)
		if err != nil {
			http.Error(w, "invalid lat", http.StatusBadRequest)
			return
		}
		lon, err := strconv.ParseFloat(lonStr, 64)
		if err != nil {
			http.Error(w, "invalid lon", http.StatusBadRequest)
			return
		}
		userLat, userLon = &lat, &lon
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

	sort := v.Get("sort")
	if sort != "popular" && sort != "nearby" && sort != "rating" {
		sort = "popular"
	}

	in := model.SearchInput{
		UserLat:    userLat,
		UserLon:    userLon,
		RegionID:   0,
		Category:   v.Get("category"),
		Sort:       sort,
		OpenNow:    v.Get("open_now") == "true",
		HighRating: v.Get("high_rating") == "true",
		OnlineOnly: v.Get("online_booking") == "true",
		Page:       page,
		PageSize:   pageSize,
	}
	if s := v.Get("region_id"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			in.RegionID = n
		}
	}

	out, err := h.svc.Search(r.Context(), in)
	if err != nil {
		h.log.Warn("unified search failed", zap.Error(err))
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
