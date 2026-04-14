package servicecategory

// ParentSlugToSearchCategory maps dashboard parent_slug to marketplace search facet (see docs/service-categories.md).
// Kept separate from dashboard DB rows; 2GIS uses its own rubric mapping in twogis.CatalogAdapter.
func ParentSlugToSearchCategory(parentSlug string) string {
	switch parentSlug {
	case "hair":
		return "hair"
	case "barbershop":
		return "barber"
	case "nails":
		return "nails"
	case "brows":
		return "brows"
	case "lashes":
		return "lashes"
	case "permanent":
		return "brows"
	case "makeup":
		return "makeup"
	case "skin", "massage", "spa", "depilation":
		return "spa"
	case "tanning", "teeth", "packages":
		return "other"
	default:
		return "other"
	}
}
