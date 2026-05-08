package service

type appointmentTotalState struct {
	BaseTotalCents   int64
	TotalCents       int64
	TotalSource      string
	ManualDeltaCents int64
}

type appointmentTotalUpdate struct {
	ServicesUpdated          bool
	ExplicitManualTotal      *int64
	ResetToCalculatedIfEmpty bool
}

func normalizeTotalSource(source string) string {
	if source == "manual" {
		return "manual"
	}
	return "calculated"
}

func computeTotalState(baseTotal int64, source string, storedTotal *int64, storedDelta *int64) appointmentTotalState {
	normalizedSource := normalizeTotalSource(source)
	total := baseTotal
	if storedTotal != nil {
		total = *storedTotal
	}

	delta := total - baseTotal
	if storedDelta != nil {
		delta = *storedDelta
	}
	if normalizedSource != "manual" {
		delta = 0
		total = baseTotal
	}
	return appointmentTotalState{
		BaseTotalCents:   baseTotal,
		TotalCents:       total,
		TotalSource:      normalizedSource,
		ManualDeltaCents: delta,
	}
}

func applyTotalUpdate(current appointmentTotalState, nextBaseTotal int64, update appointmentTotalUpdate) appointmentTotalState {
	if update.ExplicitManualTotal != nil {
		manualTotal := *update.ExplicitManualTotal
		return appointmentTotalState{
			BaseTotalCents:   nextBaseTotal,
			TotalCents:       manualTotal,
			TotalSource:      "manual",
			ManualDeltaCents: manualTotal - nextBaseTotal,
		}
	}

	if update.ResetToCalculatedIfEmpty && update.ServicesUpdated && nextBaseTotal == 0 {
		return appointmentTotalState{
			BaseTotalCents:   0,
			TotalCents:       0,
			TotalSource:      "calculated",
			ManualDeltaCents: 0,
		}
	}

	if update.ServicesUpdated && current.TotalSource == "manual" {
		nextTotal := nextBaseTotal + current.ManualDeltaCents
		if nextTotal < 0 {
			nextTotal = 0
		}
		return appointmentTotalState{
			BaseTotalCents:   nextBaseTotal,
			TotalCents:       nextTotal,
			TotalSource:      "manual",
			ManualDeltaCents: current.ManualDeltaCents,
		}
	}

	if update.ServicesUpdated {
		return appointmentTotalState{
			BaseTotalCents:   nextBaseTotal,
			TotalCents:       nextBaseTotal,
			TotalSource:      "calculated",
			ManualDeltaCents: 0,
		}
	}

	return current
}
