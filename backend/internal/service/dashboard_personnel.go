package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/repository"
)

var staffInvitePhoneRe = regexp.MustCompile(`^\+7\d{10}$`)

func (s *dashboardService) ListSalonMemberUsers(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMemberUserRow, error) {
	return s.dash.ListSalonMemberUsers(ctx, salonID)
}

func (s *dashboardService) RemoveSalonMember(ctx context.Context, salonID, targetUserID uuid.UUID) (bool, error) {
	return s.dash.DeleteSalonMember(ctx, salonID, targetUserID)
}

func (s *dashboardService) UpdateSalonMemberRole(ctx context.Context, salonID, targetUserID uuid.UUID, role string) (bool, error) {
	r := strings.TrimSpace(strings.ToLower(role))
	if r != "admin" && r != "receptionist" {
		return false, fmt.Errorf("invalid role")
	}
	return s.dash.UpdateSalonMemberRole(ctx, salonID, targetUserID, r)
}

func (s *dashboardService) ListStaffInvites(ctx context.Context, salonID uuid.UUID) ([]repository.SalonMemberInviteListRow, error) {
	return s.invites.ListBySalon(ctx, salonID)
}

func (s *dashboardService) CreateStaffInvite(ctx context.Context, salonID, invitedBy uuid.UUID, phoneE164, role string) (*repository.SalonMemberInviteListRow, error) {
	phone := strings.TrimSpace(phoneE164)
	if !staffInvitePhoneRe.MatchString(phone) {
		return nil, fmt.Errorf("invalid phone")
	}
	r := strings.TrimSpace(strings.ToLower(role))
	if r != "admin" && r != "receptionist" {
		return nil, fmt.Errorf("invalid role")
	}
	return s.invites.CreatePending(ctx, salonID, invitedBy, phone, r)
}

func (s *dashboardService) RevokeStaffInvite(ctx context.Context, salonID, inviteID uuid.UUID) (bool, error) {
	return s.invites.DeletePending(ctx, salonID, inviteID)
}

func (s *dashboardService) ListMySalonInvites(ctx context.Context, userID uuid.UUID) ([]repository.SalonMemberInviteListRow, error) {
	return s.invites.ListPendingForUser(ctx, userID)
}

func (s *dashboardService) AcceptMySalonInvite(ctx context.Context, userID, inviteID uuid.UUID) error {
	return s.invites.AcceptPending(ctx, userID, inviteID)
}

func (s *dashboardService) DeclineMySalonInvite(ctx context.Context, userID, inviteID uuid.UUID) (bool, error) {
	return s.invites.DeclinePending(ctx, userID, inviteID)
}
