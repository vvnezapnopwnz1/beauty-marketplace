// Package appointmentstatus holds shared rules for appointment status transitions.
package appointmentstatus

// AllowedTransition returns whether the salon/master dashboard may move from one status to another.
// Kept in sync with legacy dashboard rules (pending/confirmed flows; terminal states have no outbound edges).
func AllowedTransition(from, to string) bool {
	switch from {
	case "pending":
		return to == "confirmed" || to == "cancelled_by_salon" || to == "cancelled_by_client" // reserved: client cancellation
	case "confirmed":
		return to == "completed" || to == "no_show" || to == "cancelled_by_salon" || to == "cancelled_by_client" // reserved: client cancellation
	default:
		return false
	}
}
