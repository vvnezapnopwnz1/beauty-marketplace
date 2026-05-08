package appointmentstatus

import "testing"

func TestIsFinalStatus(t *testing.T) {
	t.Parallel()
	tests := []struct {
		status string
		want   bool
	}{
		{status: "pending", want: false},
		{status: "confirmed", want: false},
		{status: "completed", want: true},
		{status: "cancelled_by_salon", want: true},
		{status: "cancelled_by_client", want: true},
		{status: "no_show", want: true},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.status, func(t *testing.T) {
			t.Parallel()
			if got := IsFinalStatus(tc.status); got != tc.want {
				t.Fatalf("IsFinalStatus(%q) = %v, want %v", tc.status, got, tc.want)
			}
		})
	}
}

func TestCanEditFields(t *testing.T) {
	t.Parallel()
	if !CanEditFields("pending") || !CanEditFields("confirmed") {
		t.Fatal("pending and confirmed must stay editable")
	}
	for _, status := range []string{"completed", "cancelled_by_salon", "cancelled_by_client", "no_show"} {
		if CanEditFields(status) {
			t.Fatalf("%s must be non-editable", status)
		}
	}
}

func TestAllowedTransition(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		from string
		to   string
		want bool
	}{
		{name: "pending to confirmed", from: "pending", to: "confirmed", want: true},
		{name: "completed to confirmed", from: "completed", to: "confirmed", want: true},
		{name: "no_show to pending", from: "no_show", to: "pending", want: true},
		{name: "same status forbidden", from: "confirmed", to: "confirmed", want: false},
		{name: "unknown from forbidden", from: "foo", to: "pending", want: false},
		{name: "unknown to forbidden", from: "pending", to: "bar", want: false},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := AllowedTransition(tc.from, tc.to); got != tc.want {
				t.Fatalf("AllowedTransition(%q, %q) = %v, want %v", tc.from, tc.to, got, tc.want)
			}
		})
	}
}
