package servicecategory

import "testing"

func TestParentSlugToSearchCategory(t *testing.T) {
	cases := map[string]string{
		"hair":        "hair",
		"barbershop":  "barber",
		"packages":    "other",
		"depilation":  "spa",
		"tanning":     "other",
		"nonexistent": "other",
	}
	for in, want := range cases {
		if got := ParentSlugToSearchCategory(in); got != want {
			t.Fatalf("%q: got %q want %q", in, got, want)
		}
	}
}
