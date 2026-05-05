package persistence

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"github.com/beauty-marketplace/backend/internal/repository"
	"gorm.io/gorm"
)

type masterDashboardRepository struct {
	db *gorm.DB
}

// NewMasterDashboardRepository constructs MasterDashboardRepository.
func NewMasterDashboardRepository(db *gorm.DB) repository.MasterDashboardRepository {
	return &masterDashboardRepository{db: db}
}

func (r *masterDashboardRepository) FindShadowMasterProfileIDByPhone(ctx context.Context, phoneE164 string) (*uuid.UUID, error) {
	var row struct {
		ID uuid.UUID `gorm:"column:id"`
	}
	err := r.db.WithContext(ctx).Raw(`
		SELECT id FROM master_profiles
		WHERE phone_e164 = ? AND user_id IS NULL AND is_active = true
		ORDER BY created_at ASC
		LIMIT 1
	`, phoneE164).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.ID == uuid.Nil {
		return nil, nil
	}
	return &row.ID, nil
}

func (r *masterDashboardRepository) ClaimMasterProfile(ctx context.Context, profileID, userID uuid.UUID, phoneE164 string) error {
	phone := phoneE164
	res := r.db.WithContext(ctx).Model(&model.MasterProfile{}).
		Where("id = ? AND user_id IS NULL", profileID).
		Updates(map[string]any{
			"user_id":    userID,
			"phone_e164": &phone,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) FindMasterProfileIDByUserID(ctx context.Context, userID uuid.UUID) (*uuid.UUID, error) {
	var row struct {
		ID uuid.UUID `gorm:"column:id"`
	}
	err := r.db.WithContext(ctx).Raw(`
		SELECT id FROM master_profiles
		WHERE user_id = ? AND is_active = true
		LIMIT 1
	`, userID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.ID == uuid.Nil {
		return nil, nil
	}
	return &row.ID, nil
}

func (r *masterDashboardRepository) GetMasterProfileByUserID(ctx context.Context, userID uuid.UUID) (*model.MasterProfile, error) {
	var mp model.MasterProfile
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND is_active = true", userID).
		First(&mp).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &mp, nil
}

func (r *masterDashboardRepository) UpdateMasterProfileByUserID(ctx context.Context, userID uuid.UUID, displayName string, bio *string, specs []string, years *int, avatar *string) error {
	arr := pq.StringArray(specs)
	if arr == nil {
		arr = pq.StringArray{}
	}
	res := r.db.WithContext(ctx).Model(&model.MasterProfile{}).
		Where("user_id = ?", userID).
		Updates(map[string]any{
			"display_name":     displayName,
			"bio":              bio,
			"specializations":  arr,
			"years_experience": years,
			"avatar_url":       avatar,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

type inviteScan struct {
	SMID      uuid.UUID `gorm:"column:salon_master_id"`
	SalonID   uuid.UUID `gorm:"column:salon_id"`
	SalonName string    `gorm:"column:salon_name"`
	SalonAddr *string   `gorm:"column:salon_address"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (r *masterDashboardRepository) ListPendingInvites(ctx context.Context, masterProfileID uuid.UUID) ([]repository.MasterInviteRow, error) {
	var scans []inviteScan
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			sm.id AS salon_master_id,
			sm.salon_id,
			COALESCE(NULLIF(TRIM(s.name_override), ''), 'Салон') AS salon_name,
			COALESCE(NULLIF(TRIM(s.address_override), ''), NULLIF(TRIM(s.address), '')) AS salon_address,
			sm.created_at
		FROM salon_masters sm
		INNER JOIN salons s ON s.id = sm.salon_id
		WHERE sm.master_id = ?
			AND sm.status = 'pending'
		ORDER BY sm.created_at DESC
	`, masterProfileID).Scan(&scans).Error
	if err != nil {
		return nil, err
	}
	out := make([]repository.MasterInviteRow, len(scans))
	for i, s := range scans {
		out[i] = repository.MasterInviteRow{
			SalonMasterID: s.SMID,
			SalonID:       s.SalonID,
			SalonName:     s.SalonName,
			SalonAddress:  s.SalonAddr,
			CreatedAt:     s.CreatedAt,
		}
	}
	return out, nil
}

type activeSalonScan struct {
	SMID      uuid.UUID  `gorm:"column:salon_master_id"`
	SalonID   uuid.UUID  `gorm:"column:salon_id"`
	SalonName string     `gorm:"column:salon_name"`
	SalonAddr *string    `gorm:"column:salon_address"`
	JoinedAt  *time.Time `gorm:"column:joined_at"`
}

func (r *masterDashboardRepository) ListActiveSalonMemberships(ctx context.Context, masterProfileID uuid.UUID) ([]repository.MasterActiveSalonRow, error) {
	var scans []activeSalonScan
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			sm.id AS salon_master_id,
			sm.salon_id,
			COALESCE(NULLIF(TRIM(s.name_override), ''), 'Салон') AS salon_name,
			COALESCE(NULLIF(TRIM(s.address_override), ''), NULLIF(TRIM(s.address), '')) AS salon_address,
			sm.joined_at
		FROM salon_masters sm
		INNER JOIN salons s ON s.id = sm.salon_id
		WHERE sm.master_id = ?
			AND sm.status = 'active'
			AND sm.is_active = true
		ORDER BY sm.joined_at ASC NULLS LAST, sm.created_at ASC
	`, masterProfileID).Scan(&scans).Error
	if err != nil {
		return nil, err
	}
	out := make([]repository.MasterActiveSalonRow, len(scans))
	for i, s := range scans {
		out[i] = repository.MasterActiveSalonRow{
			SalonMasterID: s.SMID,
			SalonID:       s.SalonID,
			SalonName:     s.SalonName,
			SalonAddress:  s.SalonAddr,
			JoinedAt:      s.JoinedAt,
		}
	}
	return out, nil
}

func (r *masterDashboardRepository) AcceptPendingInvite(ctx context.Context, masterProfileID, salonMasterID uuid.UUID) (bool, error) {
	res := r.db.WithContext(ctx).Model(&model.SalonMaster{}).
		Where("id = ? AND master_id = ? AND status = ?", salonMasterID, masterProfileID, "pending").
		Updates(map[string]any{
			"status":    "active",
			"joined_at": time.Now().UTC(),
			"is_active": true,
		})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

func (r *masterDashboardRepository) DeclinePendingInvite(ctx context.Context, masterProfileID, salonMasterID uuid.UUID) (bool, error) {
	now := time.Now().UTC()
	res := r.db.WithContext(ctx).Model(&model.SalonMaster{}).
		Where("id = ? AND master_id = ? AND status = ?", salonMasterID, masterProfileID, "pending").
		Updates(map[string]any{
			"status":    "inactive",
			"left_at":   now,
			"is_active": false,
		})
	if res.Error != nil {
		return false, res.Error
	}
	return res.RowsAffected > 0, nil
}

type expenseAmountRow struct {
	Date   time.Time `gorm:"column:date"`
	Amount int64     `gorm:"column:amount"`
}

func (r *masterDashboardRepository) ListMasterExpenseCategories(ctx context.Context, masterProfileID uuid.UUID) ([]model.MasterExpenseCategory, error) {
	var rows []model.MasterExpenseCategory
	err := r.db.WithContext(ctx).
		Where("master_profile_id = ?", masterProfileID).
		Order("sort_order ASC, created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *masterDashboardRepository) CreateMasterExpenseCategory(ctx context.Context, category *model.MasterExpenseCategory) error {
	return r.db.WithContext(ctx).Create(category).Error
}

func (r *masterDashboardRepository) UpdateMasterExpenseCategory(ctx context.Context, category *model.MasterExpenseCategory) error {
	res := r.db.WithContext(ctx).Model(&model.MasterExpenseCategory{}).
		Where("id = ? AND master_profile_id = ?", category.ID, category.MasterProfileID).
		Updates(map[string]any{
			"name":       category.Name,
			"emoji":      category.Emoji,
			"sort_order": category.SortOrder,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) DeleteMasterExpenseCategory(ctx context.Context, masterProfileID, categoryID uuid.UUID) error {
	res := r.db.WithContext(ctx).Where("id = ? AND master_profile_id = ?", categoryID, masterProfileID).
		Delete(&model.MasterExpenseCategory{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) ListMasterExpenses(ctx context.Context, masterProfileID uuid.UUID, from, to *time.Time, limit, offset int) ([]model.MasterExpense, int64, error) {
	q := r.db.WithContext(ctx).Model(&model.MasterExpense{}).
		Where("master_profile_id = ?", masterProfileID)
	if from != nil {
		q = q.Where("expense_date >= ?", *from)
	}
	if to != nil {
		q = q.Where("expense_date <= ?", *to)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []model.MasterExpense
	if err := q.Order("expense_date DESC, created_at DESC").Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *masterDashboardRepository) GetMasterExpenseByID(ctx context.Context, masterProfileID, expenseID uuid.UUID) (*model.MasterExpense, error) {
	var row model.MasterExpense
	err := r.db.WithContext(ctx).
		Where("id = ? AND master_profile_id = ?", expenseID, masterProfileID).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func (r *masterDashboardRepository) CreateMasterExpense(ctx context.Context, expense *model.MasterExpense) error {
	return r.db.WithContext(ctx).Create(expense).Error
}

func (r *masterDashboardRepository) UpdateMasterExpense(ctx context.Context, expense *model.MasterExpense) error {
	res := r.db.WithContext(ctx).Model(&model.MasterExpense{}).
		Where("id = ? AND master_profile_id = ?", expense.ID, expense.MasterProfileID).
		Updates(map[string]any{
			"category_id":    expense.CategoryID,
			"appointment_id": expense.AppointmentID,
			"amount_cents":   expense.AmountCents,
			"description":    expense.Description,
			"expense_date":   expense.ExpenseDate,
		})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) DeleteMasterExpense(ctx context.Context, masterProfileID, expenseID uuid.UUID) error {
	res := r.db.WithContext(ctx).
		Where("id = ? AND master_profile_id = ?", expenseID, masterProfileID).
		Delete(&model.MasterExpense{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) GetMasterFinanceSummary(ctx context.Context, masterProfileID uuid.UUID, source string, from, to *time.Time) (int64, int64, error) {
	var incomeRow expenseAmountRow
	incomeSQL, incomeArgs := buildFinanceSQL(source, "a.starts_at::date", from, to)
	incomeArgs = append([]interface{}{masterProfileID, masterProfileID}, incomeArgs...)
	if err := r.db.WithContext(ctx).Raw(incomeSQL, incomeArgs...).Scan(&incomeRow).Error; err != nil {
		return 0, 0, err
	}

	var expenseRow expenseAmountRow
	expenseSQL, expenseArgs := buildExpenseSQL("expense_date", from, to)
	expenseArgs = append([]interface{}{masterProfileID}, expenseArgs...)
	if err := r.db.WithContext(ctx).Raw(expenseSQL, expenseArgs...).Scan(&expenseRow).Error; err != nil {
		return 0, 0, err
	}

	return incomeRow.Amount, expenseRow.Amount, nil
}

func masterAppointmentVisibleSQL() string {
	return `((a.salon_master_id IS NOT NULL AND EXISTS (SELECT 1 FROM salon_masters sm_vis WHERE sm_vis.id = a.salon_master_id AND sm_vis.master_id = ?)) OR (a.salon_id IS NULL AND a.master_profile_id = ?))`
}

func buildFinanceSQL(source, dateColumn string, from, to *time.Time) (string, []interface{}) {
	clause := sourceFilter(source)
	dateClause, args := buildDateRangeClause(dateColumn, from, to)
	return `SELECT COALESCE(SUM(a.total_cents), 0) AS amount
FROM appointments a
WHERE ` + masterAppointmentVisibleSQL() + `
  AND a.status = 'completed'` + clause + dateClause, args
}

func buildExpenseSQL(dateColumn string, from, to *time.Time) (string, []interface{}) {
	dateClause, args := buildDateRangeClause(dateColumn, from, to)
	return `SELECT COALESCE(SUM(amount_cents), 0) AS amount
FROM master_expenses
WHERE master_profile_id = ?` + dateClause, args
}

func buildDateRangeClause(column string, from, to *time.Time) (string, []interface{}) {
	clauses := []string{}
	args := []interface{}{}
	if from != nil {
		clauses = append(clauses, column+" >= ?")
		args = append(args, *from)
	}
	if to != nil {
		clauses = append(clauses, column+" <= ?")
		args = append(args, *to)
	}
	if len(clauses) == 0 {
		return "", args
	}
	return " AND " + strings.Join(clauses, " AND "), args
}

func sourceFilter(source string) string {
	switch source {
	case "personal":
		return " AND a.salon_id IS NULL"
	case "salon":
		return " AND a.salon_id IS NOT NULL"
	default:
		return ""
	}
}

func (r *masterDashboardRepository) GetMasterRevenueTrend(ctx context.Context, masterProfileID uuid.UUID, source string, from, to *time.Time) ([]repository.RepositoryMasterRevenueTrendRow, error) {
	trendMap := map[string]repository.RepositoryMasterRevenueTrendRow{}

	var incomes []expenseAmountRow
	dateClause, dateArgs := buildDateRangeClause("a.starts_at::date", from, to)
	incomeSQL := `SELECT date(a.starts_at) AS date, COALESCE(SUM(a.total_cents), 0) AS amount
FROM appointments a
WHERE ` + masterAppointmentVisibleSQL() + `
  AND a.status = 'completed'` + sourceFilter(source) + dateClause + `
GROUP BY date(a.starts_at)
ORDER BY date(a.starts_at) ASC`
	incomeArgs := append([]interface{}{masterProfileID, masterProfileID}, dateArgs...)
	if err := r.db.WithContext(ctx).Raw(incomeSQL, incomeArgs...).Scan(&incomes).Error; err != nil {
		return nil, err
	}
	for _, row := range incomes {
		key := row.Date.Format("2006-01-02")
		trendMap[key] = repository.RepositoryMasterRevenueTrendRow{Date: row.Date, IncomeCents: row.Amount}
	}

	var expenses []expenseAmountRow
	expenseDateClause, expenseArgs := buildDateRangeClause("expense_date", from, to)
	expenseSQL := `SELECT expense_date AS date, COALESCE(SUM(amount_cents), 0) AS amount
FROM master_expenses
WHERE master_profile_id = ?` + expenseDateClause + `
GROUP BY expense_date
ORDER BY expense_date ASC`
	expenseQueryArgs := append([]interface{}{masterProfileID}, expenseArgs...)
	if err := r.db.WithContext(ctx).Raw(expenseSQL, expenseQueryArgs...).Scan(&expenses).Error; err != nil {
		return nil, err
	}
	for _, row := range expenses {
		key := row.Date.Format("2006-01-02")
		entry := trendMap[key]
		entry.Date = row.Date
		entry.ExpenseCents = row.Amount
		trendMap[key] = entry
	}

	results := make([]repository.RepositoryMasterRevenueTrendRow, 0, len(trendMap))
	for _, item := range trendMap {
		results = append(results, item)
	}
	sort.Slice(results, func(i, j int) bool {
		return results[i].Date.Before(results[j].Date)
	})
	return results, nil
}

func (r *masterDashboardRepository) GetMasterTopServices(ctx context.Context, masterProfileID uuid.UUID, source string, from, to *time.Time, limit int) ([]repository.RepositoryMasterTopServiceRow, error) {
	var rows []repository.RepositoryMasterTopServiceRow
	querySQL, queryArgs := buildTopServicesSQL(source, from, to, limit)
	queryArgs = append([]interface{}{masterProfileID, masterProfileID}, queryArgs...)
	if err := r.db.WithContext(ctx).Raw(querySQL, queryArgs...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func buildTopServicesSQL(source string, from, to *time.Time, limit int) (string, []interface{}) {
	dateClause, args := buildDateRangeClause("a.starts_at::date", from, to)
	if limit < 1 {
		limit = 10
	}
	query := `SELECT ali.service_name AS service_name, COALESCE(SUM(ali.price_cents), 0) AS income
FROM appointments a
INNER JOIN appointment_line_items ali ON ali.appointment_id = a.id
WHERE ` + masterAppointmentVisibleSQL() + ` AND a.status = 'completed'` + sourceFilter(source) + dateClause + `
GROUP BY ali.service_name
ORDER BY income DESC
LIMIT ?`
	return query, append(args, limit)
}

func (r *masterDashboardRepository) applyMasterApptFilters(q *gorm.DB, f repository.MasterAppointmentListFilter) *gorm.DB {
	if f.From != nil {
		q = q.Where("a.starts_at >= ?", *f.From)
	}
	if f.To != nil {
		q = q.Where("a.starts_at < ?", *f.To)
	}
	if f.Status != "" {
		var st []string
		for _, s := range strings.Split(f.Status, ",") {
			if t := strings.TrimSpace(s); t != "" {
				st = append(st, t)
			}
		}
		if len(st) == 1 {
			q = q.Where("a.status = ?", st[0])
		} else if len(st) > 1 {
			q = q.Where("a.status IN ?", st)
		}
	}
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("(COALESCE(NULLIF(TRIM(a.guest_name),''), users.display_name, '') ILIKE ? OR a.guest_phone_e164 ILIKE ?)", like, like)
	}
	if f.Source == "personal" {
		q = q.Where("a.salon_id IS NULL")
	} else if f.Source != "" {
		q = q.Where("a.salon_id = ?", f.Source)
	}
	return q
}

func masterApptOrderClause(sortBy, sortDir string) string {
	allowed := map[string]string{
		"starts_at":    "a.starts_at",
		"client_name":  "client_label",
		"service_name": "service_name",
		"status":       "a.status",
		"salon_name":   "salon_name",
	}
	col, ok := allowed[sortBy]
	if !ok {
		col = "a.starts_at"
	}
	dir := "DESC"
	if sortDir == "asc" {
		dir = "ASC"
	}
	return col + " " + dir
}

func (r *masterDashboardRepository) ListMasterAppointments(ctx context.Context, f repository.MasterAppointmentListFilter) ([]repository.MasterAppointmentListRow, int64, error) {
	limit := f.Limit
	if limit < 1 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	baseJoins := func(q *gorm.DB) *gorm.DB {
		return q.Table("appointments a").
			Joins("LEFT JOIN salon_masters sm ON a.salon_master_id = sm.id").
			Joins("LEFT JOIN users ON users.id = a.client_user_id").
			Where("sm.master_id = ? OR a.master_profile_id = ?", f.MasterProfileID, f.MasterProfileID)
	}

	countQ := r.applyMasterApptFilters(baseJoins(r.db.WithContext(ctx)), f)
	var total int64
	if err := countQ.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var raw []struct {
		model.Appointment
		ServiceName     string  `gorm:"column:service_name"`
		SalonName       string  `gorm:"column:salon_name"`
		ClientLabel     string  `gorm:"column:client_label"`
		ClientPhone     *string `gorm:"column:client_phone"`
		TotalPriceCents int64   `gorm:"column:total_price_cents"`
	}
	q := r.db.WithContext(ctx).Table("appointments a").
		Select(`a.*,
			COALESCE(
				(SELECT string_agg(ali.service_name, ', ' ORDER BY ali.sort_order)
				 FROM appointment_line_items ali
				 WHERE ali.appointment_id = a.id),
				s.name,
				''
			) AS service_name,
			CASE
				WHEN a.salon_id IS NULL THEN 'Личная запись'
				ELSE COALESCE(NULLIF(TRIM(sal.name_override), ''), 'Салон')
			END AS salon_name,
			COALESCE(NULLIF(TRIM(a.guest_name), ''), users.display_name, 'Гость') AS client_label,
			a.guest_phone_e164 AS client_phone,
			COALESCE(a.total_cents, 0) AS total_price_cents`).
		Joins("LEFT JOIN salon_masters sm ON a.salon_master_id = sm.id").
		Joins("LEFT JOIN services s ON s.id = a.service_id").
		Joins("LEFT JOIN salons sal ON sal.id = a.salon_id").
		Joins("LEFT JOIN users ON users.id = a.client_user_id").
		Where("sm.master_id = ? OR a.master_profile_id = ?", f.MasterProfileID, f.MasterProfileID)
	q = r.applyMasterApptFilters(q, f)
	if err := q.Order(masterApptOrderClause(f.SortBy, f.SortDir)).Limit(limit).Offset(f.Offset).Scan(&raw).Error; err != nil {
		return nil, 0, err
	}
	out := make([]repository.MasterAppointmentListRow, len(raw))
	for i := range raw {
		out[i] = repository.MasterAppointmentListRow{
			Appointment:     raw[i].Appointment,
			ServiceName:     raw[i].ServiceName,
			SalonName:       raw[i].SalonName,
			ClientLabel:     raw[i].ClientLabel,
			ClientPhone:     raw[i].ClientPhone,
			TotalPriceCents: raw[i].TotalPriceCents,
		}
	}
	return out, total, nil
}

func (r *masterDashboardRepository) ListSystemServiceCategories(ctx context.Context) ([]model.ServiceCategory, error) {
	var rows []model.ServiceCategory
	err := r.db.WithContext(ctx).
		Where("salon_id IS NULL").
		Order("parent_slug ASC, sort_order ASC, slug ASC").
		Find(&rows).Error
	return rows, err
}

func (r *masterDashboardRepository) ListMasterServices(ctx context.Context, masterProfileID uuid.UUID) ([]model.MasterService, error) {
	var rows []model.MasterService
	err := r.db.WithContext(ctx).
		Where("master_id = ?", masterProfileID).
		Order("created_at ASC").
		Find(&rows).Error
	return rows, err
}

func (r *masterDashboardRepository) GetMasterService(ctx context.Context, masterProfileID, serviceID uuid.UUID) (*model.MasterService, error) {
	var row model.MasterService
	err := r.db.WithContext(ctx).
		Where("id = ? AND master_id = ?", serviceID, masterProfileID).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func (r *masterDashboardRepository) CreateMasterService(ctx context.Context, s *model.MasterService) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *masterDashboardRepository) UpdateMasterService(ctx context.Context, s *model.MasterService) error {
	res := r.db.WithContext(ctx).Model(&model.MasterService{}).
		Where("id = ? AND master_id = ?", s.ID, s.MasterID).
		Updates(s)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) DeleteMasterService(ctx context.Context, masterProfileID, serviceID uuid.UUID) error {
	res := r.db.WithContext(ctx).
		Where("id = ? AND master_id = ?", serviceID, masterProfileID).
		Delete(&model.MasterService{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) ListMasterClients(ctx context.Context, f repository.MasterClientListFilter) ([]model.MasterClient, int64, error) {
	limit := f.Limit
	if limit < 1 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	q := r.db.WithContext(ctx).Model(&model.MasterClient{}).Where("master_profile_id = ?", f.MasterProfileID)
	if f.Search != "" {
		like := "%" + f.Search + "%"
		q = q.Where("(display_name ILIKE ? OR phone_e164 ILIKE ?)", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	allowed := map[string]string{
		"displayName": "display_name",
		"phone":       "phone_e164",
		"createdAt":   "created_at",
	}
	col, ok := allowed[f.SortBy]
	if !ok {
		col = "display_name"
	}
	dir := "ASC"
	if f.SortDir == "desc" {
		dir = "DESC"
	}

	var rows []model.MasterClient
	err := q.Order(col + " " + dir).Limit(limit).Offset(f.Offset).Find(&rows).Error
	if err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *masterDashboardRepository) GetMasterClient(ctx context.Context, masterProfileID, clientID uuid.UUID) (*model.MasterClient, error) {
	var row model.MasterClient
	err := r.db.WithContext(ctx).
		Where("id = ? AND master_profile_id = ?", clientID, masterProfileID).
		First(&row).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &row, nil
}

func (r *masterDashboardRepository) CreateMasterClient(ctx context.Context, c *model.MasterClient) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *masterDashboardRepository) UpdateMasterClient(ctx context.Context, c *model.MasterClient) error {
	res := r.db.WithContext(ctx).Model(&model.MasterClient{}).
		Where("id = ? AND master_profile_id = ?", c.ID, c.MasterProfileID).
		Updates(c)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *masterDashboardRepository) DeleteMasterClient(ctx context.Context, masterProfileID, clientID uuid.UUID) error {
	res := r.db.WithContext(ctx).
		Where("id = ? AND master_profile_id = ?", clientID, masterProfileID).
		Delete(&model.MasterClient{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
