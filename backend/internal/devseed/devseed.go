// Package devseed fills the database with a large demo salon when DEV_DEMO_SEED is enabled.
// Intended for local development only. Deletes and recreates the demo salon on each API startup.
package devseed

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const (
	demoOwnerPhone  = "+79001000001"
	demoSalonID     = "11111111-1111-1111-1111-111111111111"
	redirectSalonID = "22222222-2222-2222-2222-222222222222"
	demoExternalID  = "141373143068690"
)

var demoSalonUUID = uuid.MustParse(demoSalonID)
var redirectSalonUUID = uuid.MustParse(redirectSalonID)

type svcSeed struct {
	name   string
	slug   string
	nameRu string
	dur    int
	price  int64
}

// Run deletes the demo salon (and cascaded rows), demo users, then inserts a fresh dataset.
func Run(ctx context.Context, db *gorm.DB, log *zap.Logger) error {
	log.Info("DEV_DEMO_SEED: resetting demo salon", zap.String("salon_id", demoSalonID))

	if err := db.WithContext(ctx).Exec("DELETE FROM salons WHERE id = ?", demoSalonUUID).Error; err != nil {
		return fmt.Errorf("delete demo salon: %w", err)
	}
	if err := db.WithContext(ctx).Exec("DELETE FROM salons WHERE id = ?", redirectSalonUUID).Error; err != nil {
		return fmt.Errorf("delete redirect salon: %w", err)
	}
	if err := db.WithContext(ctx).Exec(
		`DELETE FROM appointments
		 WHERE client_user_id IN (
		   SELECT id FROM users WHERE phone_e164 = ? OR phone_e164 LIKE '+79001002%%'
		 )`,
		demoOwnerPhone,
	).Error; err != nil {
		return fmt.Errorf("delete demo appointments by users: %w", err)
	}
	if err := db.WithContext(ctx).Exec(
		"DELETE FROM users WHERE phone_e164 = ? OR phone_e164 LIKE '+79001002%%'",
		demoOwnerPhone,
	).Error; err != nil {
		return fmt.Errorf("delete demo users: %w", err)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	ownerID := uuid.New()
	ownerName := "Владелец (dev)"
	owner := model.User{
		ID:          ownerID,
		PhoneE164:   demoOwnerPhone,
		DisplayName: &ownerName,
		GlobalRole:  "salon_owner",
	}
	if err := db.WithContext(ctx).Create(&owner).Error; err != nil {
		return fmt.Errorf("create owner: %w", err)
	}

	salonName := "Beauty Lab — демо"
	salonDesc := "Автозаполнение при старте API (DEV_DEMO_SEED). Много мастеров, услуг и записей."
	addr := "Москва, ул. Примерная, 1"
	phone := "+74951230001"
	cat := "hair"
	rating := 4.75
	reviews := 184
	salon := model.Salon{
		ID:                   demoSalonUUID,
		NameOverride:         &salonName,
		Description:          &salonDesc,
		Timezone:             "Europe/Moscow",
		PhonePublic:          &phone,
		Address:              &addr,
		CategoryID:           &cat,
		OnlineBookingEnabled: true,
		SlotDurationMinutes:  30,
		CachedRating:         &rating,
		CachedReviewCount:    &reviews,
	}
	if err := db.WithContext(ctx).Create(&salon).Error; err != nil {
		return fmt.Errorf("create salon: %w", err)
	}
	external := model.SalonExternalID{
		SalonID:    demoSalonUUID,
		Source:     "2gis",
		ExternalID: demoExternalID,
	}
	if err := db.WithContext(ctx).Create(&external).Error; err != nil {
		return fmt.Errorf("create salon_external_ids: %w", err)
	}

	member := model.SalonMember{
		SalonID: demoSalonUUID,
		UserID:  ownerID,
		Role:    "owner",
	}
	if err := db.WithContext(ctx).Create(&member).Error; err != nil {
		return fmt.Errorf("create salon_member: %w", err)
	}

	redirectSalonName := "Барбершоп Brothers"
	redirectAddr := "ул. Арбат, 35"
	redirectCategory := "barber"
	redirectBusinessType := "venue"
	redirect := model.Salon{
		ID:                   redirectSalonUUID,
		NameOverride:         &redirectSalonName,
		Timezone:             "Europe/Moscow",
		Address:              &redirectAddr,
		CategoryID:           &redirectCategory,
		BusinessType:         &redirectBusinessType,
		OnlineBookingEnabled: false,
	}
	if err := db.WithContext(ctx).Create(&redirect).Error; err != nil {
		return fmt.Errorf("create redirect salon: %w", err)
	}

	// Slug + name_ru match system rows in service_categories (migration 000010).
	services := []svcSeed{
		{"Стрижка женская", "hair_cuts", "Стрижки", 60, 350000},
		{"Стрижка мужская", "hair_cuts", "Стрижки", 45, 250000},
		{"Окрашивание полное", "hair_coloring", "Окрашивание", 180, 650000},
		{"Мелирование", "hair_highlights", "Мелирование и балаяж", 210, 720000},
		{"Укладка / уход", "hair_styling", "Укладки и причёски", 45, 200000},
		{"Кератиновое выпрямление", "hair_straightening", "Выпрямление и кератин", 150, 550000},
		{"Маникюр классика", "nails_manicure", "Маникюр", 90, 180000},
		{"Маникюр + гель-лак", "nails_gel_polish", "Покрытие гель-лак", 120, 280000},
		{"Педикюр", "nails_pedicure", "Педикюр", 105, 320000},
		{"Наращивание ногтей", "nails_extensions", "Наращивание ногтей", 150, 420000},
		{"Брови коррекция", "brows_correction", "Коррекция бровей", 45, 120000},
		{"Брови окрашивание", "brows_coloring", "Окрашивание бровей", 60, 150000},
		{"Ламинирование ресниц", "lashes_lamination", "Ламинирование ресниц", 90, 380000},
		{"Массаж лица", "skin_massage_face", "Массаж лица", 50, 220000},
		{"Чистка лица", "skin_cleansing", "Чистка лица", 75, 450000},
		{"Депиляция", "depil_wax_sugar", "Шугаринг и восковая депиляция", 40, 160000},
		{"SPA-уход", "spa_programs", "СПА-программы", 120, 520000},
		{"Консультация стилиста", "hair_cuts", "Стрижки", 30, 0},
	}

	serviceIDs := make([]uuid.UUID, len(services))
	for i, s := range services {
		id := uuid.New()
		serviceIDs[i] = id
		price := s.price
		slug := s.slug
		catRu := s.nameRu
		svc := model.SalonService{
			ID:              id,
			SalonID:         demoSalonUUID,
			Name:            s.name,
			Category:        &catRu,
			CategorySlug:    &slug,
			DurationMinutes: s.dur,
			PriceCents:      &price,
			IsActive:        true,
			SortOrder:       i,
		}
		if err := db.WithContext(ctx).Create(&svc).Error; err != nil {
			return fmt.Errorf("create service %s: %w", s.name, err)
		}
	}

	staffSpecs := []struct {
		name  string
		role  string
		level string
		color string
	}{
		{"Анна Волкова", "Стилист", "master", "#D8956B"},
		{"Мария Соколова", "Колорист", "senior", "#B088F9"},
		{"Елена Орлова", "Мастер ногтевого сервиса", "master", "#4ECDC4"},
		{"Ольга Лебедева", "Бровист", "master", "#6BCB77"},
		{"Дмитрий Новиков", "Барбер", "master", "#FFD93D"},
		{"Ирина Морозова", "Лашмейкер", "senior", "#FF8FAB"},
		{"Светлана Кузнецова", "Косметолог", "top", "#FF6B6B"},
		{"Ксения Фёдорова", "Универсал", "trainee", "#4ECDC4"},
	}

	staffIDs := make([]uuid.UUID, len(staffSpecs))
	for i, sp := range staffSpecs {
		id := uuid.New()
		staffIDs[i] = id
		masterID := uuid.New()
		bio := fmt.Sprintf("Опыт работы %d+ лет. Запись через дашборд — демо.", 3+i)
		specs := pq.StringArray([]string{})
		if i%3 == 0 {
			specs = pq.StringArray([]string{"haircut", "colorist"})
		} else if i%3 == 1 {
			specs = pq.StringArray([]string{"nail_master"})
		} else {
			specs = pq.StringArray([]string{"stylist"})
		}
		years := 3 + i
		mp := model.MasterProfile{
			ID:                masterID,
			DisplayName:       sp.name,
			Bio:               &bio,
			Specializations:   specs,
			YearsExperience:   &years,
			CachedReviewCount: 0,
			IsActive:          true,
		}
		if err := db.WithContext(ctx).Create(&mp).Error; err != nil {
			return fmt.Errorf("create master_profile: %w", err)
		}
		st := model.SalonMaster{
			ID:                    id,
			SalonID:               demoSalonUUID,
			MasterID:              &masterID,
			DisplayName:           sp.name,
			Role:                  &sp.role,
			Level:                 &sp.level,
			Color:                 &sp.color,
			DashboardAccess:       i%2 == 0,
			TelegramNotifications: true,
			IsActive:              true,
			Status:                "active",
		}
		if err := db.WithContext(ctx).Create(&st).Error; err != nil {
			return fmt.Errorf("create staff: %w", err)
		}
		// Link each staff to several services (unique pairs).
		n := 4 + rng.Intn(5)
		picked := make(map[uuid.UUID]struct{})
		for len(picked) < n {
			si := rng.Intn(len(serviceIDs))
			picked[serviceIDs[si]] = struct{}{}
		}
		for svcID := range picked {
			link := model.SalonMasterService{SalonMasterID: id, ServiceID: svcID}
			if err := db.WithContext(ctx).Create(&link).Error; err != nil {
				return fmt.Errorf("staff_services: %w", err)
			}
		}
	}

	// Salon working hours Mon–Sat 10:00–21:00, Sun closed.
	for d := 0; d < 7; d++ {
		closed := d == 6
		wh := model.WorkingHour{
			ID:        uuid.New(),
			SalonID:   demoSalonUUID,
			DayOfWeek: int16(d),
			OpensAt:   "10:00:00",
			ClosesAt:  "21:00:00",
			IsClosed:  closed,
		}
		if !closed {
			bs, be := "13:00:00", "14:00:00"
			wh.BreakStartsAt = &bs
			wh.BreakEndsAt = &be
		}
		if err := db.WithContext(ctx).Create(&wh).Error; err != nil {
			return fmt.Errorf("working_hours: %w", err)
		}
	}

	// Per-staff schedules (aligned with salon).
	for _, sid := range staffIDs {
		for d := 0; d < 7; d++ {
			dayOff := d == 6
			opens, closes := "10:00:00", "20:00:00"
			if d == 5 && !dayOff {
				closes = "18:00:00"
			}
			swh := model.SalonMasterHour{
				ID:            uuid.New(),
				SalonMasterID: sid,
				DayOfWeek:     int16(d),
				OpensAt:       opens,
				ClosesAt:      closes,
				IsDayOff:      dayOff,
			}
			if err := db.WithContext(ctx).Create(&swh).Error; err != nil {
				return fmt.Errorf("staff_working_hours: %w", err)
			}
		}
	}

	// Client users (registered "клиенты").
	const nClients = 120
	clientIDs := make([]uuid.UUID, nClients)
	for i := 0; i < nClients; i++ {
		cid := uuid.New()
		clientIDs[i] = cid
		// +79001002xxx — unique within demo range
		phone := fmt.Sprintf("+7900100%04d", 2000+i)
		nm := fmt.Sprintf("Клиент %d", i+1)
		u := model.User{
			ID:          cid,
			PhoneE164:   phone,
			DisplayName: &nm,
			GlobalRole:  "client",
		}
		if err := db.WithContext(ctx).Create(&u).Error; err != nil {
			return fmt.Errorf("create client user: %w", err)
		}
	}

	loc, _ := time.LoadLocation("Europe/Moscow")
	now := time.Now().In(loc)
	statuses := []string{
		"pending", "confirmed", "completed", "cancelled_by_client", "cancelled_by_salon", "no_show",
	}
	weights := []int{12, 35, 40, 5, 5, 3}

	// ~320 appointments over [-45d, +21d]
	const nAppts = 320
	for i := 0; i < nAppts; i++ {
		dayOff := -45 + rng.Intn(67)
		h := 9 + rng.Intn(11)
		m := []int{0, 15, 30, 45}[rng.Intn(4)]
		startLocal := time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, loc)
		startLocal = startLocal.AddDate(0, 0, dayOff)

		si := rng.Intn(len(serviceIDs))
		svcID := serviceIDs[si]
		dur := services[si].dur
		stID := staffIDs[rng.Intn(len(staffIDs))]
		endLocal := startLocal.Add(time.Duration(dur) * time.Minute)

		st := pickWeighted(rng, statuses, weights)

		ap := model.Appointment{
			ID:            uuid.New(),
			SalonID:       &demoSalonUUID,
			ServiceID:     svcID,
			SalonMasterID: &stID,
			StartsAt:      startLocal.UTC(),
			EndsAt:        endLocal.UTC(),
			Status:        st,
		}

		if rng.Intn(10) < 6 {
			cid := clientIDs[rng.Intn(len(clientIDs))]
			ap.ClientUserID = &cid
		} else {
			gn := fmt.Sprintf("Гость %d", i+1)
			gp := fmt.Sprintf("+7900300%04d", rng.Intn(10000))
			ap.GuestName = &gn
			ap.GuestPhoneE164 = &gp
		}

		if err := db.WithContext(ctx).Create(&ap).Error; err != nil {
			return fmt.Errorf("create appointment: %w", err)
		}
	}

	log.Info("DEV_DEMO_SEED: demo data ready",
		zap.String("login_phone", demoOwnerPhone),
		zap.String("linked_external_id", demoExternalID),
		zap.Int("services", len(services)),
		zap.Int("staff", len(staffSpecs)),
		zap.Int("clients", nClients),
		zap.Int("appointments", nAppts),
	)
	return nil
}

func pickWeighted(rng *rand.Rand, vals []string, w []int) string {
	sum := 0
	for _, x := range w {
		sum += x
	}
	n := rng.Intn(sum)
	acc := 0
	for i, x := range w {
		acc += x
		if n < acc {
			return vals[i]
		}
	}
	return vals[0]
}
