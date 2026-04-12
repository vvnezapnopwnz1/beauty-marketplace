package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/yourusername/beauty-marketplace/internal/config"
)

type CityRegion struct {
	RegionID int     `json:"regionId"`
	CityName string  `json:"cityName"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
}

type GeoService interface {
	ResolveRegion(ctx context.Context, lat, lon float64) (*CityRegion, error)
	SearchCities(ctx context.Context, q string) ([]CityRegion, error)
	ReverseGeocode(ctx context.Context, lat, lon float64) (*ReverseGeocodeResult, error)
}

type AddressLevel string

const (
	AddressLevelAddress  AddressLevel = "address"
	AddressLevelDistrict AddressLevel = "district"
	AddressLevelCity     AddressLevel = "city"
)

// ReverseGeocodeResult is a full address line from 2GIS (city, street, house).
type ReverseGeocodeResult struct {
	Formatted string       `json:"formatted"`
	Level     AddressLevel `json:"level"`
}

type geoService struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

func NewGeoService(cfg *config.Config) GeoService {
	return &geoService{
		httpClient: http.DefaultClient,
		baseURL:    "https://catalog.api.2gis.com",
		apiKey:     cfg.TwoGisAPIKey,
	}
}

func (s *geoService) ResolveRegion(ctx context.Context, lat, lon float64) (*CityRegion, error) {
	u, _ := url.Parse(s.baseURL + "/2.0/region/search")
	q := u.Query()
	q.Set("key", s.apiKey)
	q.Set("q", fmt.Sprintf("%g,%g", lon, lat))
	u.RawQuery = q.Encode()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	res, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("region search failed: %s", string(body))
	}
	var payload struct {
		Result struct {
			Items []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"items"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &payload); err != nil || len(payload.Result.Items) == 0 {
		return nil, fmt.Errorf("region search decode failed")
	}
	id, _ := strconv.Atoi(payload.Result.Items[0].ID)
	return &CityRegion{RegionID: id, CityName: payload.Result.Items[0].Name, Lat: lat, Lon: lon}, nil
}

func (s *geoService) SearchCities(ctx context.Context, text string) ([]CityRegion, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, nil
	}
	u, _ := url.Parse(s.baseURL + "/2.0/region/search")
	q := u.Query()
	q.Set("key", s.apiKey)
	q.Set("q", text)
	u.RawQuery = q.Encode()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	res, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, nil
	}
	var payload struct {
		Result struct {
			Items []struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"items"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, nil
	}
	out := make([]CityRegion, 0, len(payload.Result.Items))
	for _, it := range payload.Result.Items {
		id, err := strconv.Atoi(it.ID)
		if err != nil {
			continue
		}
		out = append(out, CityRegion{RegionID: id, CityName: it.Name})
	}
	return out, nil
}

// ReverseGeocode uses 2GIS: сначала /3.0/items/geocode, затем ближайшее здание в /3.0/items с region_id.
// Если оба варианта не дали строку — только название города из region/search (часто одно слово, напр. «Москва»).
func (s *geoService) ReverseGeocode(ctx context.Context, lat, lon float64) (*ReverseGeocodeResult, error) {
	if strings.TrimSpace(s.apiKey) == "" {
		return nil, fmt.Errorf("2GIS API key is not configured")
	}
	line, errGeocode := s.reverseGeocode2GIS(ctx, lat, lon)
	if errGeocode == nil && strings.TrimSpace(line) != "" {
		trimmed := strings.TrimSpace(line)
		return &ReverseGeocodeResult{Formatted: trimmed, Level: classifyAddressLevel(trimmed)}, nil
	}

	reg, errReg := s.ResolveRegion(ctx, lat, lon)
	if errReg != nil {
		if errGeocode != nil {
			return nil, fmt.Errorf("2gis geocode: %v; region: %w", errGeocode, errReg)
		}
		return nil, errReg
	}

	line2, _ := s.reverseGeocodeNearbyBuilding(ctx, lat, lon, reg.RegionID)
	if strings.TrimSpace(line2) != "" {
		trimmed := strings.TrimSpace(line2)
		return &ReverseGeocodeResult{Formatted: trimmed, Level: classifyAddressLevel(trimmed)}, nil
	}
	trimmedCity := strings.TrimSpace(reg.CityName)
	return &ReverseGeocodeResult{Formatted: trimmedCity, Level: AddressLevelCity}, nil
}

func (s *geoService) reverseGeocode2GIS(ctx context.Context, lat, lon float64) (string, error) {
	u, err := url.Parse(s.baseURL + "/3.0/items/geocode")
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("key", s.apiKey)
	q.Set("lat", fmt.Sprintf("%.7f", lat))
	q.Set("lon", fmt.Sprintf("%.7f", lon))
	q.Set("locale", "ru_RU")
	// radius в метрах — при 0 у части ключей список объектов пустой
	q.Set("radius", "150")
	q.Set("fields", "items.full_address_name,items.address_name,items.name")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", err
	}
	res, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("2gis geocode http %d: %s", res.StatusCode, truncateBody(body))
	}
	var envelope struct {
		Meta struct {
			Code  int    `json:"code"`
			Error *struct {
				Message string `json:"message"`
			} `json:"error"`
		} `json:"meta"`
		Result struct {
			Items []struct {
				Name            string `json:"name"`
				FullAddressName string `json:"full_address_name"`
				AddressName     string `json:"address_name"`
			} `json:"items"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return "", err
	}
	if envelope.Meta.Code != 200 {
		msg := "geocoder error"
		if envelope.Meta.Error != nil && envelope.Meta.Error.Message != "" {
			msg = envelope.Meta.Error.Message
		}
		return "", fmt.Errorf("2gis geocode meta code %d: %s", envelope.Meta.Code, msg)
	}
	for _, it := range envelope.Result.Items {
		if pick := firstNonEmpty(it.FullAddressName, it.AddressName); pick != "" && isAddressLike(pick) {
			return pick, nil
		}
	}
	for _, it := range envelope.Result.Items {
		if pick := firstNonEmpty(it.FullAddressName, it.AddressName); pick != "" {
			return pick, nil
		}
	}
	for _, it := range envelope.Result.Items {
		if pick := firstNonEmpty(it.Name); pick != "" && !isLikelyDistrictOrArea(pick) {
			return pick, nil
		}
	}
	return "", fmt.Errorf("2gis geocode: empty items")
}

// reverseGeocodeNearbyBuilding — ближайшее здание в точке (когда geocode не вернул адрес).
func (s *geoService) reverseGeocodeNearbyBuilding(ctx context.Context, lat, lon float64, regionID int) (string, error) {
	u, err := url.Parse(s.baseURL + "/3.0/items")
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("key", s.apiKey)
	q.Set("point", fmt.Sprintf("%g,%g", lon, lat))
	q.Set("radius", "200")
	q.Set("type", "building")
	if regionID > 0 {
		q.Set("region_id", strconv.Itoa(regionID))
	}
	q.Set("fields", "items.full_address_name,items.address_name,items.name")
	q.Set("page_size", "10")
	q.Set("locale", "ru_RU")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", err
	}
	res, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return "", err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return "", fmt.Errorf("2gis items http %d: %s", res.StatusCode, truncateBody(body))
	}
	var envelope struct {
		Meta struct {
			Code int `json:"code"`
		} `json:"meta"`
		Result struct {
			Items []struct {
				Name            string `json:"name"`
				FullAddressName string `json:"full_address_name"`
				AddressName     string `json:"address_name"`
			} `json:"items"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return "", err
	}
	if envelope.Meta.Code != 200 {
		return "", fmt.Errorf("2gis items meta code %d", envelope.Meta.Code)
	}
	for _, it := range envelope.Result.Items {
		if pick := firstNonEmpty(it.FullAddressName, it.AddressName); pick != "" {
			return pick, nil
		}
	}
	for _, it := range envelope.Result.Items {
		if strings.TrimSpace(it.Name) != "" {
			return it.Name, nil
		}
	}
	return "", fmt.Errorf("2gis items: empty items")
}

func firstNonEmpty(s ...string) string {
	for _, x := range s {
		if t := strings.TrimSpace(x); t != "" {
			return t
		}
	}
	return ""
}

func classifyAddressLevel(s string) AddressLevel {
	if isAddressLike(s) {
		return AddressLevelAddress
	}
	if isLikelyDistrictOrArea(s) {
		return AddressLevelDistrict
	}
	return AddressLevelCity
}

func isAddressLike(s string) bool {
	v := strings.ToLower(strings.TrimSpace(s))
	if v == "" {
		return false
	}
	if strings.ContainsAny(v, "0123456789") {
		return true
	}
	streetTokens := []string{
		"ул", "улица", "просп", "проспект", "пер", "переул", "шоссе",
		"набереж", "бульвар", "площад", "дом", "д.", "аллея", "проезд",
	}
	for _, tok := range streetTokens {
		if strings.Contains(v, tok) {
			return true
		}
	}
	return false
}

func isLikelyDistrictOrArea(s string) bool {
	v := strings.ToLower(strings.TrimSpace(s))
	if v == "" {
		return false
	}
	districtTokens := []string{
		"район", "округ", "поселение", "микрорайон", "квартал",
	}
	for _, tok := range districtTokens {
		if strings.Contains(v, tok) {
			return true
		}
	}
	words := strings.Fields(v)
	if len(words) <= 2 && !strings.Contains(v, ",") && !strings.ContainsAny(v, "0123456789") {
		return true
	}
	return false
}

func truncateBody(b []byte) string {
	const max = 512
	if len(b) <= max {
		return string(b)
	}
	return string(b[:max]) + "…"
}
