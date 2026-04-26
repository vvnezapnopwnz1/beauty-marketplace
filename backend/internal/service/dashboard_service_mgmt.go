package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"github.com/yourusername/beauty-marketplace/internal/servicecategory"
	"gorm.io/gorm"
)

func (s *dashboardService) ListServices(ctx context.Context, salonID uuid.UUID) ([]model.SalonService, error) {
	return s.dash.ListServices(ctx, salonID)
}

func (s *dashboardService) ListServiceCategories(ctx context.Context, salonID uuid.UUID, fullList bool) (*ServiceCategoriesResponse, error) {
	rows, err := s.dash.ListSystemServiceCategories(ctx)
	if err != nil {
		return nil, err
	}
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return nil, err
	}
	if salon == nil {
		return nil, gorm.ErrRecordNotFound
	}
	scopes, err := s.salonCategoryScopes(ctx, salon)
	if err != nil {
		return nil, err
	}
	allowed := scopes
	if !fullList && allowed != nil {
		filtered := make([]model.ServiceCategory, 0, len(rows))
		for _, r := range rows {
			if servicecategory.ParentAllowedForSalonType(r.ParentSlug, allowed) {
				filtered = append(filtered, r)
			}
		}
		rows = filtered
	}
	byParent := make(map[string][]model.ServiceCategory)
	for _, r := range rows {
		byParent[r.ParentSlug] = append(byParent[r.ParentSlug], r)
	}
	out := &ServiceCategoriesResponse{
		SalonType:           salon.SalonType,
		SalonCategoryScopes: normalizeParentSlugs(scopes),
		Groups:              make([]ServiceCategoryGroupDTO, 0),
	}
	for _, ps := range servicecategory.ParentSlugs {
		items := byParent[ps]
		if len(items) == 0 {
			continue
		}
		g := ServiceCategoryGroupDTO{
			ParentSlug: ps,
			Label:      servicecategory.ParentSlugLabelRu(ps),
			Items:      make([]ServiceCategoryItemDTO, 0, len(items)),
		}
		for _, it := range items {
			g.Items = append(g.Items, ServiceCategoryItemDTO{
				Slug: it.Slug, NameRu: it.NameRu, ParentSlug: it.ParentSlug, SortOrder: it.SortOrder,
			})
		}
		out.Groups = append(out.Groups, g)
	}
	return out, nil
}

func (s *dashboardService) applyServiceCategory(ctx context.Context, salonID uuid.UUID, in ServiceInput, row *model.SalonService, isUpdate bool) error {
	slug := trimSpace(in.CategorySlug)
	if slug == "" && isUpdate && row.CategorySlug != nil && trimSpace(*row.CategorySlug) != "" {
		slug = *row.CategorySlug
	}
	if slug == "" {
		if in.Category != nil && trimSpace(*in.Category) != "" {
			row.Category = in.Category
			row.CategorySlug = nil
			return nil
		}
		if isUpdate {
			return nil
		}
		return fmt.Errorf("categorySlug is required")
	}
	cat, err := s.dash.GetSystemServiceCategoryBySlug(ctx, slug)
	if err != nil {
		return err
	}
	if cat == nil {
		return fmt.Errorf("unknown category slug")
	}
	salon, err := s.dash.FindSalonModel(ctx, salonID)
	if err != nil {
		return err
	}
	allowed, err := s.salonCategoryScopes(ctx, salon)
	if err != nil {
		return err
	}
	if !in.AllowAllCategories && !servicecategory.ParentAllowedForSalonType(cat.ParentSlug, allowed) {
		return fmt.Errorf("category not allowed for salon type; use allowAllCategories to pick from full list")
	}
	name := cat.NameRu
	row.CategorySlug = &slug
	row.Category = &name
	return nil
}

func (s *dashboardService) salonCategoryScopes(ctx context.Context, salon *model.Salon) ([]string, error) {
	if salon == nil {
		return nil, nil
	}
	scopes, err := s.dash.ListSalonCategoryScopes(ctx, salon.ID)
	if err != nil {
		return nil, err
	}
	scopes = normalizeParentSlugs(scopes)
	if len(scopes) > 0 {
		return scopes, nil
	}
	st := ""
	if salon.SalonType != nil {
		st = *salon.SalonType
	}
	return servicecategory.ParentSlugsForSalonType(st), nil
}

func normalizeParentSlugs(in []string) []string {
	if len(in) == 0 {
		return nil
	}
	known := make(map[string]struct{}, len(in))
	for _, slug := range in {
		known[slug] = struct{}{}
	}
	out := make([]string, 0, len(in))
	for _, slug := range servicecategory.ParentSlugs {
		if _, ok := known[slug]; ok {
			out = append(out, slug)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (s *dashboardService) ServiceStaffNamesMap(ctx context.Context, salonID uuid.UUID) (map[uuid.UUID][]string, error) {
	return s.dash.ServiceStaffNamesMap(ctx, salonID)
}

func (s *dashboardService) CreateService(ctx context.Context, salonID uuid.UUID, in ServiceInput) (*model.SalonService, error) {
	if trimSpace(in.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}
	if in.DurationMinutes <= 0 {
		return nil, fmt.Errorf("duration must be positive")
	}
	svc := &model.SalonService{
		SalonID:         salonID,
		Name:            trimSpace(in.Name),
		Category:        in.Category,
		Description:     in.Description,
		DurationMinutes: in.DurationMinutes,
		PriceCents:      in.PriceCents,
		IsActive:        in.IsActive,
		SortOrder:       in.SortOrder,
	}
	if err := s.applyServiceCategory(ctx, salonID, in, svc, false); err != nil {
		return nil, err
	}
	if err := s.dash.CreateService(ctx, svc); err != nil {
		return nil, err
	}
	if len(in.StaffIDs) > 0 {
		if err := s.dash.ReplaceServiceStaff(ctx, salonID, svc.ID, dedupeUUIDs(in.StaffIDs)); err != nil {
			return nil, err
		}
	}
	return svc, nil
}

func (s *dashboardService) UpdateService(ctx context.Context, salonID, serviceID uuid.UUID, in ServiceInput) (*model.SalonService, error) {
	svc, err := s.dash.GetService(ctx, salonID, serviceID)
	if err != nil {
		return nil, err
	}
	if svc == nil {
		return nil, gorm.ErrRecordNotFound
	}
	if trimSpace(in.Name) != "" {
		svc.Name = trimSpace(in.Name)
	}
	if in.DurationMinutes > 0 {
		svc.DurationMinutes = in.DurationMinutes
	}
	svc.Description = in.Description
	if err := s.applyServiceCategory(ctx, salonID, in, svc, true); err != nil {
		return nil, err
	}
	svc.PriceCents = in.PriceCents
	svc.IsActive = in.IsActive
	svc.SortOrder = in.SortOrder
	if err := s.dash.UpdateService(ctx, svc); err != nil {
		return nil, err
	}
	if in.StaffIDs != nil {
		if err := s.dash.ReplaceServiceStaff(ctx, salonID, serviceID, dedupeUUIDs(in.StaffIDs)); err != nil {
			return nil, err
		}
	}
	return svc, nil
}

func (s *dashboardService) DeleteService(ctx context.Context, salonID, serviceID uuid.UUID) error {
	err := s.dash.SoftDeleteService(ctx, salonID, serviceID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return err
}
