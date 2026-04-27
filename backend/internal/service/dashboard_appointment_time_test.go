package service

import (
	"testing"
	"time"
)

func TestCalculateDurationBasedEnd_UsesCurrentStartWithoutOverride(t *testing.T) {
	currentStart := time.Date(2026, 4, 27, 10, 0, 0, 0, time.UTC)

	got := calculateDurationBasedEnd(currentStart, nil, 90)
	want := time.Date(2026, 4, 27, 11, 30, 0, 0, time.UTC)

	if !got.Equal(want) {
		t.Fatalf("got %s, want %s", got, want)
	}
}

func TestCalculateDurationBasedEnd_UsesOverrideStartWhenProvided(t *testing.T) {
	currentStart := time.Date(2026, 4, 27, 10, 0, 0, 0, time.UTC)
	overrideStart := time.Date(2026, 4, 28, 13, 15, 0, 0, time.UTC)

	got := calculateDurationBasedEnd(currentStart, &overrideStart, 60)
	want := time.Date(2026, 4, 28, 14, 15, 0, 0, time.UTC)

	if !got.Equal(want) {
		t.Fatalf("got %s, want %s", got, want)
	}
}
