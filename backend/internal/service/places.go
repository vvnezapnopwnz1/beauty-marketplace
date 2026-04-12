package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/errs"
	"github.com/yourusername/beauty-marketplace/internal/model"
)

// PlacesProvider is implemented by infrastructure adapters (2GIS, Yandex, etc.).
type PlacesProvider interface {
	SearchNearby(ctx context.Context, in model.PlacesSearchInput) (*model.PlacesSearchResult, error)
	GetByExternalID(ctx context.Context, externalID, locale string) (*model.PlaceDetail, error)
}

// PlacesService validates input and delegates search to PlacesProvider.
type PlacesService interface {
	SearchNearby(ctx context.Context, in model.PlacesSearchInput) (*model.PlacesSearchResult, error)
	GetByExternalID(ctx context.Context, externalID, locale string) (*model.PlaceDetail, error)
}

type placesService struct {
	provider        PlacesProvider
	defaultRegionID int
}

// NewPlacesService constructs PlacesService.
func NewPlacesService(provider PlacesProvider, cfg *config.Config) PlacesService {
	return &placesService{
		provider:        provider,
		defaultRegionID: cfg.TwoGisRegionID,
	}
}

// categoryQueryTerms maps our CategoryId to a Russian search term that enriches
// the 2GIS query when the user has selected a specific category.
var categoryQueryTerms = map[string]string{
	"hair":         "парикмахерская",
	"nails":        "маникюр",
	"spa":          "спа",
	"barber":       "барбершоп",
	"brows":        "брови",
	"makeup":       "визаж",
	"massage":      "массаж",
	"skin":         "косметология",
	"hair_removal": "эпиляция",
}

func (s *placesService) SearchNearby(ctx context.Context, in model.PlacesSearchInput) (*model.PlacesSearchResult, error) {
	in.Query = strings.TrimSpace(in.Query)
	in.Category = strings.TrimSpace(in.Category)

	if in.Query == "" && (in.Category == "" || in.Category == "all") && len(in.RubricIDs) == 0 {
		return nil, fmt.Errorf("query is required")
	}
	if in.RadiusM <= 0 {
		in.RadiusM = 2000
	}
	if in.PageSize <= 0 {
		in.PageSize = 10
	}
	if in.PageSize > 50 {
		in.PageSize = 50
	}
	if in.Page < 1 {
		in.Page = 1
	}
	if in.Locale == "" {
		in.Locale = "ru_RU"
	}

	if in.RegionID <= 0 {
		in.RegionID = s.defaultRegionID
	}

	// Legacy relevance signal stays as a fallback if no rubric ids are available.
	if len(in.RubricIDs) == 0 {
		if term, ok := categoryQueryTerms[in.Category]; ok && in.Query != "" {
			if !strings.Contains(strings.ToLower(in.Query), strings.ToLower(term)) {
				in.Query = in.Query + " " + term
			}
		}
	}

	out, err := s.provider.SearchNearby(ctx, in)
	if err != nil {
		if errors.Is(err, errs.CatalogAPIKeyMissing) {
			return nil, err
		}
		return nil, err
	}

	if out.Meta == nil {
		out.Meta = &model.PlacesSearchMeta{}
	}
	out.Meta.RegionID = in.RegionID
	out.Meta.RubricFilterUsed = out.Meta.RubricFilterUsed || len(in.RubricIDs) > 0

	// If q+rubric combination is too strict, retry with rubric-only query.
	fallbackUsed := false
	if len(out.Items) == 0 && in.Query != "" && (len(in.RubricIDs) > 0 || (in.Category != "" && in.Category != "all")) {
		fallbackIn := in
		fallbackIn.Query = ""
		fallbackOut, fallbackErr := s.provider.SearchNearby(ctx, fallbackIn)
		if fallbackErr == nil && fallbackOut != nil && len(fallbackOut.Items) > 0 {
			out = fallbackOut
			if out.Meta == nil {
				out.Meta = &model.PlacesSearchMeta{}
			}
			out.Meta.RegionID = in.RegionID
			out.Meta.RubricFilterUsed = true
			out.Meta.FallbackMode = "rubric_only"
			fallbackUsed = true
		}
	}
	log.Printf("places_search_metrics category=%q region_id=%d query_len=%d rubric_filter=%t fallback=%t total=%d items=%d",
		in.Category, in.RegionID, len(in.Query), out.Meta.RubricFilterUsed, fallbackUsed, out.Total, len(out.Items))

	return out, nil
}

func (s *placesService) GetByExternalID(ctx context.Context, externalID, locale string) (*model.PlaceDetail, error) {
	id := strings.TrimSpace(externalID)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if locale == "" {
		locale = "ru_RU"
	}
	out, err := s.provider.GetByExternalID(ctx, id, locale)
	if err != nil {
		if errors.Is(err, errs.CatalogAPIKeyMissing) {
			return nil, err
		}
		return nil, err
	}
	return out, nil
}
