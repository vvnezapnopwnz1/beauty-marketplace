package service

import "testing"

func TestApplyTotalUpdate_CalculatedAddService(t *testing.T) {
	current := computeTotalState(2000, "calculated", nil, nil)
	next := applyTotalUpdate(current, 3500, appointmentTotalUpdate{ServicesUpdated: true})
	if next.TotalCents != 3500 || next.TotalSource != "calculated" || next.ManualDeltaCents != 0 {
		t.Fatalf("unexpected calculated add result: %+v", next)
	}
}

func TestApplyTotalUpdate_ManualAddServiceKeepsDelta(t *testing.T) {
	total := int64(2500)
	current := computeTotalState(2000, "manual", &total, nil)
	next := applyTotalUpdate(current, 3500, appointmentTotalUpdate{ServicesUpdated: true})
	if next.TotalCents != 4000 {
		t.Fatalf("expected 4000, got %d", next.TotalCents)
	}
	if next.ManualDeltaCents != 500 || next.TotalSource != "manual" {
		t.Fatalf("unexpected manual add result: %+v", next)
	}
}

func TestApplyTotalUpdate_ManualRemoveServiceKeepsDelta(t *testing.T) {
	total := int64(4500)
	delta := int64(500)
	current := computeTotalState(4000, "manual", &total, &delta)
	next := applyTotalUpdate(current, 3300, appointmentTotalUpdate{ServicesUpdated: true})
	if next.TotalCents != 3800 {
		t.Fatalf("expected 3800, got %d", next.TotalCents)
	}
	if next.ManualDeltaCents != 500 || next.TotalSource != "manual" {
		t.Fatalf("unexpected manual remove result: %+v", next)
	}
}

func TestApplyTotalUpdate_ManualRemoveLastServiceResetsToZero(t *testing.T) {
	total := int64(2500)
	delta := int64(500)
	current := computeTotalState(2000, "manual", &total, &delta)
	next := applyTotalUpdate(current, 0, appointmentTotalUpdate{
		ServicesUpdated:          true,
		ResetToCalculatedIfEmpty: true,
	})
	if next.TotalCents != 0 || next.ManualDeltaCents != 0 || next.TotalSource != "calculated" {
		t.Fatalf("unexpected last service result: %+v", next)
	}
}

func TestApplyTotalUpdate_ExplicitManualTotalRecomputesDelta(t *testing.T) {
	current := computeTotalState(2000, "calculated", nil, nil)
	manual := int64(4100)
	next := applyTotalUpdate(current, 3500, appointmentTotalUpdate{
		ServicesUpdated:     true,
		ExplicitManualTotal: &manual,
	})
	if next.TotalCents != 4100 || next.ManualDeltaCents != 600 || next.TotalSource != "manual" {
		t.Fatalf("unexpected explicit manual total result: %+v", next)
	}
}
