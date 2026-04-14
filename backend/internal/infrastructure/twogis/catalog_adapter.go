package twogis

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/errs"
	"github.com/yourusername/beauty-marketplace/internal/model"
	"github.com/yourusername/beauty-marketplace/internal/requestid"
	"go.uber.org/zap"
)

const searchFields = "items.point,items.reviews,items.rubrics,items.schedule,items.flags,items.attribute_groups,items.full_address_name"

const byIDFields = "items.point,items.address_name,items.full_address_name,items.reviews,items.rubrics,items.description,items.external_content,items.photos,items.ads,items.schedule,items.schedule_special,items.contact_groups,items.org,items.brand,items.alias"
const maxTwoGISPageSize = 10

// twogisResponseBodyLogMax caps JSON logged from 2GIS responses (full payloads are large).
const twogisResponseBodyLogMax = 4096

var categoryCoreRubrics = map[string][]int{
	"all":          {305, 652, 5603, 110998, 56759, 110816, 651, 110355, 58858},
	"hair":         {305, 652},
	"nails":        {5603, 652},
	"spa":          {56759},
	"barber":       {110998},
	"brows":        {110355},
	"makeup":       {58858, 652},
	"massage":      {56759, 652},
	"skin":         {652},
	"hair_removal": {110816},
}

// CatalogAdapter implements service.PlacesProvider using 2GIS Catalog API 3.0.
type CatalogAdapter struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
	log        *zap.Logger
}

// NewCatalogAdapter builds a 2GIS catalog client (implements PlacesProvider).
func NewCatalogAdapter(cfg *config.Config, log *zap.Logger) *CatalogAdapter {
	return &CatalogAdapter{
		httpClient: http.DefaultClient,
		baseURL:    "https://catalog.api.2gis.com",
		apiKey:     cfg.TwoGisAPIKey,
		log:        log,
	}
}

// SearchNearby implements PlacesProvider.
func (a *CatalogAdapter) SearchNearby(ctx context.Context, in model.PlacesSearchInput) (*model.PlacesSearchResult, error) {
	if a.apiKey == "" {
		return nil, errs.CatalogAPIKeyMissing
	}

	u, err := url.Parse(a.baseURL + "/3.0/items")
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("key", a.apiKey)
	q.Set("type", "branch")
	q.Set("search_type", "one_branch")
	q.Set("search_is_query_text_complete", "true")
	q.Set("search_nearby", "true")
	q.Set("locale", in.Locale)

	if in.HasRating {
		q.Set("has_rating", "true")
	}
	if in.HasReviews {
		q.Set("has_reviews", "true")
	}
	if in.HasPhotos {
		q.Set("has_photos", "true")
	}
	if in.WorkTimeNow {
		q.Set("work_time", "now")
	}
	switch in.Sort {
	case "popular":
		// relevance — мягкий гео-буст через location; point не нужен
		q.Set("sort", "relevance")
		q.Set("location", fmt.Sprintf("%g,%g", in.Lon, in.Lat))
	case "rating":
		q.Set("sort", "rating")
		q.Set("point", fmt.Sprintf("%g,%g", in.Lon, in.Lat))
	default: // "nearby" или пустая строка — строгая сортировка по расстоянию
		q.Set("sort", "distance")
		q.Set("point", fmt.Sprintf("%g,%g", in.Lon, in.Lat))
	}
	q.Set("radius", strconv.Itoa(in.RadiusM))
	q.Set("page", strconv.Itoa(in.Page))
	pageSize := in.PageSize
	if pageSize < 1 {
		pageSize = 1
	}
	if pageSize > maxTwoGISPageSize {
		pageSize = maxTwoGISPageSize
	}
	q.Set("page_size", strconv.Itoa(pageSize))
	q.Set("fields", searchFields)
	if strings.TrimSpace(in.Query) != "" {
		q.Set("q", in.Query)
	}
	rubricIDs := append([]int(nil), in.RubricIDs...)
	if len(rubricIDs) == 0 && in.Category != "" {
		if ids, ok := categoryCoreRubrics[in.Category]; ok {
			rubricIDs = ids
		}
	}
	if len(rubricIDs) > 0 {
		if in.RegionID > 0 {
			q.Set("region_id", strconv.Itoa(in.RegionID))
		}
		q.Set("rubric_id", joinInts(rubricIDs))
	}
	u.RawQuery = q.Encode()

	fullURL := u.String()
	reqURL := redactURLForLog(fullURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, err
	}
	requestID := requestid.FromContext(ctx)
	clientRequestID := requestid.ClientFromContext(ctx)
	clientAction := requestid.ClientActionFromContext(ctx)
	started := time.Now()
	a.log.Info("twogis outgoing request",
		zap.String("component", "twogis_adapter"),
		zap.String("request_id", requestID),
		zap.String("client_request_id", clientRequestID),
		zap.String("client_action", clientAction),
		zap.String("provider", "2gis"),
		zap.String("method", http.MethodGet),
		zap.String("endpoint", "/3.0/items"),
		zap.String("twogis_url", reqURL),
		zap.String("twogis_path", u.Path),
		zap.String("twogis_raw_query", redactRawQuery(u.RawQuery)),
		zap.String("twogis_request_body", ""),
		zap.String("category", in.Category),
		zap.Int("region_id", in.RegionID),
		zap.String("rubric_id", joinInts(rubricIDs)),
		zap.Int("page", in.Page),
		zap.Int("page_size", pageSize),
		zap.Int("radius", in.RadiusM),
		zap.Int("query_len", len(strings.TrimSpace(in.Query))),
		zap.Bool("search_nearby", true),
		zap.String("sort", in.Sort),
		zap.Bool("work_time_now", in.WorkTimeNow),
		zap.Bool("has_rating", in.HasRating),
		zap.Bool("has_reviews", in.HasReviews),
	)

	res, err := a.httpClient.Do(req)
	if err != nil {
		a.log.Warn("twogis request failed",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("client_request_id", clientRequestID),
			zap.String("client_action", clientAction),
			zap.String("provider", "2gis"),
			zap.String("endpoint", "/3.0/items"),
			zap.String("twogis_url", reqURL),
			zap.String("twogis_path", u.Path),
			zap.String("twogis_raw_query", redactRawQuery(u.RawQuery)),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
			zap.Error(err),
		)
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		upCode, upMsg := parseTwoGISError(body)
		a.log.Warn("twogis non-2xx response",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("client_request_id", clientRequestID),
			zap.String("client_action", clientAction),
			zap.String("provider", "2gis"),
			zap.String("endpoint", "/3.0/items"),
			zap.String("twogis_url", reqURL),
			zap.String("twogis_path", u.Path),
			zap.String("twogis_raw_query", redactRawQuery(u.RawQuery)),
			zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
			zap.Int("status", res.StatusCode),
			zap.Int("upstream_status", res.StatusCode),
			zap.String("upstream_error_code", upCode),
			zap.String("upstream_error_message", upMsg),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
		)
		return nil, fmt.Errorf("twogis: catalog HTTP %d: %s", res.StatusCode, truncate(body, 200))
	}

	var payload struct {
		Meta struct {
			Code int `json:"code"`
		} `json:"meta"`
		Result struct {
			Items []json.RawMessage `json:"items"`
			Total int               `json:"total"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("twogis: decode response: %w", err)
	}
	if payload.Meta.Code != 200 {
		upCode, upMsg := parseTwoGISError(body)
		a.log.Warn("twogis api code is non-200",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("client_request_id", clientRequestID),
			zap.String("client_action", clientAction),
			zap.String("provider", "2gis"),
			zap.String("endpoint", "/3.0/items"),
			zap.String("twogis_url", reqURL),
			zap.String("twogis_path", u.Path),
			zap.String("twogis_raw_query", redactRawQuery(u.RawQuery)),
			zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
			zap.Int("upstream_status", payload.Meta.Code),
			zap.String("upstream_error_code", upCode),
			zap.String("upstream_error_message", upMsg),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
		)
		return nil, fmt.Errorf("twogis: API code %d: %s", payload.Meta.Code, truncate(body, 200))
	}
	a.log.Info("twogis outgoing response",
		zap.String("component", "twogis_adapter"),
		zap.String("request_id", requestID),
		zap.String("client_request_id", clientRequestID),
		zap.String("client_action", clientAction),
		zap.String("provider", "2gis"),
		zap.String("endpoint", "/3.0/items"),
		zap.String("twogis_url", reqURL),
		zap.String("twogis_path", u.Path),
		zap.String("twogis_raw_query", redactRawQuery(u.RawQuery)),
		zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
		zap.Int("status", res.StatusCode),
		zap.Int64("duration_ms", time.Since(started).Milliseconds()),
		zap.Int("items", len(payload.Result.Items)),
		zap.Int("total", payload.Result.Total),
	)

	items := make([]model.PlaceItem, 0, len(payload.Result.Items))
	for _, raw := range payload.Result.Items {
		var w itemWire
		if err := json.Unmarshal(raw, &w); err != nil {
			continue
		}
		addr := w.AddressName
		if w.FullAddressName != "" {
			addr = w.FullAddressName
		}
		item := model.PlaceItem{
			ExternalID: w.ID,
			Name:       w.Name,
			Address:    addr,
		}
		if lat, lon, ok := parsePointJSON(w.PointRaw); ok {
			item.Lat = lat
			item.Lon = lon
		}
		r, rc := parseReviewStats(w.Reviews)
		item.Rating = r
		item.ReviewCount = rc
		item.RubricNames = rubricNamesFromWire(w.Rubrics)
		urls := mergeUniqueStringURLs(
			photoURLsFromExternal(w.ExternalContent),
			photoURLsFromPhotosJSON(w.PhotosRaw),
			extractImageURLsFromItemFragments(raw),
		)
		if len(urls) > 0 {
			u := urls[0]
			item.PhotoURL = &u
		}
		items = append(items, item)
	}

	return &model.PlacesSearchResult{
		Items: items,
		Total: payload.Result.Total,
		Meta: &model.PlacesSearchMeta{
			RegionID:         in.RegionID,
			RubricFilterUsed: len(rubricIDs) > 0,
		},
	}, nil
}

// GetByExternalID loads one branch by catalog id (2GIS items/byid).
func (a *CatalogAdapter) GetByExternalID(ctx context.Context, externalID, locale string) (*model.PlaceDetail, error) {
	if a.apiKey == "" {
		return nil, errs.CatalogAPIKeyMissing
	}
	if externalID == "" {
		return nil, fmt.Errorf("twogis: empty id")
	}
	if locale == "" {
		locale = "ru_RU"
	}

	u, err := url.Parse(a.baseURL + "/3.0/items/byid")
	if err != nil {
		return nil, err
	}
	q := u.Query()
	q.Set("key", a.apiKey)
	q.Set("id", externalID)
	q.Set("locale", locale)
	q.Set("fields", byIDFields)
	u.RawQuery = q.Encode()

	fullURL := u.String()
	reqURL := redactURLForLog(fullURL)
	requestID := requestid.FromContext(ctx)
	clientRequestID := requestid.ClientFromContext(ctx)
	clientAction := requestid.ClientActionFromContext(ctx)
	started := time.Now()

	a.log.Info("twogis outgoing request",
		zap.String("component", "twogis_adapter"),
		zap.String("request_id", requestID),
		zap.String("client_request_id", clientRequestID),
		zap.String("client_action", clientAction),
		zap.String("provider", "2gis"),
		zap.String("method", http.MethodGet),
		zap.String("endpoint", "/3.0/items/byid"),
		zap.String("twogis_url", reqURL),
		zap.String("twogis_path", u.Path),
		zap.String("twogis_raw_query", redactRawQuery(u.RawQuery)),
		zap.String("twogis_request_body", ""),
		zap.String("external_id", externalID),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, err
	}

	res, err := a.httpClient.Do(req)
	if err != nil {
		a.log.Warn("twogis byid request failed",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("client_request_id", clientRequestID),
			zap.String("client_action", clientAction),
			zap.String("twogis_url", reqURL),
			zap.String("twogis_path", u.Path),
			zap.String("twogis_raw_query", redactRawQuery(u.RawQuery)),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
			zap.Error(err),
		)
		return nil, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode == http.StatusNotFound {
		a.log.Info("twogis byid response",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("twogis_url", reqURL),
			zap.Int("status", res.StatusCode),
			zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
		)
		return nil, nil
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		a.log.Warn("twogis byid non-2xx",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("twogis_url", reqURL),
			zap.Int("status", res.StatusCode),
			zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
		)
		return nil, fmt.Errorf("twogis: byid HTTP %d: %s", res.StatusCode, truncate(body, 200))
	}

	var payload struct {
		Meta struct {
			Code int `json:"code"`
		} `json:"meta"`
		Result struct {
			Items []json.RawMessage `json:"items"`
			Total int               `json:"total"`
		} `json:"result"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("twogis: decode byid: %w", err)
	}
	if payload.Meta.Code != 200 {
		upCode, upMsg := parseTwoGISError(body)
		a.log.Warn("twogis byid api code is non-200",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("twogis_url", reqURL),
			zap.Int("upstream_status", payload.Meta.Code),
			zap.String("upstream_error_code", upCode),
			zap.String("upstream_error_message", upMsg),
			zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
		)
		return nil, fmt.Errorf("twogis: API code %d: %s", payload.Meta.Code, truncate(body, 200))
	}
	if len(payload.Result.Items) == 0 {
		a.log.Info("twogis byid response",
			zap.String("component", "twogis_adapter"),
			zap.String("request_id", requestID),
			zap.String("twogis_url", reqURL),
			zap.Int("status", res.StatusCode),
			zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
			zap.Int("items", 0),
		)
		return nil, nil
	}

	var w itemDetailWire
	if err := json.Unmarshal(payload.Result.Items[0], &w); err != nil {
		return nil, fmt.Errorf("twogis: decode item: %w", err)
	}

	d := &model.PlaceDetail{
		ExternalID:      w.ID,
		Name:            w.Name,
		Address:         w.AddressName,
		FullAddressName: w.FullAddressName,
		Description:     w.Description,
		TwoGisAlias:     w.Alias,
		PhotoURLs: mergeUniqueStringURLs(
			photoURLsFromExternal(w.ExternalContent),
			photoURLsFromPhotosJSON(w.PhotosRaw),
			extractImageURLsFromItemFragments(payload.Result.Items[0]),
		),
	}
	if d.Address == "" && d.FullAddressName != "" {
		d.Address = d.FullAddressName
	}
	if lat, lon, ok := parsePointJSON(w.PointRaw); ok {
		d.Lat = lat
		d.Lon = lon
	}
	r, rc := parseReviewStats(w.Reviews)
	d.Rating = r
	d.ReviewCount = rc
	d.RubricNames = rubricNamesFromWire(w.Rubrics)
	if w.Org != nil {
		d.OrgName = w.Org.Name
	}
	if w.Brand != nil {
		d.BrandName = w.Brand.Name
	}
	if w.Schedule != nil {
		d.Schedule247 = w.Schedule.Is247
		if w.Schedule.Comment != "" {
			d.ScheduleComment = w.Schedule.Comment
		}
		d.WeeklySchedule = scheduleWeekdays(w.Schedule)
	}
	d.Contacts = flattenContacts(w.ContactGroups)

	a.log.Info("twogis byid response",
		zap.String("component", "twogis_adapter"),
		zap.String("request_id", requestID),
		zap.String("twogis_url", reqURL),
		zap.Int("status", res.StatusCode),
		zap.String("twogis_response_body_preview", responseBodyPreview(body, twogisResponseBodyLogMax)),
		zap.Int64("duration_ms", time.Since(started).Milliseconds()),
		zap.Int("items", len(payload.Result.Items)),
		zap.Int("total", payload.Result.Total),
	)

	return d, nil
}

type externalContentWire struct {
	MainPhotoURL string `json:"main_photo_url"`
	URL          string `json:"url"`
}

type itemWire struct {
	ID              string                `json:"id"`
	Name            string                `json:"name"`
	AddressName     string                `json:"address_name"`
	FullAddressName string                `json:"full_address_name"`
	PointRaw        json.RawMessage       `json:"point"`
	Reviews         json.RawMessage       `json:"reviews"`
	Rubrics         []rubricWire          `json:"rubrics"`
	ExternalContent []externalContentWire `json:"external_content"`
	PhotosRaw       json.RawMessage       `json:"photos"`
}

type itemDetailWire struct {
	ID              string                `json:"id"`
	Name            string                `json:"name"`
	AddressName     string                `json:"address_name"`
	FullAddressName string                `json:"full_address_name"`
	Description     string                `json:"description"`
	Alias           string                `json:"alias"`
	PointRaw        json.RawMessage       `json:"point"`
	Reviews         json.RawMessage       `json:"reviews"`
	Rubrics         []rubricWire          `json:"rubrics"`
	ExternalContent []externalContentWire `json:"external_content"`
	PhotosRaw       json.RawMessage       `json:"photos"`
	Schedule        *scheduleWire         `json:"schedule"`
	Org             *struct {
		Name string `json:"name"`
	} `json:"org"`
	Brand *struct {
		Name string `json:"name"`
	} `json:"brand"`
	ContactGroups []struct {
		Name     string `json:"name"`
		Comment  string `json:"comment"`
		Contacts []struct {
			Type  string `json:"type"`
			Value string `json:"value"`
			Text  string `json:"text"`
		} `json:"contacts"`
	} `json:"contact_groups"`
}

type rubricWire struct {
	Name string `json:"name"`
}

type scheduleWire struct {
	Is247   bool   `json:"is_24x7"`
	Comment string `json:"comment"`
	Mon     *dayWH `json:"Mon"`
	Tue     *dayWH `json:"Tue"`
	Wed     *dayWH `json:"Wed"`
	Thu     *dayWH `json:"Thu"`
	Fri     *dayWH `json:"Fri"`
	Sat     *dayWH `json:"Sat"`
	Sun     *dayWH `json:"Sun"`
}

type dayWH struct {
	WorkingHours []struct {
		From *string `json:"from"`
		To   *string `json:"to"`
	} `json:"working_hours"`
}

// parsePointJSON извлекает WGS84 lat/lon из поля items.point ответа Catalog API 3.0.
// Во входных параметрах 2GIS везде использует порядок lon,lat; в строковом point в ответе — тоже "lon,lat".
// GeoJSON Point задаёт coordinates как [lon, lat].
func parsePointJSON(raw json.RawMessage) (lat, lon float64, ok bool) {
	if len(raw) == 0 {
		return 0, 0, false
	}
	switch raw[0] {
	case '{':
		var gj struct {
			Type        string    `json:"type"`
			Coordinates []float64 `json:"coordinates"`
		}
		if json.Unmarshal(raw, &gj) == nil && gj.Type == "Point" && len(gj.Coordinates) >= 2 {
			lon, lat = gj.Coordinates[0], gj.Coordinates[1]
			if validWGS84(lat, lon) {
				return lat, lon, true
			}
		}
		var o struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		}
		if json.Unmarshal(raw, &o) == nil && validWGS84(o.Lat, o.Lon) && (math.Abs(o.Lat) > 1e-9 || math.Abs(o.Lon) > 1e-9) {
			return o.Lat, o.Lon, true
		}
		return 0, 0, false
	case '"':
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return 0, 0, false
		}
		parts := strings.Split(s, ",")
		if len(parts) != 2 {
			return 0, 0, false
		}
		lonVal, err1 := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
		latVal, err2 := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
		if err1 != nil || err2 != nil {
			return 0, 0, false
		}
		if validWGS84(latVal, lonVal) {
			return latVal, lonVal, true
		}
		return 0, 0, false
	default:
		return 0, 0, false
	}
}

func validWGS84(lat, lon float64) bool {
	return math.Abs(lat) <= 90 && math.Abs(lon) <= 180
}

func parseReviewStats(raw json.RawMessage) (rating *float64, reviewCount *int) {
	if len(raw) == 0 {
		return nil, nil
	}
	var w struct {
		Rating             interface{} `json:"rating"`
		ReviewCount        interface{} `json:"review_count"`
		GeneralReviewCount interface{} `json:"general_review_count"`
		GeneralRating      interface{} `json:"general_rating"`
	}
	if err := json.Unmarshal(raw, &w); err != nil {
		return nil, nil
	}
	rc := parseIntish(w.ReviewCount)
	if rc == nil {
		rc = parseIntish(w.GeneralReviewCount)
	}
	rStr := stringifyRating(w.Rating)
	if rStr == "" {
		rStr = stringifyRating(w.GeneralRating)
	}
	if rStr == "" {
		return nil, rc
	}
	f, err := strconv.ParseFloat(rStr, 64)
	if err != nil {
		return nil, rc
	}
	rf := f
	return &rf, rc
}

func stringifyRating(v interface{}) string {
	switch x := v.(type) {
	case string:
		return strings.TrimSpace(x)
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	case nil:
		return ""
	default:
		b, _ := json.Marshal(x)
		s := strings.Trim(string(b), `"`)
		return s
	}
}

func parseIntish(v interface{}) *int {
	switch x := v.(type) {
	case string:
		n, err := strconv.Atoi(strings.TrimSpace(x))
		if err != nil {
			return nil
		}
		return &n
	case float64:
		n := int(x)
		return &n
	case int:
		return &x
	default:
		return nil
	}
}

func rubricNamesFromWire(rubrics []rubricWire) []string {
	if len(rubrics) == 0 {
		return nil
	}
	out := make([]string, 0, len(rubrics))
	for _, r := range rubrics {
		if strings.TrimSpace(r.Name) != "" {
			out = append(out, strings.TrimSpace(r.Name))
		}
	}
	return out
}

func looksLikeImageURL(s string) bool {
	s = strings.TrimSpace(s)
	if len(s) < 12 || (!strings.HasPrefix(s, "http://") && !strings.HasPrefix(s, "https://")) {
		return false
	}
	lower := strings.ToLower(s)
	if strings.HasSuffix(lower, ".svg") && !strings.Contains(lower, "photo") {
		return false
	}
	if strings.Contains(lower, ".jpg") || strings.Contains(lower, ".jpeg") || strings.Contains(lower, ".png") ||
		strings.Contains(lower, ".webp") || strings.Contains(lower, ".gif") {
		return true
	}
	if strings.Contains(lower, "2gis.com") && (strings.Contains(lower, "photo") || strings.Contains(lower, "image") ||
		strings.Contains(lower, "cephgw") || strings.Contains(lower, ".cfm.") || strings.Contains(lower, "/pictures/")) {
		return true
	}
	return false
}

func mergeUniqueStringURLs(slices ...[]string) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, slice := range slices {
		for _, u := range slice {
			u = strings.TrimSpace(u)
			if u == "" {
				continue
			}
			if _, ok := seen[u]; ok {
				continue
			}
			seen[u] = struct{}{}
			out = append(out, u)
		}
	}
	return out
}

func photoURLsFromExternal(ext []externalContentWire) []string {
	var out []string
	for _, e := range ext {
		for _, u := range []string{e.MainPhotoURL, e.URL} {
			u = strings.TrimSpace(u)
			if u != "" && looksLikeImageURL(u) {
				out = append(out, u)
			}
		}
	}
	return out
}

func photoURLsFromPhotosJSON(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return nil
	}
	var arr []map[string]interface{}
	if err := json.Unmarshal(raw, &arr); err != nil {
		return nil
	}
	var out []string
	keys := []string{"url", "preview_url", "photo_url", "src", "href", "image_url"}
	for _, p := range arr {
		for _, k := range keys {
			s, ok := p[k].(string)
			if !ok || !looksLikeImageURL(s) {
				continue
			}
			out = append(out, strings.TrimSpace(s))
		}
	}
	return out
}

// extractImageURLsFromItemFragments walks photos, external_content, ads, group subtrees only (not whole item).
func extractImageURLsFromItemFragments(raw json.RawMessage) []string {
	var m map[string]json.RawMessage
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil
	}
	var out []string
	for _, key := range []string{"photos", "external_content", "ads", "group"} {
		b, ok := m[key]
		if !ok || len(b) == 0 {
			continue
		}
		out = mergeUniqueStringURLs(out, collectImageURLsFromJSONValue(b))
	}
	return out
}

func collectImageURLsFromJSONValue(raw json.RawMessage) []string {
	var root interface{}
	if err := json.Unmarshal(raw, &root); err != nil {
		return nil
	}
	var out []string
	seen := map[string]struct{}{}
	var walk func(interface{})
	walk = func(v interface{}) {
		switch x := v.(type) {
		case map[string]interface{}:
			for _, vv := range x {
				walk(vv)
			}
		case []interface{}:
			for _, vv := range x {
				walk(vv)
			}
		case string:
			s := strings.TrimSpace(x)
			if !looksLikeImageURL(s) {
				return
			}
			if _, ok := seen[s]; ok {
				return
			}
			seen[s] = struct{}{}
			out = append(out, s)
		}
	}
	walk(root)
	return out
}

func scheduleWeekdays(s *scheduleWire) []model.PlaceScheduleDay {
	if s == nil {
		return nil
	}
	days := []struct {
		key string
		d   *dayWH
	}{
		{"Mon", s.Mon}, {"Tue", s.Tue}, {"Wed", s.Wed}, {"Thu", s.Thu},
		{"Fri", s.Fri}, {"Sat", s.Sat}, {"Sun", s.Sun},
	}
	out := make([]model.PlaceScheduleDay, 0, 7)
	for _, pair := range days {
		if pair.d == nil || len(pair.d.WorkingHours) == 0 {
			continue
		}
		day := model.PlaceScheduleDay{Day: pair.key}
		for _, wh := range pair.d.WorkingHours {
			from := ""
			to := ""
			if wh.From != nil {
				from = *wh.From
			}
			if wh.To != nil {
				to = *wh.To
			}
			day.WorkingHours = append(day.WorkingHours, struct {
				From string `json:"from"`
				To   string `json:"to"`
			}{From: from, To: to})
		}
		out = append(out, day)
	}
	return out
}

func flattenContacts(groups []struct {
	Name     string `json:"name"`
	Comment  string `json:"comment"`
	Contacts []struct {
		Type  string `json:"type"`
		Value string `json:"value"`
		Text  string `json:"text"`
	} `json:"contacts"`
}) []model.PlaceContact {
	var out []model.PlaceContact
	for _, g := range groups {
		for _, c := range g.Contacts {
			val := strings.TrimSpace(c.Value)
			if val == "" {
				continue
			}
			label := strings.TrimSpace(c.Text)
			if label == "" {
				label = strings.TrimSpace(g.Name)
			}
			out = append(out, model.PlaceContact{
				Type:  strings.TrimSpace(c.Type),
				Value: val,
				Label: label,
			})
		}
	}
	return out
}

func joinInts(ids []int) string {
	parts := make([]string, 0, len(ids))
	for _, id := range ids {
		parts = append(parts, strconv.Itoa(id))
	}
	return strings.Join(parts, ",")
}

func redactURLForLog(raw string) string {
	pu, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	q := pu.Query()
	if q.Get("key") != "" {
		q.Set("key", "***")
		pu.RawQuery = q.Encode()
	}
	return pu.String()
}

func redactRawQuery(rawQuery string) string {
	vals, err := url.ParseQuery(rawQuery)
	if err != nil {
		return rawQuery
	}
	if vals.Get("key") != "" {
		vals.Set("key", "***")
	}
	return vals.Encode()
}

func responseBodyPreview(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "…"
}

func parseTwoGISError(body []byte) (code string, message string) {
	code = "unknown"
	message = truncate(body, 200)

	var payload struct {
		Meta struct {
			Error struct {
				Type    string `json:"type"`
				Message string `json:"message"`
			} `json:"error"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return code, message
	}
	if strings.TrimSpace(payload.Meta.Error.Type) != "" {
		code = strings.TrimSpace(payload.Meta.Error.Type)
	}
	if strings.TrimSpace(payload.Meta.Error.Message) != "" {
		message = strings.TrimSpace(payload.Meta.Error.Message)
	}
	return code, message
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "…"
}
