// Package servicecategory holds dashboard taxonomy helpers (see docs/service-categories.md).
// Not coupled to 2GIS or external catalog rubrics.
package servicecategory

// ParentSlugs lists all parent_slug values in display order.
var ParentSlugs = []string{
	"hair", "barbershop", "nails", "brows", "lashes", "permanent", "makeup",
	"skin", "massage", "spa", "depilation", "tanning", "teeth", "packages",
}

// SalonTypeSlugs are valid values for salons.salon_type (column "salon_type slug" in the doc).
var SalonTypeSlugs = []string{
	"hair_salon",
	"barbershop",
	"nail_studio",
	"brow_bar",
	"lash_studio",
	"permanent_studio",
	"makeup_artist",
	"cosmetologist",
	"spa_massage",
	"depilation_studio",
	"tanning_studio",
	"beauty_salon",
	"individual",
}

// ParentSlugsForSalonType returns allowed parent_slug groups for a salon type.
// Empty or unknown salonType: nil means "no restriction" (all groups).
func ParentSlugsForSalonType(salonType string) []string {
	switch salonType {
	case "beauty_salon", "individual":
		return nil
	case "hair_salon":
		return []string{"hair", "packages"}
	case "barbershop":
		return []string{"barbershop", "packages"}
	case "nail_studio":
		return []string{"nails", "packages"}
	case "brow_bar":
		return []string{"brows", "lashes", "permanent", "packages"}
	case "lash_studio":
		return []string{"lashes", "brows", "permanent", "packages"}
	case "permanent_studio":
		return []string{"permanent", "brows", "makeup", "packages"}
	case "makeup_artist":
		return []string{"makeup", "hair", "packages"}
	case "cosmetologist":
		return []string{"skin", "permanent", "massage", "packages"}
	case "spa_massage":
		return []string{"spa", "massage", "skin", "depilation", "packages"}
	case "depilation_studio":
		return []string{"depilation", "packages"}
	case "tanning_studio":
		return []string{"tanning", "packages"}
	default:
		return nil
	}
}

// ValidSalonType returns true for empty string or a documented salon_type slug.
func ValidSalonType(s string) bool {
	if s == "" {
		return true
	}
	for _, x := range SalonTypeSlugs {
		if x == s {
			return true
		}
	}
	return false
}

// ParentAllowedForSalonType checks if parent_slug is allowed for a strict salon type.
// When allowedParents is nil, all parents are allowed.
func ParentAllowedForSalonType(parent string, allowedParents []string) bool {
	if allowedParents == nil {
		return true
	}
	for _, p := range allowedParents {
		if p == parent {
			return true
		}
	}
	return false
}
