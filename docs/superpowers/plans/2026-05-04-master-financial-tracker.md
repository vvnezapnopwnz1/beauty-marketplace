# Master Financial Tracker Implementation Plan

**Goal:** Add a Financial Tracker section to the master dashboard so solo masters can track income from completed appointments, record expenses with custom categories, view revenue trends, and export tax reports (НПД).

**Architecture:** Extend existing master-dashboard service/repo/controller with finance endpoints. New frontend entity `entities/master-finances/` with RTK Query API and MUI X Charts for visualization. New FSD page `MasterFinancesPage` integrated as 8th sidebar section.

**Tech Stack:** Go, GORM, PostgreSQL, MUI X Charts (Community), Redux Toolkit Query, React.

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `backend/migrations/000031_master_financial_tracker.up.sql` | DB schema: categories + expenses tables |
| `backend/migrations/0000031_master_financial_tracker.down.sql` | Rollback migration |
| `backend/internal/repository/master_finances_repository.go` | GORM CRUD for categories + expenses + SQL aggregations |
| `backend/internal/controller/finances_handler.go` | HTTP handlers for /finances/* routes |
| `frontend/src/entities/master-finances/model/masterFinancesApi.ts` | RTK Query endpoints + types |
| `frontend/src/entities/master-finances/model/financesSlice.ts` | UI state (active tab, period) |
| `frontend/src/entities/master-finances/ui/FinancialSummaryCards.tsx` | 3 summary cards (income/expenses/profit) |
| `frontend/src/entities/master-finances/ui/IncomeSourceTabs.tsx` | Personal / Salon / All tabs |
| `frontend/src/entities/master-finances/ui/TrendChart.tsx` | Line chart (MUI X) |
| `frontend/src/entities/master-finances/ui/TopServicesChart.tsx` | Bar chart (MUI X) |
| `frontend/src/entities/master-finances/ui/ExpenseList.tsx` | Expenses table with pagination |
| `frontend/src/entities/master-finances/ui/ExpenseFormDrawer.tsx` | Create/edit expense drawer |
| `frontend/src/entities/master-finances/ui/ExpenseCategoryManager.tsx` | Manage expense categories |
| `frontend/src/entities/master-finances/ui/NpdExportButton.tsx` | Tax export button |
| `frontend/src/entities/master-finances/ui/formatCurrency.ts` | Currency formatting utility |
| `frontend/src/entities/master-finances/index.ts` | Barrel exports |
| `frontend/src/features/npd-export/ui/NpdExportDialog.tsx` | Month picker dialog for export |
| `frontend/src/pages/master-dashboard/ui/MasterFinancesPage.tsx` | Compose all finance components |

### Modified files

| File | Change |
|------|--------|
| `backend/internal/infrastructure/persistence/model/models.go` | Add `MasterExpenseCategory` + `MasterExpense` models |
| `backend/internal/repository/master_dashboard.go` | Extend interface with finance methods |
| `backend/internal/service/master_dashboard.go` | Add finance DTOs + service methods |
| `backend/internal/controller/master_dashboard_controller.go` | Add "finances" case to route switch |
| `backend/internal/app/app.go` | Register `NewMasterFinancesRepository` + `NewFinancesHandler` |
| `frontend/src/shared/api/rtkApi.ts` | Add 3 RTK tags: `FinanceCategories`, `FinanceExpenses`, `FinanceSummary` |
| `frontend/src/pages/master-dashboard/ui/MasterDashboardPage.tsx` | Add 'finances' section to NAV, TITLES, isSection, render |
| `docs/vault/architecture/db-schema.md` | Document new tables |
| `docs/vault/architecture/frontend.md` | Document new entity |
| `docs/vault/product/status.md` | Log feature addition |

---

## Task 1: SQL Migration — expense categories + expenses tables

**Files:**
- Create: `backend/migrations/000031_master_financial_tracker.up.sql`
- Create: `backend/migrations/000031_master_financial_tracker.down.sql`

- [ ] **Step 1: Write the up migration**

```sql
-- 000031_master_financial_tracker.up.sql

-- Expense categories: masters create their own custom categories
CREATE TABLE master_expense_categories (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    emoji             VARCHAR(10) DEFAULT '',
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_expense_cat_owner
    ON master_expense_categories(master_profile_id, sort_order);

-- Expense entries: amounts, optional category, optional link to appointment
CREATE TABLE master_expenses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    category_id       UUID REFERENCES master_expense_categories(id) ON DELETE SET NULL,
    appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
    amount_cents      INT NOT NULL CHECK (amount_cents >= 0),
    description       TEXT DEFAULT '',
    expense_date      DATE NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_expenses_owner_date
    ON master_expenses(master_profile_id, expense_date DESC);
CREATE INDEX idx_master_expenses_appointment
    ON master_expenses(appointment_id);
CREATE INDEX idx_master_expenses_category
    ON master_expenses(category_id);
```

- [ ] **Step 2: Write the down migration**

```sql
-- 000031_master_financial_tracker.down.sql

DROP TABLE IF EXISTS master_expenses;
DROP TABLE IF EXISTS master_expense_categories;
```

- [ ] **Step 3: Run the migration locally**

```bash
cd backend && go run ./cmd/api   # server will auto-migrate if using migrate package
# Or use your migration tool:
# migrate -database "postgres://..." -path ./migrations up
```

Expected: Tables `master_expense_categories` and `master_expenses` created in the database.

- [ ] **Step 4: Verify the migration**

```bash
docker exec -it beauty-marketplace-db-1 psql -U postgres -d beauty_marketplace -c "\dt master_expense*"
docker exec -it beauty-marketplace-db-1 psql -U postgres -d beauty_marketplace -c "\d master_expense_categories"
```

Expected: Both tables listed with correct columns.

---

## Task 2: GORM Models — MasterExpenseCategory + MasterExpense

**Files:**
- Modify: `backend/internal/infrastructure/persistence/model/models.go`

- [ ] **Step 1: Add models to models.go**

Add these two structs after the existing `MasterClient` model (search for `func (MasterClient) TableName()`):

```go
// MasterExpenseCategory represents a user-created expense category for a master.
type MasterExpenseCategory struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	MasterProfileID uuid.UUID `gorm:"type:uuid;not null;column:master_profile_id"`
	Name            string    `gorm:"column:name;type:varchar(100);not null"`
	Emoji           string    `gorm:"column:emoji;type:varchar(10);default:''"`
	SortOrder       int       `gorm:"column:sort_order;not null;default:0"`
	CreatedAt       time.Time `gorm:"column:created_at;not null;autoCreateTime"`
}

func (MasterExpenseCategory) TableName() string { return "master_expense_categories" }

func (c *MasterExpenseCategory) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// MasterExpense represents a personal expense for a master.
type MasterExpense struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	MasterProfileID uuid.UUID  `gorm:"type:uuid;not null;column:master_profile_id"`
	CategoryID      *uuid.UUID `gorm:"type:uuid;column:category_id"`
	AppointmentID   *uuid.UUID `gorm:"type:uuid;column:appointment_id"`
	AmountCents     int        `gorm:"column:amount_cents;not null"`
	Description     string     `gorm:"column:description;type:text;default:''"`
	ExpenseDate     time.Time  `gorm:"column:expense_date;type:date;not null"`
	CreatedAt       time.Time  `gorm:"column:created_at;not null;autoCreateTime"`
}

func (MasterExpense) TableName() string { return "master_expenses" }

func (e *MasterExpense) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}
```

- [ ] **Step 2: Auto-migrate registration**

Find the AutoMigrate call (likely in `persistence.NewDB` or similar). Add the two new models:

```go
db.AutoMigrate(
    // ... existing models ...
    &model.MasterExpenseCategory{},
    &model.MasterExpense{},
)
```

- [ ] **Step 3: Compile check**

```bash
cd backend && go build ./...
```

Expected: No errors.

---

## Task 3: Repository — expense categories CRUD

**Files:**
- Modify: `backend/internal/repository/master_dashboard.go`
- Create: `backend/internal/repository/master_finances_repository.go`

- [ ] **Step 1: Extend the interface in master_dashboard.go**

Add to the `MasterDashboardRepository` interface:

```go
// MasterExpenseCategoryDTO is a category row returned to the service layer.
type MasterExpenseCategoryDTO struct {
    ID          uuid.UUID
    Name        string
    Emoji       string
    SortOrder   int
    CreatedAt   time.Time
}

// ExpenseCategories CRUD
ListExpenseCategories(ctx context.Context, masterProfileID uuid.UUID) ([]MasterExpenseCategoryDTO, error)
CreateExpenseCategory(ctx context.Context, c *model.MasterExpenseCategory) error
UpdateExpenseCategory(ctx context.Context, c *model.MasterExpenseCategory) error
DeleteExpenseCategory(ctx context.Context, masterProfileID, categoryID uuid.UUID) (bool, error)
```

- [ ] **Step 2: Implement in master_finances_repository.go**

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"gorm.io/gorm"
)

type masterFinancesRepository struct {
	db *gorm.DB
}

// NewMasterFinancesRepository constructs the finances repository.
func NewMasterFinancesRepository(db *gorm.DB) *masterFinancesRepository {
	return &masterFinancesRepository{db: db}
}

// --- Expense Categories ---

func (r *masterFinancesRepository) ListExpenseCategories(ctx context.Context, masterProfileID uuid.UUID) ([]MasterExpenseCategoryDTO, error) {
	var cats []model.MasterExpenseCategory
	err := r.db.WithContext(ctx).
		Where("master_profile_id = ?", masterProfileID).
		Order("sort_order ASC, created_at ASC").
		Find(&cats).Error
	if err != nil {
		return nil, err
	}
	out := make([]MasterExpenseCategoryDTO, len(cats))
	for i, c := range cats {
		out[i] = MasterExpenseCategoryDTO{
			ID:        c.ID,
			Name:      c.Name,
			Emoji:     c.Emoji,
			SortOrder: c.SortOrder,
			CreatedAt: c.CreatedAt,
		}
	}
	return out, nil
}

func (r *masterFinancesRepository) CreateExpenseCategory(ctx context.Context, c *model.MasterExpenseCategory) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *masterFinancesRepository) UpdateExpenseCategory(ctx context.Context, c *model.MasterExpenseCategory) error {
	res := r.db.WithContext(ctx).
		Model(&model.MasterExpenseCategory{}).
		Where("id = ? AND master_profile_id = ?", c.ID, c.MasterProfileID).
		Updates(map[string]any{
			"name":       c.Name,
			"emoji":      c.Emoji,
			"sort_order": c.SortOrder,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterFinancesRepository) DeleteExpenseCategory(ctx context.Context, masterProfileID, categoryID uuid.UUID) (bool, error) {
	res := r.db.WithContext(ctx).
		Where("id = ? AND master_profile_id = ?", categoryID, masterProfileID).
		Delete(&model.MasterExpenseCategory{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend && go build ./...
```

Expected: No errors.

---

## Task 4: Repository — expenses CRUD

**Files:**
- Modify: `backend/internal/repository/master_dashboard.go`
- Modify: `backend/internal/repository/master_finances_repository.go`

- [ ] **Step 1: Extend interface in master_dashboard.go**

Add to the `MasterDashboardRepository` interface:

```go
// MasterExpenseListFilter filters master expenses.
type MasterExpenseListFilter struct {
	MasterProfileID uuid.UUID
	From            *time.Time
	To              *time.Time
	CategoryID      *uuid.UUID
	WithAppointment *bool // nil = all, true = only linked, false = only unlinked
	Limit           int
	Offset          int
}

// MasterExpenseRow is an expense with optional category info.
type MasterExpenseRow struct {
	Expense       model.MasterExpense
	CategoryName  *string
	CategoryEmoji *string
}

Expenses CRUD
ListExpenses(ctx context.Context, f MasterExpenseListFilter) ([]MasterExpenseRow, int64, error)
GetExpenseByID(ctx context.Context, masterProfileID, expenseID uuid.UUID) (*model.MasterExpense, error)
CreateExpense(ctx context.Context, e *model.MasterExpense) error
UpdateExpense(ctx context.Context, e *model.MasterExpense) error
DeleteExpense(ctx context.Context, masterProfileID, expenseID uuid.UUID) (bool, error)
```

- [ ] **Step 2: Implement in master_finances_repository.go**

Add after the categories section:

```go
// --- Expenses ---

func (r *masterFinancesRepository) ListExpenses(ctx context.Context, f MasterExpenseListFilter) ([]MasterExpenseRow, int64, error) {
	q := r.db.WithContext(ctx).
		Model(&model.MasterExpense{}).
		Where("master_profile_id = ?", f.MasterProfileID)

	if f.From != nil {
		q = q.Where("expense_date >= ?", *f.From)
	}
	if f.To != nil {
		q = q.Where("expense_date < ?", *f.To)
	}
	if f.CategoryID != nil {
		q = q.Where("category_id = ?", *f.CategoryID)
	}
	if f.WithAppointment != nil {
		if *f.WithAppointment {
			q = q.Where("appointment_id IS NOT NULL")
		} else {
			q = q.Where("appointment_id IS NULL")
		}
	}

	// Count
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Query with LEFT JOIN to categories
	type rowWithCategory struct {
		model.MasterExpense
		CategoryName  *string
		CategoryEmoji *string
	}

	var rows []rowWithCategory
	err := q.Select("master_expenses.*, mec.name AS category_name, mec.emoji AS category_emoji").
		Joins("LEFT JOIN master_expense_categories mec ON mec.id = master_expenses.category_id").
		Order("master_expenses.expense_date DESC, master_expenses.created_at DESC").
		Limit(f.Limit).
		Offset(f.Offset).
		Find(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	out := make([]MasterExpenseRow, len(rows))
	for i, r := range rows {
		out[i] = MasterExpenseRow{
			Expense:       r.MasterExpense,
			CategoryName:  r.CategoryName,
			CategoryEmoji: r.CategoryEmoji,
		}
	}
	return out, total, nil
}

func (r *masterFinancesRepository) GetExpenseByID(ctx context.Context, masterProfileID, expenseID uuid.UUID) (*model.MasterExpense, error) {
	var e model.MasterExpense
	err := r.db.WithContext(ctx).
		Where("id = ? AND master_profile_id = ?", expenseID, masterProfileID).
		First(&e).Error
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *masterFinancesRepository) CreateExpense(ctx context.Context, e *model.MasterExpense) error {
	return r.db.WithContext(ctx).Create(e).Error
}

func (r *masterFinancesRepository) UpdateExpense(ctx context.Context, e *model.MasterExpense) error {
	res := r.db.WithContext(ctx).
		Model(&model.MasterExpense{}).
		Where("id = ? AND master_profile_id = ?", e.ID, e.MasterProfileID).
		Updates(map[string]any{
			"category_id":    e.CategoryID,
			"appointment_id": e.AppointmentID,
			"amount_cents":   e.AmountCents,
			"description":    e.Description,
			"expense_date":   e.ExpenseDate,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterFinancesRepository) DeleteExpense(ctx context.Context, masterProfileID, expenseID uuid.UUID) (bool, error) {
	res := r.db.WithContext(ctx).
		Where("id = ? AND master_profile_id = ?", expenseID, masterProfileID).
		Delete(&model.MasterExpense{})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend && go build ./...
```

Expected: No errors.

---

## Task 5: Repository — financial summary, trend, top services

**Files:**
- Modify: `backend/internal/repository/master_dashboard.go`
- Modify: `backend/internal/repository/master_finances_repository.go`

- [ ] **Step 1: Extend interface in master_dashboard.go**

Add to the `MasterDashboardRepository` interface:

```go
// FinancialSummaryDTO aggregates income, expenses, and profit for a period.
type FinancialSummaryDTO struct {
	PeriodFrom     time.Time
	PeriodTo       time.Time
	IncomeCents    int64
	ExpensesCents  int64
	ProfitCents    int64
}

// IncomeTrendRow is one day's income vs expenses.
type IncomeTrendRow struct {
	Date          time.Time
	IncomeCents   int64
	ExpensesCents int64
}

// TopServiceDTO is a service ranked by revenue.
type TopServiceDTO struct {
	ServiceName  string
	RevenueCents int64
	Count        int
}

// Finance aggregations
GetFinancialSummary(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time, source string) (*FinancialSummaryDTO, error)
GetIncomeTrend(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time, source string) ([]IncomeTrendRow, error)
GetTopServicesByRevenue(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time, limit int) ([]TopServiceDTO, error)
```

- [ ] **Step 2: Implement in master_finances_repository.go**

Add after the expenses section:

```go
// --- Financial Aggregations ---

func (r *masterFinancesRepository) GetFinancialSummary(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time, source string) (*FinancialSummaryDTO, error) {
	incomeCents, err := r.computeIncomeCents(ctx, masterProfileID, from, to, source)
	if err != nil {
		return nil, err
	}

	expensesCents, err := r.computeExpensesCents(ctx, masterProfileID, from, to)
	if err != nil {
		return nil, err
	}

	return &FinancialSummaryDTO{
		PeriodFrom:    from,
		PeriodTo:      to,
		IncomeCents:   incomeCents,
		ExpensesCents: expensesCents,
		ProfitCents:   incomeCents - expensesCents,
	}, nil
}

// computeIncomeCents calculates revenue from completed appointments.
// source: "personal" = only personal appointments, salon UUID = only that salon, "" = all.
func (r *masterFinancesRepository) computeIncomeCents(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time, source string) (int64, error) {
	// Personal appointments income
	if source == "" || source == "personal" {
		var personalIncome int64
		err := r.db.WithContext(ctx).Raw(`
			SELECT COALESCE(SUM(COALESCE(ms.price_cents, 0)), 0)
			FROM appointments a
			JOIN master_services ms ON ms.id = a.service_id
			WHERE a.master_profile_id = ?
			  AND a.status = 'completed'
			  AND a.starts_at >= ? AND a.starts_at < ?
			  AND ms.master_id = ?
		`, masterProfileID, from, to, masterProfileID).Scan(&personalIncome).Error
		if err != nil {
			return 0, err
		}
		if source == "personal" {
			return personalIncome, nil
		}
		// source == "" — accumulate with salon income below
		_ = personalIncome // will be added
	}

	// Salon appointments income (only when source == "" or source == salon UUID)
	if source == "" {
		var salonIncome int64
		err := r.db.WithContext(ctx).Raw(`
			SELECT COALESCE(SUM(
				COALESCE(sms.price_override_cents, COALESCE(s.price_cents, 0))
			), 0)
			FROM appointments a
			JOIN salon_masters sm ON sm.id = a.salon_master_id
			LEFT JOIN salon_master_services sms ON sms.staff_id = sm.id AND sms.service_id = a.service_id
			LEFT JOIN services s ON s.id = a.service_id
			WHERE sm.master_id = ?
			  AND sm.is_active = true
			  AND a.status = 'completed'
			  AND a.starts_at >= ? AND a.starts_at < ?
		`, masterProfileID, from, to).Scan(&salonIncome).Error
		if err != nil {
			return 0, err
		}
		// Return total = personal + salon
		var personalIncome int64
		_ = r.db.WithContext(ctx).Raw(`
			SELECT COALESCE(SUM(COALESCE(ms.price_cents, 0)), 0)
			FROM appointments a
			JOIN master_services ms ON ms.id = a.service_id
			WHERE a.master_profile_id = ?
			  AND a.status = 'completed'
			  AND a.starts_at >= ? AND a.starts_at < ?
			  AND ms.master_id = ?
		`, masterProfileID, from, to, masterProfileID).Scan(&personalIncome).Error
		return personalIncome + salonIncome, nil
	}

	// source == salon UUID — income from that specific salon
	if source != "" && source != "personal" {
		salonID, err := uuid.Parse(source)
		if err != nil {
			return 0, err
		}
		var salonIncome int64
		err = r.db.WithContext(ctx).Raw(`
			SELECT COALESCE(SUM(
				COALESCE(sms.price_override_cents, COALESCE(s.price_cents, 0))
			), 0)
			FROM appointments a
			JOIN salon_masters sm ON sm.id = a.salon_master_id
			LEFT JOIN salon_master_services sms ON sms.staff_id = sm.id AND sms.service_id = a.service_id
			LEFT JOIN services s ON s.id = a.service_id
			WHERE sm.master_id = ?
			  AND sm.salon_id = ?
			  AND sm.is_active = true
			  AND a.status = 'completed'
			  AND a.starts_at >= ? AND a.starts_at < ?
		`, masterProfileID, salonID, from, to).Scan(&salonIncome).Error
		return salonIncome, err
	}

	return 0, nil
}

func (r *masterFinancesRepository) computeExpensesCents(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time) (int64, error) {
	var cents int64
	err := r.db.WithContext(ctx).Raw(`
		SELECT COALESCE(SUM(amount_cents), 0)
		FROM master_expenses
		WHERE master_profile_id = ?
		  AND expense_date >= ? AND expense_date < ?
	`, masterProfileID, from, to).Scan(&cents).Error
	return cents, err
}

func (r *masterFinancesRepository) GetIncomeTrend(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time, source string) ([]IncomeTrendRow, error) {
	// Combine income (by starts_at::date) and expenses (by expense_date) into daily rows
	rows := []IncomeTrendRow{}
	err := r.db.WithContext(ctx).Raw(`
		WITH daily_income AS (
			SELECT a.starts_at::date AS d,
			       COALESCE(SUM(
			           CASE WHEN a.master_profile_id = ? THEN
			               COALESCE(ms.price_cents, 0)
			           ELSE
			               COALESCE(sms.price_override_cents, COALESCE(s.price_cents, 0))
			           END
			       ), 0) AS income_cents
			FROM appointments a
			LEFT JOIN master_services ms ON ms.id = a.service_id AND ms.master_id = a.master_profile_id
			LEFT JOIN salon_masters sm ON sm.id = a.salon_master_id
			LEFT JOIN salon_master_services sms ON sms.staff_id = sm.id AND sms.service_id = a.service_id
			LEFT JOIN services s ON s.id = a.service_id
			WHERE a.status = 'completed'
			  AND a.starts_at >= ? AND a.starts_at < ?
			  AND (
			       (a.master_profile_id = ? AND a.master_profile_id IS NOT NULL)
			    OR (sm.master_id = ? AND sm.is_active = true AND a.salon_master_id IS NOT NULL)
			  )
			GROUP BY a.starts_at::date
		),
		daily_expenses AS (
			SELECT expense_date AS d,
			       COALESCE(SUM(amount_cents), 0) AS expenses_cents
			FROM master_expenses
			WHERE master_profile_id = ?
			  AND expense_date >= ? AND expense_date < ?
			GROUP BY expense_date
		)
		SELECT COALESCE(di.d, de.d) AS date,
		       COALESCE(di.income_cents, 0) AS income_cents,
		       COALESCE(de.expenses_cents, 0) AS expenses_cents
		FROM daily_income di
		FULL OUTER JOIN daily_expenses de ON di.d = de.d
		ORDER BY date ASC
	`, masterProfileID, from, to,
		masterProfileID, masterProfileID,
		masterProfileID, from, to).Scan(&rows).Error
	return rows, err
}

func (r *masterFinancesRepository) GetTopServicesByRevenue(ctx context.Context, masterProfileID uuid.UUID, from, to time.Time, limit int) ([]TopServiceDTO, error) {
	rows := []TopServiceDTO{}
	err := r.db.WithContext(ctx).Raw(`
		SELECT li.service_name,
		       COALESCE(SUM(li.price_cents), 0) AS revenue_cents,
		       COUNT(*) AS count
		FROM appointment_line_items li
		JOIN appointments a ON a.id = li.appointment_id
		WHERE a.status = 'completed'
		  AND a.starts_at >= ? AND a.starts_at < ?
		  AND a.master_profile_id = ?
		GROUP BY li.service_name
		ORDER BY revenue_cents DESC
		LIMIT ?
	`, from, to, masterProfileID, limit).Scan(&rows).Error
	return rows, err
}
```

- [ ] **Step 3: Compile check**

```bash
cd backend && go build ./...
```

Expected: No errors.

---

## Task 6: Service layer — finance DTOs + methods

**Files:**
- Modify: `backend/internal/service/master_dashboard.go`

- [ ] **Step 1: Add finance DTOs and extend interface**

Add to `MasterDashboardService` interface:

```go
// --- Financial Tracker DTOs ---

type ExpenseCategoryPayload struct {
	Name      string `json:"name"`
	Emoji     string `json:"emoji"`
	SortOrder int    `json:"sort_order"`
}

type ExpensePayload struct {
	CategoryID    *uuid.UUID `json:"category_id,omitempty"`
	AppointmentID *uuid.UUID `json:"appointment_id,omitempty"`
	AmountCents   int        `json:"amount_cents"`
	Description   string     `json:"description"`
	ExpenseDate   string     `json:"expense_date"` // YYYY-MM-DD
}

type FinancialSummaryResponse struct {
	PeriodFrom    string `json:"period_from"`
	PeriodTo      string `json:"period_to"`
	IncomeCents   int64  `json:"income_cents"`
	ExpensesCents int64  `json:"expenses_cents"`
	ProfitCents   int64  `json:"profit_cents"`
}

type IncomeTrendEntry struct {
	Date          string `json:"date"`
	IncomeCents   int64  `json:"income_cents"`
	ExpensesCents int64  `json:"expenses_cents"`
}

type TopServiceEntry struct {
	ServiceName  string `json:"service_name"`
	RevenueCents int64  `json:"revenue_cents"`
	Count        int    `json:"count"`
}
```

Extend interface with finance methods:

```go
ListExpenseCategories(ctx context.Context, masterID uuid.UUID) ([]ExpenseCategoryPayload, error)
CreateExpenseCategory(ctx context.Context, masterID uuid.UUID, p ExpenseCategoryPayload) (*ExpenseCategoryPayload, error)
UpdateExpenseCategory(ctx context.Context, masterID, catID uuid.UUID, p ExpenseCategoryPayload) (*ExpenseCategoryPayload, error)
DeleteExpenseCategory(ctx context.Context, masterID, catID uuid.UUID) error

ListExpenses(ctx context.Context, masterID uuid.UUID, from, to *time.Time, categoryID *uuid.UUID, withAppt *bool, page, pageSize int) ([]TopServiceEntry, int64, error)
CreateExpense(ctx context.Context, masterID uuid.UUID, p ExpensePayload) error
UpdateExpense(ctx context.Context, masterID, expID uuid.UUID, p ExpensePayload) error
DeleteExpense(ctx context.Context, masterID, expID uuid.UUID) error

GetFinancialSummary(ctx context.Context, masterID uuid.UUID, from, to time.Time, source string) (*FinancialSummaryResponse, error)
GetIncomeTrend(ctx context.Context, masterID uuid.UUID, from, to time.Time, source string) ([]IncomeTrendEntry, error)
GetTopServicesByRevenue(ctx context.Context, masterID uuid.UUID, from, to time.Time, limit int) ([]TopServiceEntry, error)
```

- [ ] **Step 2: Implement service methods**

Implement each method by delegating to the repository layer. Key patterns:

```go
func (s *masterDashboardService) ListExpenseCategories(ctx context.Context, masterID uuid.UUID) ([]ExpenseCategoryPayload, error) {
	cats, err := s.repo.ListExpenseCategories(ctx, masterID)
	if err != nil {
		return nil, err
	}
	out := make([]ExpenseCategoryPayload, len(cats))
	for i, c := range cats {
		out[i] = ExpenseCategoryPayload{
			Name:      c.Name,
			Emoji:     c.Emoji,
			SortOrder: c.SortOrder,
		}
	}
	return out, nil
}

func (s *masterDashboardService) CreateExpenseCategory(ctx context.Context, masterID uuid.UUID, p ExpenseCategoryPayload) (*ExpenseCategoryPayload, error) {
	cat := &model.MasterExpenseCategory{
		MasterProfileID: masterID,
		Name:            p.Name,
		Emoji:           p.Emoji,
		SortOrder:       p.SortOrder,
	}
	if err := s.repo.CreateExpenseCategory(ctx, cat); err != nil {
		return nil, err
	}
	return &ExpenseCategoryPayload{
		Name:      cat.Name,
		Emoji:     cat.Emoji,
		SortOrder: cat.SortOrder,
	}, nil
}

// UpdateExpenseCategory, DeleteExpenseCategory follow same pattern.

func (s *masterDashboardService) ListExpenses(ctx context.Context, masterID uuid.UUID, from, to *time.Time, categoryID *uuid.UUID, withAppt *bool, page, pageSize int) ([]MasterExpenseRow, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize > 100 {
		pageSize = 100
	}
	f := repo.MasterExpenseListFilter{
		MasterProfileID: masterID,
		From:            from,
		To:              to,
		CategoryID:      categoryID,
		WithAppointment: withAppt,
		Limit:           pageSize,
		Offset:          (page - 1) * pageSize,
	}
	return s.repo.ListExpenses(ctx, f)
}

func (s *masterDashboardService) CreateExpense(ctx context.Context, masterID uuid.UUID, p ExpensePayload) error {
	expDate, err := time.Parse("2006-01-02", p.ExpenseDate)
	if err != nil {
		return fmt.Errorf("invalid expense_date: %w", err)
	}
	e := &model.MasterExpense{
		MasterProfileID: masterID,
		CategoryID:      p.CategoryID,
		AppointmentID:   p.AppointmentID,
		AmountCents:     p.AmountCents,
		Description:     p.Description,
		ExpenseDate:     expDate,
	}
	return s.repo.CreateExpense(ctx, e)
}

func (s *masterDashboardService) UpdateExpense(ctx context.Context, masterID, expID uuid.UUID, p ExpensePayload) error {
	existing, err := s.repo.GetExpenseByID(ctx, masterID, expID)
	if err != nil {
		return err
	}
	if p.CategoryID != nil {
		existing.CategoryID = p.CategoryID
	}
	if p.AppointmentID != nil {
		existing.AppointmentID = p.AppointmentID
	}
	existing.AmountCents = p.AmountCents
	existing.Description = p.Description
	expDate, err := time.Parse("2006-01-02", p.ExpenseDate)
	if err != nil {
		return fmt.Errorf("invalid expense_date: %w", err)
	}
	existing.ExpenseDate = expDate
	return s.repo.UpdateExpense(ctx, existing)
}

func (s *masterDashboardService) DeleteExpense(ctx context.Context, masterID, expID uuid.UUID) error {
	ok, err := s.repo.DeleteExpense(ctx, masterID, expID)
	if err != nil {
		return err
	}
	if !ok {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *masterDashboardService) GetFinancialSummary(ctx context.Context, masterID uuid.UUID, from, to time.Time, source string) (*FinancialSummaryResponse, error) {
	summary, err := s.repo.GetFinancialSummary(ctx, masterID, from, to, source)
	if err != nil {
		return nil, err
	}
	return &FinancialSummaryResponse{
		PeriodFrom:    summary.PeriodFrom.Format("2006-01-02"),
		PeriodTo:      summary.PeriodTo.Format("2006-01-02"),
		IncomeCents:   summary.IncomeCents,
		ExpensesCents: summary.ExpensesCents,
		ProfitCents:   summary.ProfitCents,
	}, nil
}

func (s *masterDashboardService) GetIncomeTrend(ctx context.Context, masterID uuid.UUID, from, to time.Time, source string) ([]IncomeTrendEntry, error) {
	trend, err := s.repo.GetIncomeTrend(ctx, masterID, from, to, source)
	if err != nil {
		return nil, err
	}
	out := make([]IncomeTrendEntry, len(trend))
	for i, t := range trend {
		out[i] = IncomeTrendEntry{
			Date:          t.Date.Format("2006-01-02"),
			IncomeCents:   t.IncomeCents,
			ExpensesCents: t.ExpensesCents,
		}
	}
	return out, nil
}

func (s *masterDashboardService) GetTopServicesByRevenue(ctx context.Context, masterID uuid.UUID, from, to time.Time, limit int) ([]TopServiceEntry, error) {
	if limit <= 0 || limit > 20 {
		limit = 10
	}
	services, err := s.repo.GetTopServicesByRevenue(ctx, masterID, from, to, limit)
	if err != nil {
		return nil, err
	}
	out := make([]TopServiceEntry, len(services))
	for i, s := range services {
		out[i] = TopServiceEntry{
			ServiceName:  s.ServiceName,
			RevenueCents: s.RevenueCents,
			Count:        s.Count,
		}
	}
	return out, nil
}
```

- [ ] **Step 3: Wire new repo into service constructor**

In `app.go` (or wherever `NewMasterDashboardService` is called), pass the new finances repo alongside the existing dashboard repo:

```go
financesRepo := repository.NewMasterFinancesRepository(db)
service := NewMasterDashboardService(masterDashRepo, financesRepo)
```

Or better: merge the two repositories under a single `MasterDashboardRepository` interface that both implementations satisfy.

- [ ] **Step 4: Compile check**

```bash
cd backend && go build ./...
```

Expected: No errors.

---

## Task 7: HTTP controller — /finances/* routes

**Files:**
- Create: `backend/internal/controller/finances_handler.go`

- [ ] **Step 1: Define handler struct + constructor**

```go
package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/service"
)

type FinancesHandler struct {
	svc service.MasterDashboardService
}

func NewFinancesHandler(svc service.MasterDashboardService) *FinancesHandler {
	return &FinancesHandler{svc: svc}
}
```

- [ ] **Step 2: Register routes in the master dashboard router**

Add case `"finances"` in the route switch inside `master_dashboard_controller.go`:

```go
case "finances":
	r.GET("/categories", h.AuthMiddleware(h.ListExpenseCategories))
	r.POST("/categories", h.AuthMiddleware(h.CreateExpenseCategory))
	r.PUT("/categories/{category_id}", h.AuthMiddleware(h.UpdateExpenseCategory))
	r.DELETE("/categories/{category_id}", h.AuthMiddleware(h.DeleteExpenseCategory))

	r.GET("/expenses", h.AuthMiddleware(h.ListExpenses))
	r.POST("/expenses", h.AuthMiddleware(h.CreateExpense))
	r.PUT("/expenses/{expense_id}", h.AuthMiddleware(h.UpdateExpense))
	r.DELETE("/expenses/{expense_id}", h.AuthMiddleware(h.DeleteExpense))

	r.GET("/summary", h.AuthMiddleware(h.GetFinancialSummary))
	r.GET("/trend", h.AuthMiddleware(h.GetIncomeTrend))
	r.GET("/top-services", h.AuthMiddleware(h.GetTopServices))

	r.GET("/npd-export", h.AuthMiddleware(h.ExportNPD))
```

- [ ] **Step 3: Implement HTTP handlers**

Full implementation:

```go
package controller

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/service"
)

type FinancesHandler struct {
	svc service.MasterDashboardService
}

func NewFinancesHandler(svc service.MasterDashboardService) *FinancesHandler {
	return &FinancesHandler{svc: svc}
}

func (h *FinancesHandler) handle(c *gin.Context, fn func(*FinancesHandler, *gin.Context) (interface{}, *AppError)) {
	result, appErr := fn(h, c)
	if appErr != nil {
		appErr.Send(c)
		return
	}
	if result == nil {
		c.Status(http.StatusNoContent)
		return
	}
	c.JSON(appErr.StatusCode, successResp{Data: result})
}

// --- Categories ---

func (h *FinancesHandler) ListExpenseCategories(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	cats, err := h.svc.ListExpenseCategories(ctx.Request.Context(), masterID)
	if err != nil {
		return nil, internalError(err.Error())
	}
	return cats, nil
}

func (h *FinancesHandler) CreateExpenseCategory(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	var req service.ExpenseCategoryPayload
	if err := ctx.ShouldBindJSON(&req); err != nil {
		return nil, badRequest("invalid request body")
	}
	if req.Name == "" {
		return nil, badRequest("name is required")
	}
	cat, err := h.svc.CreateExpenseCategory(ctx.Request.Context(), masterID, req)
	if err != nil {
		return nil, internalError(err.Error())
	}
	return cat, nil
}

func (h *FinancesHandler) UpdateExpenseCategory(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	catID, err := uuid.Parse(ctx.Param("category_id"))
	if err != nil {
		return nil, badRequest("invalid category_id")
	}
	var req service.ExpenseCategoryPayload
	if err := ctx.ShouldBindJSON(&req); err != nil {
		return nil, badRequest("invalid request body")
	}
	if req.Name == "" {
		return nil, badRequest("name is required")
	}
	cat, err := h.svc.UpdateExpenseCategory(ctx.Request.Context(), masterID, catID, req)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, notFound("category not found")
		}
		return nil, internalError(err.Error())
	}
	return cat, nil
}

func (h *FinancesHandler) DeleteExpenseCategory(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	catID, err := uuid.Parse(ctx.Param("category_id"))
	if err != nil {
		return nil, badRequest("invalid category_id")
	}
	if err := h.svc.DeleteExpenseCategory(ctx.Request.Context(), masterID, catID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, notFound("category not found")
		}
		return nil, internalError(err.Error())
	}
	return nil, nil
}

// --- Expenses ---

func (h *FinancesHandler) ListExpenses(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())

	fromStr := ctx.Query("from")
	toStr := ctx.Query("to")
	categoryStr := ctx.Query("category_id")
	withApptStr := ctx.Query("with_appointment")
	pageStr := ctx.DefaultQuery("page", "1")
	pageSizeStr := ctx.DefaultQuery("page_size", "50")

	from, _ := parseTimeQuery(fromStr)
	to, _ := parseTimeQuery(toStr)

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	var categoryID *uuid.UUID
	if categoryStr != "" {
		parsed, err := uuid.Parse(categoryStr)
		if err == nil {
			categoryID = &parsed
		}
	}

	var withAppt *bool
	if withApptStr == "true" {
		b := true
		withAppt = &b
	} else if withApptStr == "false" {
		b := false
		withAppt = &b
	}

	items, total, err := h.svc.ListExpenses(ctx.Request.Context(), masterID, from, to, categoryID, withAppt, page, pageSize)
	if err != nil {
		return nil, internalError(err.Error())
	}

	return gin.H{
		"items":   items,
		"total":   total,
		"page":    page,
		"pages":   (total + int64(pageSize) - 1) / int64(pageSize),
	}, nil
}

func (h *FinancesHandler) CreateExpense(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	var req service.ExpensePayload
	if err := ctx.ShouldBindJSON(&req); err != nil {
		return nil, badRequest("invalid request body")
	}
	if req.AmountCents <= 0 {
		return nil, badRequest("amount_cents must be positive")
	}
	if req.ExpenseDate == "" {
		return nil, badRequest("expense_date is required (YYYY-MM-DD)")
	}
	if err := h.svc.CreateExpense(ctx.Request.Context(), masterID, req); err != nil {
		return nil, internalError(err.Error())
	}
	return nil, nil
}

func (h *FinancesHandler) UpdateExpense(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	expID, err := uuid.Parse(ctx.Param("expense_id"))
	if err != nil {
		return nil, badRequest("invalid expense_id")
	}
	var req service.ExpensePayload
	if err := ctx.ShouldBindJSON(&req); err != nil {
		return nil, badRequest("invalid request body")
	}
	if req.AmountCents <= 0 {
		return nil, badRequest("amount_cents must be positive")
	}
	if err := h.svc.UpdateExpense(ctx.Request.Context(), masterID, expID, req); err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, notFound("expense not found")
		}
		return nil, internalError(err.Error())
	}
	return nil, nil
}

func (h *FinancesHandler) DeleteExpense(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	expID, err := uuid.Parse(ctx.Param("expense_id"))
	if err != nil {
		return nil, badRequest("invalid expense_id")
	}
	if err := h.svc.DeleteExpense(ctx.Request.Context(), masterID, expID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, notFound("expense not found")
		}
		return nil, internalError(err.Error())
	}
	return nil, nil
}

// --- Summary / Trend / Top Services ---

func (h *FinancesHandler) GetFinancialSummary(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())

	source := ctx.Query("source") // "personal", salon UUID, or "" for all
	fromStr := ctx.DefaultQuery("from", fmt.Sprintf("-%d", 90)) // default 90 days back
	toStr := ctx.DefaultQuery("to", "")                         // default now

	now := time.Now()
	from := now.AddDate(0, 0, -90)
	to := now

	if fromStr != "" && fromStr != fmt.Sprintf("-%d", 90) {
		if parsed, err := parseRelativePeriod(fromStr, now); err == nil {
			from = parsed.From
		}
	}
	if toStr != "" {
		if parsed, err := parseRelativePeriod(toStr, now); err == nil {
			to = parsed.To
		}
	}

	summary, err := h.svc.GetFinancialSummary(ctx.Request.Context(), masterID, from, to, source)
	if err != nil {
		return nil, internalError(err.Error())
	}
	return summary, nil
}

func (h *FinancesHandler) GetIncomeTrend(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())

	source := ctx.Query("source")
	period := ctx.DefaultQuery("period", "3m") // 1w, 1m, 3m, 6m, 1y, custom

	now := time.Now()
	var from, to time.Time

	switch period {
	case "1w":
		from = now.AddDate(0, 0, -7); to = now
	case "1m":
		from = now.AddDate(0, -1, 0); to = now
	case "3m":
		from = now.AddDate(0, -3, 0); to = now
	case "6m":
		from = now.AddDate(0, -6, 0); to = now
	case "1y":
		from = now.AddDate(-1, 0, 0); to = now
	default: // custom
		fromStr := ctx.Query("from")
		toStr := ctx.Query("to")
		if parsed, err := parseRelativePeriod(fromStr, now); err == nil {
			from = parsed.From
		}
		if parsed, err := parseRelativePeriod(toStr, now); err == nil {
			to = parsed.To
		} else {
			to = now
		}
	}

	trend, err := h.svc.GetIncomeTrend(ctx.Request.Context(), masterID, from, to, source)
	if err != nil {
		return nil, internalError(err.Error())
	}
	return trend, nil
}

func (h *FinancesHandler) GetTopServices(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())

	period := ctx.DefaultQuery("period", "3m")
	limitStr := ctx.DefaultQuery("limit", "10")
	limit, _ := strconv.Atoi(limitStr)

	now := time.Now()
	from, to := getPeriodRange(period, now)

	services, err := h.svc.GetTopServicesByRevenue(ctx.Request.Context(), masterID, from, to, limit)
	if err != nil {
		return nil, internalError(err.Error())
	}
	return services, nil
}

// --- NPD Export ---

func (h *FinancesHandler) ExportNPD(c *FinancesHandler, ctx *gin.Context) (interface{}, *AppError) {
	masterID := auth.GetMasterID(ctx.Request.Context())
	monthStr := ctx.Query("month") // YYYY-MM format

	if monthStr == "" {
		return nil, badRequest("month parameter required (YYYY-MM)")
	}
	yearMonth, err := time.Parse("2006-01", monthStr)
	if err != nil {
		return nil, badRequest("invalid month format, use YYYY-MM")
	}
	from := yearMonth
	to := from.AddDate(0, 1, 0)

	summary, err := h.svc.GetFinancialSummary(ctx.Request.Context(), masterID, from, to, "")
	if err != nil {
		return nil, internalError(err.Error())
	}

	trend, err := h.svc.GetIncomeTrend(ctx.Request.Context(), masterID, from, to, "")
	if err != nil {
		return nil, internalError(err.Error())
	}

	return gin.H{
		"month":         monthStr,
		"income_cents":  summary.IncomeCents,
		"expenses_cents": summary.ExpensesCents,
		"profit_cents":  summary.ProfitCents,
		"daily_trend":   trend,
		"format":        "npd_csv",
	}, nil
}

// --- Helpers ---

type periodResult struct {
	From time.Time
	To   time.Time
}

func parseRelativePeriod(s string, now time.Time) (periodResult, error) {
	days := 0
	if strings.HasPrefix(s, "-") {
		n, err := strconv.Atoi(strings.TrimPrefix(s, "-"))
		if err != nil {
			return periodResult{}, err
		}
		days = n
		return periodResult{From: now.AddDate(0, 0, -days), To: now}, nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return periodResult{}, err
	}
	return periodResult{From: t, To: now}, nil
}

func getPeriodRange(period string, now time.Time) (time.Time, time.Time) {
	switch period {
	case "1w":
		return now.AddDate(0, 0, -7), now
	case "1m":
		return now.AddDate(0, -1, 0), now
	case "3m":
		return now.AddDate(0, -3, 0), now
	case "6m":
		return now.AddDate(0, -6, 0), now
	case "1y":
		return now.AddDate(-1, 0, 0), now
	default:
		return now.AddDate(0, -3, 0), now
	}
}

func parseTimeQuery(s string) (time.Time, error) {
	if s == "" {
		return time.Time{}, nil
	}
	// Try relative
	if strings.HasPrefix(s, "-") {
		days, err := strconv.Atoi(strings.TrimPrefix(s, "-"))
		if err == nil {
			return time.Now().AddDate(0, 0, -days), nil
		}
	}
	// Try date
	t, err := time.Parse("2006-01-02", s)
	if err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("invalid time query: %s", s)
}
```

- [ ] **Step 4: Wire handler in app.go**

```go
financesHandler := controller.NewFinancesHandler(masterService)
financesHandler.RegisterRoutes(router.Group("/api/v1/master/finances"))
```

- [ ] **Step 5: Compile check**

```bash
cd backend && go build ./...
```

Expected: No errors.

---

## Task 8: Frontend RTK Query API + types

**Files:**
- Create: `frontend/src/entities/master-finances/model/masterFinancesApi.ts`
- Modify: `frontend/src/shared/api/rtkApi.ts`

- [ ] **Step 1: Add RTK tags in shared api**

In `frontend/src/shared/api/rtkApi.ts`, add:

```ts
export enum FinanceTag {
  FinanceCategories = 'FinanceCategories',
  FinanceExpenses = 'FinanceExpenses',
  FinanceSummary = 'FinanceSummary',
}
```

Then register them in the `tagTypes` array.

- [ ] **Step 2: Create the API slice**

```typescript
// frontend/src/entities/master-finances/model/masterFinancesApi.ts
import { FinanceTag } from '@/shared/api/rtkApi';
import { rtkApi } from '@/shared/api/rtkApi';

export interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
  sort_order: number;
}

export interface ExpenseItem {
  id: string;
  category_id: string | null;
  appointment_id: string | null;
  amount_cents: number;
  description: string;
  expense_date: string; // YYYY-MM-DD
  category_name?: string;
  category_emoji?: string;
}

export interface ExpenseListResponse {
  items: ExpenseItem[];
  total: number;
  page: number;
  pages: number;
}

export interface FinancialSummary {
  period_from: string;
  period_to: string;
  income_cents: number;
  expenses_cents: number;
  profit_cents: number;
}

export interface IncomeTrendEntry {
  date: string;
  income_cents: number;
  expenses_cents: number;
}

export interface TopServiceEntry {
  service_name: string;
  revenue_cents: number;
  count: number;
}

export interface NpdExport {
  month: string;
  income_cents: number;
  expenses_cents: number;
  profit_cents: number;
  daily_trend: IncomeTrendEntry[];
  format: string;
}

type Period = '1w' | '1m' | '3m' | '6m' | '1y';
type SourceFilter = 'personal' | ''; // '' = all

const masterFinancesApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    // Categories
    listExpenseCategories: build.query<ExpenseCategory[], void>({
      query: () => '/master/finances/categories',
      providesTags: [FinanceTag.FinanceCategories],
    }),
    createExpenseCategory: build.mutation<
      ExpenseCategory,
      { name: string; emoji?: string; sort_order?: number }
    >({
      query: (body) => ({
        url: '/master/finances/categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: [FinanceTag.FinanceCategories],
    }),
    updateExpenseCategory: build.mutation<
      ExpenseCategory,
      { categoryId: string; name: string; emoji?: string; sort_order?: number }
    >({
      query: ({ categoryId, ...body }) => ({
        url: `/master/finances/categories/${categoryId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: [FinanceTag.FinanceCategories],
    }),
    deleteExpenseCategory: build.mutation<void, string>({
      query: (categoryId) => ({
        url: `/master/finances/categories/${categoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [FinanceTag.FinanceCategories],
    }),

    // Expenses
    listExpenses: build.query<
      ExpenseListResponse,
      {
        page?: number;
        page_size?: number;
        from?: string;
        to?: string;
        category_id?: string;
        with_appointment?: boolean;
      }
    >({
      query: (params) => ({
        url: '/master/finances/expenses',
        params,
      }),
      providesTags: [FinanceTag.FinanceExpenses],
    }),
    createExpense: build.mutation<void, Omit<ExpenseItem, 'id' | 'category_name' | 'category_emoji'>>({
      query: (body) => ({
        url: '/master/finances/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: [FinanceTag.FinanceExpenses, FinanceTag.FinanceSummary],
    }),
    updateExpense: build.mutation<
      void,
      { expenseId: string } & Omit<Partial<ExpenseItem>, 'id'>
    >({
      query: ({ expenseId, ...body }) => ({
        url: `/master/finances/expenses/${expenseId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: [FinanceTag.FinanceExpenses, FinanceTag.FinanceSummary],
    }),
    deleteExpense: build.mutation<void, string>({
      query: (expenseId) => ({
        url: `/master/finances/expenses/${expenseId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [FinanceTag.FinanceExpenses, FinanceTag.FinanceSummary],
    }),

    // Summary
    getFinancialSummary: build.query<
      FinancialSummary,
      { from?: string; to?: string; source?: SourceFilter }
    >({
      query: (params) => ({
        url: '/master/finances/summary',
        params,
      }),
      providesTags: [FinanceTag.FinanceSummary],
    }),

    // Trend
    getIncomeTrend: build.query<IncomeTrendEntry[], { from?: string; to?: string; source?: SourceFilter }>({
      query: (params) => ({
        url: '/master/finances/trend',
        params,
      }),
      providesTags: [FinanceTag.FinanceSummary],
    }),

    // Top Services
    getTopServices: build.query<TopServiceEntry[], { from?: string; to?: string; limit?: number }>({
      query: (params) => ({
        url: '/master/finances/top-services',
        params,
      }),
      providesTags: [FinanceTag.FinanceSummary],
    }),

    // NPD Export
    exportNPD: build.query<Blob, { month: string; format?: 'csv' | 'pdf' }>({
      query: ({ month, format = 'csv' }) => ({
        url: `/master/finances/npd-export`,
        params: { month, format },
        responseHandler: 'blob' as any,
      }),
    }),
  }),
});

export const {
  // Categories CRUD
  useListExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  // Expenses CRUD
  useListExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  // Aggregations
  useGetFinancialSummaryQuery,
  useGetIncomeTrendQuery,
  useGetTopServicesQuery,
  // Export
  useExportNPDQuery,
} = masterFinancesApi;
```

- [ ] **Step 3: Create barrel exports**

Create `frontend/src/entities/master-finances/index.ts`:

```typescript
export * from './model/masterFinancesApi';
export * from './model/financesSlice';
export * from './ui/FinancialSummaryCards';
export * from './ui/IncomeSourceTabs';
export * from './ui/TrendChart';
export * from './ui/TopServicesChart';
export * from './ui/ExpenseList';
export * from './ui/ExpenseFormDrawer';
export * from './ui/ExpenseCategoryManager';
export * from './ui/NpdExportButton';
export * from './ui/formatCurrency';
```

- [ ] **Step 4: Compile check**

```bash
cd frontend && npm run build
```

Expected: TypeScript compilation succeeds. No errors about missing modules or type mismatches.

---

## Task 9: Frontend — Redux state slice (period & source filter)

**Files:**
- Create: `frontend/src/entities/master-finances/model/financesSlice.ts`

- [ ] **Step 1: Define the slice**

```typescript
// frontend/src/entities/master-finances/model/financesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type IncomeSourceType = 'personal' | 'salon' | 'all';
export type PeriodPreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface FinancesState {
  activeTab: IncomeSourceType;
  periodPreset: PeriodPreset;
  customFrom: string;   // YYYY-MM-DD
  customTo: string;     // YYYY-MM-DD
  selectedSalonId: string | null; // when filtering by specific salon
}

const initialState: FinancesState = {
  activeTab: 'all',
  periodPreset: 'month',
  customFrom: '',
  customTo: '',
  selectedSalonId: null,
};

function computeDates(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  let from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (preset === 'week') from.setDate(now.getDate() - 7);
  if (preset === 'quarter') from.setMonth(now.getMonth() - 3);
  if (preset === 'year') from.setMonth(now.getMonth() - 12);
  return {
    from: from.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

const financesSlice = createSlice({
  name: 'finances',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<IncomeSourceType>) {
      state.activeTab = action.payload;
    },
    setPeriodPreset(state, action: PayloadAction<PeriodPreset>) {
      state.periodPreset = action.payload;
      if (action.payload !== 'custom') {
        const dates = computeDates(action.payload);
        state.customFrom = dates.from;
        state.customTo = dates.to;
      }
    },
    setCustomPeriod(state, action: PayloadAction<{ from: string; to: string }>) {
      state.periodPreset = 'custom';
      state.customFrom = action.payload.from;
      state.customTo = action.payload.to;
    },
    setSelectedSalonId(state, action: PayloadAction<string | null>) {
      state.selectedSalonId = action.payload;
    },
  },
});

export const { setActiveTab, setPeriodPreset, setCustomPeriod, setSelectedSalonId } = financesSlice.actions;
export default financesSlice.reducer;
```

- [ ] **Step 2: Register in store**

Add to the root reducer in `frontend/src/app/store.ts` (or wherever `combineReducers` lives):

```typescript
import financesReducer from '@/entities/master-finances/model/financesSlice';

// inside combineReducers:
finances: financesReducer,
```

- [ ] **Step 3: Verify**

```bash
cd frontend && npm run build
```

Expected: Build succeeds.

---

## Task 10: Frontend — UI components

**Files:**
- Create all under `frontend/src/entities/master-finances/ui/`

### 10.1 `formatCurrency.ts`

```typescript
// frontend/src/entities/master-finances/ui/formatCurrency.ts
export function formatCents(cents: number): string {
  const rubles = cents / 100;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rubles);
}

export function formatCompactCents(cents: number): string {
  const rubles = cents / 100;
  if (rubles >= 1_000_000) return `${(rubles / 1_000_000).toFixed(1)} млн ₽`;
  if (rubles >= 1_000) return `${(rubles / 1_000).toFixed(0)} тыс ₽`;
  return `${rubles.toFixed(0)} ₽`;
}
```

### 10.2 `FinancialSummaryCards.tsx`

Three MUI `Card` components in a `Grid` row (responsive: 1 col mobile, 3 cols desktop).

- **Income card**: green accent, icon `EmojiEvents`, value from `useGetFinancialSummaryQuery`.data?.income_cents
- **Expenses card**: red accent, icon `ShoppingCart`, value from `.expenses_cents`
- **Profit card**: blue accent (red text if negative), icon `TrendingUp`, value from `.profit_cents`

Each card shows label + formatted amount via `formatCompactCents`. Pulls `from/to/source` params from Redux slice selectors + derived values.

### 10.3 `IncomeSourceTabs.tsx`

MUI `Tabs` component with options:
- «Все» → `activeTab = 'all'`
- «Личные» → `activeTab = 'personal'`
- Dynamic salon tabs (fetch salon list from existing RTK endpoint, render one tab per active salon)

Switches `activeTab` via `setActiveTab(dispatch)`. When a specific salon tab is clicked, sets `selectedSalonId` and passes it as `source` param to aggregation queries.

### 10.4 `TrendChart.tsx`

Line chart using `@mui/x-charts/LineChart`.
- Gets data from `useGetIncomeTrendQuery` with params derived from Redux slice (`customFrom`, `customTo`, `activeTab`).
- Two series: income (green line, area fill semi-transparent) and expenses (red line, area fill semi-transparent).
- X-axis: dates (`{ d: entry.date }`).
- Tooltip: tooltip formatter shows both income and expenses for the hovered date.
- Empty state: centered MUI `Typography` «Нет данных за этот период».
- Height: 280px, responsive width.

### 10.5 `TopServicesChart.tsx`

Bar chart using `@mui/x-charts/BarChart`.
- Gets data from `useGetTopServicesQuery`.
- X-axis: service names (truncated to 12 chars with ellipsis).
- Y-axis: revenue (`{ v: entry.revenue_cents, label: formatCompactCents(entry.revenue_cents) }`).
- Single series, blue color.
- Shows nothing or empty placeholder if fewer than 1 service.

### 10.6 `ExpenseList.tsx`

Table view using MUI DataGrid (`@mui/x-data-grid`).
- Columns:
  - `expense_date` — Date column, formatted `DD.MM.YYYY`
  - `category_name` — Rendered as emoji + text (if category exists, else «Без категории»)
  - `amount_cents` — Formatted via `formatCents`, right-aligned, red color
  - `description` — Truncated text, tooltip on overflow
  - `actions` — Edit / Delete icon buttons
- Pagination handled via RTK Query offset/limit (DataGrid pagination model → map to query params).
- Filter chips above table: date range picker, category dropdown («Все категории», «Только с категорией», «Без категории»).
- 「+ Расход」 FAB button (floating action) opens `ExpenseFormDrawer`.

### 10.7 `ExpenseFormDrawer.tsx`

MUI `Drawer` (anchor: right, width: 400px).
- Fields:
  - `DatePicker` for expense date (required)
  - Number input for amount (required, min=1)
  - Autocomplete select for category (optional, list from `useListExpenseCategoriesQuery`)
  - Autocomplete select for appointment (optional, list from existing appointments API, filtered to completed)
  - Textarea for description (optional, max 500 chars)
- Save calls `useCreateExpenseMutation` or `useUpdateExpenseMutation` depending on whether `expenseId` prop is passed.
- On success: closes drawer, invalidates expense + summary caches.
- Cancel simply sets `open={false}`.

### 10.8 `ExpenseCategoryManager.tsx`

Section rendered inline above the expense list.
- Lists categories as MUI `ListItem` items with:
  - Emoji display
  - Category name
  - Up/down arrow buttons for reordering (calls `useUpdateExpenseCategoryMutation` with incremented/decremented `sort_order`)
  - Pencil icon → inline rename
  - Trash icon → delete with confirmation dialog
- 「Добавить категорию」button at top → expands inline text input + checkbox for emoji → calls `useCreateExpenseCategoryMutation`.

### 10.9 `NpdExportButton.tsx`

Simple MUI `Button` labeled «Экспорт для НПД» with download icon.
On click opens `NpdExportDialog` (in `frontend/src/features/npd-export/ui/NpdExportDialog.tsx`).

**Dialog fields:**
- Month/year picker (`<input type="month">`)
- Format selector: CSV / PDF (PDF = future, currently CSV only)
- «Сформировать отчёт» button
- Calls `useExportNPDQuery({ month, format: 'csv' })`
- On blob receipt: creates `<a>` element, triggers download as `beautica_npd_YYYY-MM.csv`

**CSV content:**
```
Дата,Услуга,Клиент,Доход (₽),Расходы (₽),Прибыль (₽)
01.05.2026,Маникюр классический,Иванова А.,3500,0,3500
03.05.2026,Расходники,,0,450,-450
...
Итого,,,,,,,,45000,3200,41800
```

Daily trend computed client-side from `getIncomeTrend` + `listExpenses` data fetched before export.

- [ ] **Step 10: Compile check**

```bash
cd frontend && npm run build
```

Expected: All TSX compiles without errors. Install any missing peer deps (`@mui/x-charts`, `@mui/x-date-pickers`, `@mui/x-data-grid`).

---

## Task 11: Integrate finances into master-dashboard page

**Files:**
- Modify: `frontend/src/pages/master-dashboard/ui/MasterDashboardPage.tsx`

- [ ] **Step 1: Add to navigation sidebar**

Find the SIDEBAR_NAV array/object. Add an 8th item after reviews:

```typescript
import { MoneyOutlined } from '@mui/icons-material';

{
  id: 'finances',
  label: 'Финансы',
  icon: <MoneyOutlined />,
},
```

- [ ] **Step 2: Update TITLES mapping**

```typescript
const TITLES: Record<string, string> = {
  // ... existing entries ...
  finances: 'Финансы',
};
```

- [ ] **Step 3: Render finances section**

Import all finance components:

```typescript
import {
  FinancialSummaryCards,
  IncomeSourceTabs,
  TrendChart,
  TopServicesChart,
  ExpenseList,
  ExpenseCategoryManager,
  NpdExportButton,
} from '@/entities/master-finances';
```

In the main content area, when `currentSection === 'finances'`:

```tsx
{currentSection === 'finances' && (
  <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
    {/* Header */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h5" fontWeight="bold">Финансы</Typography>
      <NpdExportButton />
    </Box>

    {/* Income source tabs */}
    <IncomeSourceTabs />

    {/* Summary cards */}
    <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
      <FinancialSummaryCards />
    </Box>

    {/* Trend chart */}
    <Paper sx={{ p: 2, mt: 4 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Динамика доходов и расходов
      </Typography>
      <TrendChart />
    </Paper>

    {/* Top services */}
    <Paper sx={{ p: 2, mt: 4 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Топ услуг по выручке
      </Typography>
      <TopServicesChart />
    </Paper>

    {/* Expenses section */}
    <Paper sx={{ p: 2, mt: 4 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Расходы
      </Typography>
      <ExpenseCategoryManager />
      <Box sx={{ mt: 2 }}>
        <ExpenseList />
      </Box>
    </Paper>
  </Box>
)}
```

- [ ] **Step 4: Backend route registration**

In `backend/internal/controller/master_dashboard_controller.go` (or wherever routes are mounted), register the finances subrouter under the master-auth middleware:

```go
// In app.go or router setup:
financesHandler := controller.NewFinancesHandler(masterDashboardService)

apiV1.HandleFunc("/master/finances/categories", financesHandler.ListCategories)
apiV1.HandleFunc("/master/finances/categories", financesHandler.CreateCategory)
apiV1.HandleFunc("/master/finances/categories/{category_id}", financesHandler.UpdateCategory)
apiV1.HandleFunc("/master/finances/categories/{category_id}", financesHandler.DeleteCategory)
apiV1.HandleFunc("/master/finances/expenses", financesHandler.ListExpenses)
apiV1.HandleFunc("/master/finances/expenses", financesHandler.CreateExpense)
apiV1.HandleFunc("/master/finances/expenses/{expense_id}", financesHandler.UpdateExpense)
apiV1.HandleFunc("/master/finances/expenses/{expense_id}", financesHandler.DeleteExpense)
apiV1.HandleFunc("/master/finances/summary", financesHandler.GetFinancialSummary)
apiV1.HandleFunc("/master/finances/trend", financesHandler.GetIncomeTrend)
apiV1.HandleFunc("/master/finances/top-services", financesHandler.GetTopServices)
apiV1.HandleFunc("/master/finances/npd-export", financesHandler.ExportNPD)
```

All routes protected by existing JWT auth middleware (`AuthMiddleware`).

- [ ] **Step 5: Compile check**

```bash
cd backend && go build ./... && cd ../frontend && npm run build
```

Expected: Both compile cleanly. Navigate to finances section in browser → all charts and tables load.

---

## Task 12: Documentation updates

**Files:**
- Modify: `docs/vault/architecture/db-schema.md`
- Modify: `docs/vault/architecture/frontend.md`
- Modify: `docs/vault/product/status.md`
- Optionally: `docs/vault/architecture/adr-XXX-master-financial-tracker.md`

- [ ] **Step 1: Document DB schema**

In `db-schema.md`, add section «Master Financial Tracker Tables»:

| Table | Purpose | Key columns | Indexes |
|-------|---------|-------------|---------|
| `master_expense_categories` | User-defined expense categories per master | `master_profile_id`, `name`, `emoji`, `sort_order` | `(master_profile_id, sort_order)` |
| `master_expenses` | Expense entries, optionally linked to appointment or category | `master_profile_id`, `category_id`, `appointment_id`, `amount_cents`, `expense_date` | `(master_profile_id, expense_date DESC)`, `(appointment_id)`, `(category_id)` |

Notes: cascade delete on both tables referenced by `master_profiles(id)`. Category → expenses via FK (SET NULL on delete). Appointment → expenses via FK (SET NULL on delete).

- [ ] **Step 2: Document frontend entity**

In `frontend.md`, add entry for `entities/master-finances/`:

```markdown
### entities/master-finances/
Provides RTK Query API, Redux slice, and UI primitives for the financial tracker.

| File | Purpose |
|------|---------|
| `model/masterFinancesApi.ts` | RTK Query endpoints for categories, expenses, summary, trend, top services, NPД export |
| `model/financesSlice.ts` | Redux state for active filter tab (personal/salon/all), period preset, custom date range |
| `ui/FinancialSummaryCards.tsx` | Three summary cards: income, expenses, profit |
| `ui/IncomeSourceTabs.tsx` | Tab bar switching between personal, all, and per-salons views |
| `ui/TrendChart.tsx` | Line chart: daily income vs expenses over selected period |
| `ui/TopServicesChart.tsx` | Bar chart: services ranked by revenue |
| `ui/ExpenseList.tsx` | Paginated DataGrid of expenses with filter chips |
| `ui/ExpenseFormDrawer.tsx` | Slide-in form for creating/editing expenses |
| `ui/ExpenseCategoryManager.tsx` | Inline category list with reorder, rename, delete |
| `ui/NpdExportButton.tsx` | Button → modal for generating NPД monthly CSV |
| `ui/formatCurrency.ts` | Ruble formatting utilities |
```

- [ ] **Step 3: Update product status**

In `docs/vault/product/status.md`, under active features:

```markdown
### Added: Финансовый трекер мастера (Tier 1 magnet)
- Автоматический подсчёт дохода из завершённых записей
- Ручное добавление расходов с пользовательскими категориями
- Дашборд: выручка / расходы / чистая прибыль
- Графики динамики (линейный) и топ-услуг (столбчатый)
- Экспорт отчёта для НПД (CSV)
- **План:** `docs/superpowers/plans/2026-05-04-master-financial-tracker.md`
- **JTBD-обоснование:** §6 #3 из `docs/analysis/jtbd-master-features-2026-05.md`
- **Приоритет:** Tier 1 — магнит привлечения соло-мастеров
```

- [ ] **Step 4: ADR (optional)**

Create `docs/vault/architecture/adr-XXX-master-financial-tracker.md`:

```markdown
# ADR: Мастерский финансовый трекер в отдельных таблицах

**Статус:** Accepted
**Дата:** 2026-05-04

## Контекст
Мастерам нужен персональный P&L — доход минус расходы — но одновременно есть опасение, что салон увидит их личные финансовые данные.

## Решение
Создать отдельные таблицы `master_expense_categories` и `master_expenses`, привязанные к `master_profiles.id`. Все запросы форсятся через `master_profile_id` из JWT-контекста. Доход вычисляется из `appointments.status='completed'` без участия салона.

## Последствия
- **+** Четкое разделение данных мастера и салона, нет риска утечки
- **+** Мастер может использовать трекер независимо от присутствия в салоне
- **–** Некоторые SQL-запросы для combined income дублируются между мастерским и салонным дашбордами
- **–** Новые миграции и новый API-суперфис добавляют площадь кода
```

---

## Task 13: Verification & Testing

- [ ] **Backend — compile and test**

```bash
cd backend && go build ./...
cd backend && go test ./... -v -count=1
```

Expected: All existing tests pass. Add focused tests:

**Repository tests** (`master_finances_repository_test.go`):
- `TestListExpenseCategories` — mock GORM, assert correct order by `sort_order`
- `TestCreateExpense` — assert insert with auto-generated UUID
- `TestGetFinancialSummary` — verify income + expenses calculation on sample data
- `TestGetIncomeTrend` — verify FULL OUTER JOIN combines income and expense days correctly
- `TestDeleteExpenseCategory_with_orphaned_expenses` — verify orphaned expenses keep `category_id` (SET NULL)

**Controller tests** (`finances_handler_test.go`):
- `TestListExpenses_validJwt` — httptest with valid JWT → 200 with expected JSON shape
- `TestCreateExpense_invalidAmount` — POST with `amount_cents <= 0` → 400
- `TestGetFinancialSummary_missingParams` — GET without `from`/`to` → 400
- `TestRoute_unauthorized` — no JWT → 401

- [ ] **Frontend — lint**

```bash
cd frontend && npm run lint
```

Expected: Zero lint errors.

- [ ] **Frontend — build**

```bash
cd frontend && npm run build
```

Expected: Production build succeeds. No warnings about uninstalled `@mui/x-charts`, `@mui/x-data-grid`, `@mui/x-date-pickers`.

- [ ] **Manual QA checklist**

1. `docker compose up -d && cd backend && go run ./cmd/api`
2. Log in as a master user, navigate to «Финансы» tab
3. Create 3 expense categories: «Расходники 🧴», «Аренда 🏢», «Такси 🚕»
4. Verify categories appear in the manager section with emojis and correct order
5. Reorder categories using up/down arrows → verify `sort_order` updates
6. Manually add 4 expenses: two with categories, one without, one linked to appointment
7. Mark an existing appointment as "completed" (via admin or direct DB update)
8. Verify summary cards: income reflects completed appointments, expenses reflect entered amounts, profit = difference
9. Switch between «Все / Личные / Салон» tabs → verify summary and charts update
10. Change period preset (week/month/quarter/year) → verify chart data refreshes
11. Click edit on an expense → verify drawer opens pre-filled → change amount → save → verify update
12. Delete an expense → verify removal from list + summary recalculates
13. Click «Экспорт для НПД» → pick month → generate CSV → open in spreadsheet → verify columns: Дата, Услуга, Клиент, Доход, Расходы, Прибыль
14. Verify network tab: all RTK queries hit `/master/finances/*` endpoints
15. Test on mobile viewport (Chrome DevTools iPhone SE) → layout should stack cards vertically, charts should be readable