package service

import (
	"context"
	"math"

	"strings"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/model"
	"github.com/yourusername/beauty-marketplace/internal/repository"
	"go.uber.org/zap"
)

const (
	defaultSearchLat  = 55.7558
	defaultSearchLon  = 37.6176
	catalogSource2GIS = "2gis"
)

func radiusForSort(sort string) int {
	switch sort {
	case "rating":
		return 10000
	case "popular":
		return 5000
	default: // "nearby"
		return 3000
	}
}

var categoryQuery = map[string]string{
	"all":          "салон красоты",
	"hair":         "парикмахерская",
	"nails":        "маникюр педикюр",
	"spa":          "спа салон",
	"barber":       "барбершоп",
	"brows":        "брови ресницы",
	"makeup":       "макияж визажист",
	"massage":      "массаж",
	"skin":         "косметология",
	"hair_removal": "эпиляция",
}

var rubricCategory = map[string]string{
	"Парикмахерская":       "hair",
	"Салон красоты":        "hair",
	"Стрижка":              "hair",
	"Барбершоп":            "barber",
	"Мужская стрижка":      "barber",
	"Маникюр":              "nails",
	"Педикюр":              "nails",
	"Ногтевой сервис":      "nails",
	"СПА":                  "spa",
	"Спа-салон":            "spa",
	"Баня":                 "spa",
	"Брови":                "brows",
	"Оформление бровей":    "brows",
	"Ламинирование ресниц": "brows",
	"Макияж":               "makeup",
	"Визажист":             "makeup",
	"Перманентный макияж":  "makeup",
	"Массаж":               "massage",
	"Массажный салон":      "massage",
	"Косметология":         "skin",
	"Уход за лицом":        "skin",
	"Эпиляция":             "hair_removal",
	"Лазерная эпиляция":    "hair_removal",
}

// SearchService runs 2GIS-first unified search with DB enrichment.
type SearchService interface {
	Search(ctx context.Context, in model.SearchInput) (*model.SearchResult, error)
}

type searchService struct {
	places PlacesService
	salons repository.SalonRepository
	log    *zap.Logger
}

// NewSearchService constructs SearchService.
func NewSearchService(places PlacesService, salons repository.SalonRepository, log *zap.Logger) SearchService {
	return &searchService{places: places, salons: salons, log: log}
}

func isSpamRubric(r string) bool {
	r = strings.ToLower(r)
	return strings.Contains(r, "торговый центр") ||
		strings.Contains(r, "бизнес-центр") ||
		strings.Contains(r, "торгово-развлекательный") ||
		strings.Contains(r, "торговый комплекс")
}

func isSpamName(n string) bool {
	n = strings.ToLower(n)
	return strings.Contains(n, "тц ") || strings.HasPrefix(n, "тц") ||
		strings.Contains(n, "бц ") || strings.HasPrefix(n, "бц") ||
		strings.Contains(n, "трц ") || strings.HasPrefix(n, "трц")
}

func categoryFromRubrics(names []string) string {
	for _, n := range names {
		if cat, ok := rubricCategory[n]; ok {
			return cat
		}
	}
	return "hair"
}

func serviceLinesToDTO(lines []model.ServiceLine) []model.ServiceDTO {
	out := make([]model.ServiceDTO, 0, len(lines))
	for _, srv := range lines {
		price := 0
		if srv.PriceCents != nil {
			price = int(*srv.PriceCents)
		}
		out = append(out, model.ServiceDTO{
			ID:              srv.ID,
			Name:            srv.Name,
			DurationMinutes: srv.DurationMinutes,
			PriceCents:      price,
		})
	}
	return out
}

func (s *searchService) Search(ctx context.Context, in model.SearchInput) (*model.SearchResult, error) {
	searchLat, searchLon := defaultSearchLat, defaultSearchLon
	if in.UserLat != nil && in.UserLon != nil {
		searchLat, searchLon = *in.UserLat, *in.UserLon
	}

	cat := in.Category
	if cat == "" || cat == "all" {
		cat = "hair"
	}
	q, ok := categoryQuery[cat]
	if !ok {
		cat = "hair"
		q = categoryQuery["hair"]
	}

	page := in.Page
	if page < 1 {
		page = 1
	}
	pageSize := in.PageSize
	if pageSize < 1 {
		pageSize = 10
	}

	placesIn := model.PlacesSearchInput{
		Query:       q,
		Category:    cat,
		RegionID:    in.RegionID,
		Lat:         searchLat,
		Lon:         searchLon,
		RadiusM:     radiusForSort(in.Sort),
		Locale:      "ru_RU",
		Page:        page,
		PageSize:    pageSize,
		Sort:        in.Sort,
		WorkTimeNow: in.OpenNow,
		HasRating:   in.HighRating,
	}

	out, err := s.places.SearchNearby(ctx, placesIn)
	if err != nil {
		return nil, err
	}

	itemsBeforeFilter := len(out.Items)

	var filteredItems []model.PlaceItem
	for _, p := range out.Items {
		dropReason := ""
		for _, r := range p.RubricNames {
			if isSpamRubric(r) {
				dropReason = "spam_rubric"
				break
			}
		}
		if dropReason == "" && isSpamName(p.Name) {
			dropReason = "spam_name"
		}

		if dropReason != "" {
			s.log.Info("dropped search item",
				zap.String("component", "search_filter"),
				zap.String("drop_reason", dropReason),
				zap.String("external_id", p.ExternalID),
				zap.String("name", p.Name),
				zap.Strings("rubrics", p.RubricNames),
			)
			continue
		}
		filteredItems = append(filteredItems, p)
	}
	var deduplicatedItems []model.PlaceItem
	seenExtIDs := make(map[string]struct{})

	for _, p := range filteredItems {
		if _, ok := seenExtIDs[p.ExternalID]; ok {
			s.log.Info("dropped search item",
				zap.String("component", "search_filter"),
				zap.String("drop_reason", "duplicate_external_id"),
				zap.String("external_id", p.ExternalID),
				zap.String("name", p.Name),
			)
			continue
		}
		seenExtIDs[p.ExternalID] = struct{}{}
		deduplicatedItems = append(deduplicatedItems, p)
	}
	out.Items = deduplicatedItems

	itemsAfterDedup := len(deduplicatedItems)
	dedupRemoved := len(filteredItems) - itemsAfterDedup
	spamRemoved := itemsBeforeFilter - len(filteredItems)

	s.log.Info("search filtering completed",
		zap.String("component", "search_filter"),
		zap.Int("items_before_filter", itemsBeforeFilter),
		zap.Int("items_after_filter", itemsAfterDedup),
		zap.Int("dedup_removed", dedupRemoved),
		zap.Int("spam_removed", spamRemoved),
	)

	ids := make([]string, 0, len(out.Items))
	for _, it := range out.Items {
		if it.ExternalID != "" {
			ids = append(ids, it.ExternalID)
		}
	}

	salons, err := s.salons.FindByExternalIDs(ctx, catalogSource2GIS, ids)
	if err != nil {
		return nil, err
	}

	byExt := make(map[string]*model.Salon, len(salons))
	salonUUIDs := make([]uuid.UUID, 0, len(salons))
	for i := range salons {
		sal := &salons[i]
		ext, ok := sal.ExternalIDs[catalogSource2GIS]
		if !ok || ext == "" {
			continue
		}
		byExt[ext] = sal
		salonUUIDs = append(salonUUIDs, sal.ID)
	}

	servicesBySalon, err := s.salons.FindServicesBySalonIDs(ctx, salonUUIDs)
	if err != nil {
		return nil, err
	}

	hasUserGeo := in.UserLat != nil && in.UserLon != nil
	items := make([]model.SearchResultItem, 0, len(out.Items))
	for _, p := range out.Items {
		item := model.SearchResultItem{
			ExternalID:  p.ExternalID,
			Name:        p.Name,
			Address:     p.Address,
			Lat:         p.Lat,
			Lon:         p.Lon,
			PhotoURL:    p.PhotoURL,
			Rating:      p.Rating,
			ReviewCount: p.ReviewCount,
			RubricNames: append([]string(nil), p.RubricNames...),
			DistanceKm:  0,
			Category:    categoryFromRubrics(p.RubricNames),
		}

		if hasUserGeo {
			d := HaversineKm(*in.UserLat, *in.UserLon, p.Lat, p.Lon)
			item.DistanceKm = math.Round(d*10) / 10
		}

		if sal, ok := byExt[p.ExternalID]; ok {
			sid := sal.ID.String()
			item.SalonID = &sid
			item.OnlineBooking = sal.OnlineBookingEnabled
			if lines, ok := servicesBySalon[sal.ID]; ok {
				item.Services = serviceLinesToDTO(lines)
			}
		}

		items = append(items, item)
	}

	if in.HighRating || in.OnlineOnly {
		filtered := items[:0]
		for _, item := range items {
			if in.HighRating && (item.Rating == nil || *item.Rating < 4.5) {
				continue
			}
			if in.OnlineOnly && !item.OnlineBooking {
				continue
			}
			filtered = append(filtered, item)
		}
		items = filtered
	}

	return &model.SearchResult{Items: items, Total: out.Total}, nil
}
