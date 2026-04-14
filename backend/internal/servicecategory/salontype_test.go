package servicecategory

import (
	"testing"
)

func TestParentSlugsForSalonType_all(t *testing.T) {
	got := ParentSlugsForSalonType("beauty_salon")
	if got != nil {
		t.Fatalf("beauty_salon: want nil (unrestricted), got %v", got)
	}
	got = ParentSlugsForSalonType("individual")
	if got != nil {
		t.Fatalf("individual: want nil, got %v", got)
	}
	got = ParentSlugsForSalonType("")
	if got != nil {
		t.Fatalf("empty: want nil, got %v", got)
	}
	got = ParentSlugsForSalonType("unknown")
	if got != nil {
		t.Fatalf("unknown: want nil, got %v", got)
	}
}

func TestParentSlugsForSalonType_makeupArtist(t *testing.T) {
	got := ParentSlugsForSalonType("makeup_artist")
	want := []string{"makeup", "hair", "packages"}
	if len(got) != len(want) {
		t.Fatalf("len=%d want %d", len(got), len(want))
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("idx %d: got %q want %q", i, got[i], want[i])
		}
	}
}

func TestSalonTypeSlugs_count(t *testing.T) {
	if len(SalonTypeSlugs) != 13 {
		t.Fatalf("expected 13 salon types, got %d", len(SalonTypeSlugs))
	}
}

func TestParentSlugs_count(t *testing.T) {
	if len(ParentSlugs) != 14 {
		t.Fatalf("expected 14 parent slugs, got %d", len(ParentSlugs))
	}
}
