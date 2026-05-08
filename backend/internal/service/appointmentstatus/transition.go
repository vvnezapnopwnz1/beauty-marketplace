// Package appointmentstatus holds shared rules for appointment status transitions.
package appointmentstatus

// KnownStatuses is the canonical appointment status catalog.
var KnownStatuses = map[string]struct{}{
	"pending":            {},
	"confirmed":          {},
	"completed":          {},
	"cancelled_by_salon": {},
	"cancelled_by_client": {},
	"no_show":            {},
}

// IsKnownStatus returns true when status is part of the canonical enum.
func IsKnownStatus(status string) bool {
	_, ok := KnownStatuses[status]
	return ok
}

// IsFinalStatus returns whether status is terminal for non-status field edits.
func IsFinalStatus(status string) bool {
	switch status {
	case "completed", "cancelled_by_salon", "cancelled_by_client", "no_show":
		return true
	default:
		return false
	}
}

// CanEditFields returns whether appointment details may be edited.
func CanEditFields(status string) bool {
	return status == "pending" || status == "confirmed"
}

// AllowedTransition returns whether the salon/master dashboard may move from one status to another.
// Final statuses are no longer immutable for status-only operations.
func AllowedTransition(from, to string) bool {
	if !IsKnownStatus(from) || !IsKnownStatus(to) || from == to {
		return false
	}
	return true
}
