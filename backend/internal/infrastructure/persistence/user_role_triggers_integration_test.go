package persistence

import (
	"os"
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// This is an integration test and requires a Postgres DB with migrations applied.
// It validates that DB-level triggers keep users.global_role in sync.
func TestUserGlobalRoleRecalcTriggers(t *testing.T) {
	dsn := testDSNFromEnv(t)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("begin tx: %v", tx.Error)
	}
	t.Cleanup(func() { _ = tx.Rollback().Error })

	userID := uuid.New()
	salonID := uuid.New()
	masterProfileID := uuid.New()

	if err := tx.Exec(
		`INSERT INTO users (id, phone_e164, global_role) VALUES (?, ?, 'client')`,
		userID, "+79990001122",
	).Error; err != nil {
		t.Fatalf("insert user: %v", err)
	}

	if err := tx.Exec(
		`INSERT INTO salons (id, external_source, external_id) VALUES (?, 'test', ?)`,
		salonID, "ext-"+salonID.String(),
	).Error; err != nil {
		t.Fatalf("insert salon: %v", err)
	}

	assertUserRole(t, tx, userID, "client")

	if err := tx.Exec(
		`INSERT INTO salon_members (salon_id, user_id, role) VALUES (?, ?, 'owner')`,
		salonID, userID,
	).Error; err != nil {
		t.Fatalf("insert salon member owner: %v", err)
	}
	assertUserRole(t, tx, userID, "salon_owner")

	if err := tx.Exec(
		`DELETE FROM salon_members WHERE salon_id = ? AND user_id = ?`,
		salonID, userID,
	).Error; err != nil {
		t.Fatalf("delete salon member: %v", err)
	}
	assertUserRole(t, tx, userID, "client")

	if err := tx.Exec(
		`INSERT INTO master_profiles (id, user_id, display_name) VALUES (?, ?, 'Role Trigger Master')`,
		masterProfileID, userID,
	).Error; err != nil {
		t.Fatalf("insert master profile: %v", err)
	}
	assertUserRole(t, tx, userID, "master")

	if err := tx.Exec(
		`INSERT INTO salon_members (salon_id, user_id, role) VALUES (?, ?, 'owner')`,
		salonID, userID,
	).Error; err != nil {
		t.Fatalf("insert salon member owner second time: %v", err)
	}
	assertUserRole(t, tx, userID, "salon_owner")

	if err := tx.Exec(
		`DELETE FROM salon_members WHERE salon_id = ? AND user_id = ?`,
		salonID, userID,
	).Error; err != nil {
		t.Fatalf("delete salon member second time: %v", err)
	}
	assertUserRole(t, tx, userID, "master")

	if err := tx.Exec(
		`DELETE FROM master_profiles WHERE id = ?`,
		masterProfileID,
	).Error; err != nil {
		t.Fatalf("delete master profile: %v", err)
	}
	assertUserRole(t, tx, userID, "client")

	if err := tx.Exec(
		`UPDATE users SET global_role = 'admin' WHERE id = ?`,
		userID,
	).Error; err != nil {
		t.Fatalf("set admin role: %v", err)
	}
	if err := tx.Exec(
		`INSERT INTO salon_members (salon_id, user_id, role) VALUES (?, ?, 'owner')`,
		salonID, userID,
	).Error; err != nil {
		t.Fatalf("insert salon member for admin: %v", err)
	}
	assertUserRole(t, tx, userID, "admin")
}

func assertUserRole(t *testing.T, db *gorm.DB, userID uuid.UUID, want string) {
	t.Helper()
	var got string
	if err := db.Raw(`SELECT global_role FROM users WHERE id = ?`, userID).Scan(&got).Error; err != nil {
		t.Fatalf("select user role: %v", err)
	}
	if got != want {
		t.Fatalf("unexpected user role: got=%q want=%q", got, want)
	}
}

func testDSNFromEnv(t *testing.T) string {
	t.Helper()
	if dsn := os.Getenv("TEST_DATABASE_DSN"); dsn != "" {
		return dsn
	}
	if dsn := os.Getenv("DATABASE_URL"); dsn != "" {
		return dsn
	}
	t.Skip("set TEST_DATABASE_DSN (or DATABASE_URL) for integration DB trigger test")
	return ""
}
