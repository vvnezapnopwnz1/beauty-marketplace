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

var salonTypeToParentSlugs = map[string][]string{
	"hair_salon":        {"hair", "packages"},
	"barbershop":        {"barbershop", "packages"},
	"nail_studio":       {"nails", "packages"},
	"brow_bar":          {"brows", "lashes", "permanent", "packages"},
	"lash_studio":       {"lashes", "brows", "permanent", "packages"},
	"permanent_studio":  {"permanent", "brows", "makeup", "packages"},
	"makeup_artist":     {"makeup", "hair", "packages"},
	"cosmetologist":     {"skin", "permanent", "massage", "packages"},
	"spa_massage":       {"spa", "massage", "skin", "depilation", "packages"},
	"depilation_studio": {"depilation", "packages"},
	"tanning_studio":    {"tanning", "packages"},
	"beauty_salon":      ParentSlugs,
	"individual":        ParentSlugs,
}

// ParentSlugsForSalonType returns allowed parent_slug groups for a salon type.
// Empty or unknown salonType: nil means "no restriction" (all groups).
func ParentSlugsForSalonType(salonType string) []string {
	if salonType == "" {
		return nil
	}
	parents, ok := salonTypeToParentSlugs[salonType]
	if !ok {
		return nil
	}
	if salonType == "beauty_salon" || salonType == "individual" {
		return nil
	}
	return cloneStrings(parents)
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

// ParentSlugsForSalonTypes returns union of allowed parents for many salon types.
// Empty list means no restriction (all groups).
func ParentSlugsForSalonTypes(salonTypes []string) []string {
	if len(salonTypes) == 0 {
		return nil
	}
	seen := make(map[string]struct{})
	for _, st := range salonTypes {
		if st == "beauty_salon" || st == "individual" {
			return nil
		}
		for _, p := range ParentSlugsForSalonType(st) {
			seen[p] = struct{}{}
		}
	}
	if len(seen) == 0 {
		return nil
	}
	out := make([]string, 0, len(seen))
	for _, p := range ParentSlugs {
		if _, ok := seen[p]; ok {
			out = append(out, p)
		}
	}
	return out
}

func cloneStrings(in []string) []string {
	out := make([]string, len(in))
	copy(out, in)
	return out
}
