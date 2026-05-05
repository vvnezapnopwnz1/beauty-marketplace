package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/beauty-marketplace/backend/internal/service"
)

type GeoController struct {
	svc service.GeoService
}

func NewGeoController(svc service.GeoService) *GeoController {
	return &GeoController{svc: svc}
}

func (h *GeoController) ResolveRegion(w http.ResponseWriter, r *http.Request) {
	lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	if err != nil {
		http.Error(w, "invalid lat", http.StatusBadRequest)
		return
	}
	lon, err := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
	if err != nil {
		http.Error(w, "invalid lon", http.StatusBadRequest)
		return
	}
	out, err := h.svc.ResolveRegion(r.Context(), lat, lon)
	if err != nil {
		http.Error(w, "region lookup failed", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func (h *GeoController) SearchCities(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	out, err := h.svc.SearchCities(r.Context(), q)
	if err != nil {
		http.Error(w, "city search failed", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(struct {
		Items []service.CityRegion `json:"items"`
	}{Items: out})
}

func (h *GeoController) ReverseGeocode(w http.ResponseWriter, r *http.Request) {
	lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	if err != nil {
		http.Error(w, "invalid lat", http.StatusBadRequest)
		return
	}
	lon, err := strconv.ParseFloat(r.URL.Query().Get("lon"), 64)
	if err != nil {
		http.Error(w, "invalid lon", http.StatusBadRequest)
		return
	}
	out, err := h.svc.ReverseGeocode(r.Context(), lat, lon)
	if err != nil {
		http.Error(w, "reverse geocode failed", http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}
