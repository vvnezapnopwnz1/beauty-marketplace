# Architecture

## 1. Дерево проекта

Исключено только: `node_modules`, `vendor`, `.git`, `dist`, `build`.

```text
./
  .env
  .gitignore
  AGENTS.md
  CLAUDE.md
  Makefile
  README.md
  docker-compose.yml
  postgresql_schema_entities_ca34e703.plan.md
  .claude/
    README.md
  .cursor/
    debug-1c4e7d.log
    plans/
      search_v2_merged.plan.md
      archive/
        2gis_search_optimization_5e0a9628.plan.md
        search_quality_improvements_f63429b2.plan.md
    rules/
      00-core.mdc
      10-workflow.mdc
  backend/
    .dockerignore
    .env
    Dockerfile
    go.mod
    go.sum
    cmd/
      api/
        main.go
    internal/
      app/
        app.go
      auth/
        jwt.go
        middleware.go
      config/
        config.go
      controller/
        auth_controller.go
        dashboard_controller.go
        geo_controller.go
        health_controller.go
        master_controller.go
        master_dashboard_controller.go
        places_controller.go
        salon_client_controller.go
        salon_controller.go
        search_controller.go
        server.go
      errs/
        auth.go
        catalog.go
      infrastructure/
        persistence/
          appointment_repository.go
          auth_repository.go
          health_repository.go
          master_public_repository.go
          master_dashboard_repository.go
          postgres.go
          salon_client_repository.go
          salon_mapper.go
          salon_repository.go
          model/
            models.go
        twogis/
          catalog_adapter.go
          catalog_adapter_test.go
      logger/
        logger.go
      model/
        enums.go
        places.go
        salon.go
        search.go
      repository/
        appointment.go
        auth.go
        health.go
        master_public.go
        master_dashboard.go
        salon.go
        salon_client.go
      requestid/
        context.go
      service/
        auth.go
        booking.go
        dashboard.go
        dashboard_appointment.go
        dashboard_helpers.go
        dashboard_schedule.go
        dashboard_service_mgmt.go
        dashboard_staff.go
        dashboard_stats.go
        dashboard_types.go
        geo.go
        geo_service.go
        health.go
        master_public.go
        master_dashboard.go
        places.go
        salon.go
        salon_client_service.go
        search.go
    migrations/
      000001_initial_schema.down.sql
      000001_initial_schema.up.sql
      000002_phase2.down.sql
      000002_phase2.up.sql
      000003_frontend_align.down.sql
      000003_frontend_align.up.sql
      000004_auth.down.sql
      000004_auth.up.sql
      000005_guest_appointments.down.sql
      000005_guest_appointments.up.sql
      000006_external_ids.down.sql
      000006_external_ids.up.sql
      000015_salon_clients.down.sql
      000015_salon_clients.up.sql
      000016_salon_clients_seed_backfill.down.sql
      000016_salon_clients_seed_backfill.up.sql
  docs/
    2gis-api-reference-ru.md
    2gis-integration-report.md
    booksy-mockup.html
    compass_artifact_wf-ab3d3264-ff37-4613-b3da-287a4c6af676_text_markdown.md
    competitive-analysis.md
    context-ranking-logic.md
    context-search-requirements.md
    beautica-v2-redesign.html
    context.md
    discovery-catalog-strategy.md
    entity_prototype.md
    intergration_verify_report.md
    plan-unified-search.md
    search-architecture-and-behavior.md
    search.md
    status.md
  frontend/
    .dockerignore
    .env
    .gitignore
    .prettierrc
    Dockerfile
    README.md
    eslint.config.ts
    index.html
    package-lock.json
    package.json
    tsconfig.app.json
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
    yarn.lock
    public/
      favicon.svg
      icons.svg
    src/
      main.tsx
      vite-env.d.ts
      app/
        App.tsx
        store.ts
      assets/
        hero.png
        react.svg
        vite.svg
      entities/
        place/
          index.ts
          lib/
            placeDetailToSalon.ts
          ui/
            PlaceCard.tsx
        salon/
          index.ts
          model/
            mockData.ts
            types.ts
          ui/
            SalonCard.tsx
        search/
          index.ts
          lib/
            bentoGradients.ts
          ui/
            SearchResultCard.tsx
            SearchResultCardSkeleton.tsx
      features/
        auth-by-phone/
          model/
            authSlice.ts
          ui/
            OtpStep.tsx
            PhoneStep.tsx
        guest-booking/
          ui/
            GuestBookingDialog.tsx
            PublicSlotPicker.tsx
        location/
          lib/
            effectiveSearchCoords.ts
          model/
            locationSlice.ts
          ui/
            CityPickerModal.tsx
            DeviceLocationSync.tsx
            GeoLocationStorageWatcher.tsx
            LocationBootstrap.tsx
        search-salons/
          model/
            searchSlice.ts
          ui/
            CategoryFilter.tsx
            FilterRow.tsx
            SearchBar.tsx
      pages/
        dashboard/
          ui/
            DashboardPage.tsx
        login/
          ui/
            LoginPage.tsx
        place/
          ui/
        salon/
          ui/
            SalonPage.tsx
        master/
          ui/
            MasterPage.tsx
        search/
          lib/
            calcFeaturedScore.ts
          ui/
            MapSidebar.tsx
            MapToggleButton.tsx
            PromoBanner.tsx
            SearchPage.tsx
      shared/
        api/
          authApi.ts
          geoApi.ts
          placesApi.ts
          salonApi.ts
          searchApi.ts
        config/
          routes.ts
        hooks/
        i18n/
          index.ts
          locales/
            ru.json
        lib/
          apiPublicUrl.ts
          formatPhone.ts
          locationStorage.ts
        theme/
          index.ts
        ui/
          NavBar.tsx
  observability/
    vector/
      vector.yaml
```

## 2. Бэкенд (Go)

### Request ID и корреляция с фронтом

- Пакет `backend/internal/requestid` хранит в контексте значения заголовков `X-Request-ID`, `X-Client-Request-ID`, `X-Client-Action` (см. комментарии в [`context.go`](../backend/internal/requestid/context.go)).
- Публичные запросы с главной (unified search, places) передают клиентские заголовки из фронтенда — см. использование в `searchApi.ts` / `placesApi.ts` (§3).

### Точка входа и DI-контейнер

- Entry point: `backend/cmd/api/main.go`
  - `godotenv.Load(".env", "../.env", "../../.env")`
  - `app.New().Run()`
- DI/Fx graph: `backend/internal/app/app.go`
  - `fx.Provide`:
    - `config.Load`
    - `applogger.New`
    - `persistence.NewDB`
    - `persistence.NewHealthRepository`
    - `persistence.NewSalonRepository`
    - `persistence.NewAppointmentRepository`
    - `persistence.NewDashboardRepository`
    - `persistence.NewMasterPublicRepository`
    - `persistence.NewMasterDashboardRepository`
    - `persistence.NewSalonClientRepository`
    - `persistence.NewAuthRepository` as `repository.AuthRepository`
    - `twogis.NewCatalogAdapter` as `service.PlacesProvider`
    - `provideJWTManager` -> `auth.NewJWTManager`
    - `service.NewPlacesService`
    - `service.NewSearchService`
    - `service.NewGeoService`
    - `service.NewHealthService`
    - `service.NewSalonService`
    - `service.NewBookingService`
    - `service.NewDashboardService`
    - `service.NewMasterPublicService`
    - `service.NewMasterDashboardService`
    - `service.NewSalonClientService`
    - `service.NewAuthService`
    - `controller.NewHealthController`
    - `controller.NewSalonController`
    - `controller.NewPlacesController`
    - `controller.NewSearchController`
    - `controller.NewGeoController`
    - `controller.NewAuthController`
    - `controller.NewSalonClientController`
    - `controller.NewDashboardController`
    - `controller.NewMasterController`
    - `controller.NewMasterDashboardController`
    - `controller.NewHTTPServer`
  - `fx.Invoke(func(*http.Server){})` для материализации сервера.

### HTTP-роуты (method + path + handler)

Источник регистрации: `backend/internal/controller/server.go` и method guards в контроллерах.

- `GET /health` -> `HealthController.Health`
- `GET /api/v1/salons` -> `SalonController.ListSalons`
- `GET /api/v1/salons/{id}` -> `SalonController.getSalonByID` (через `SalonController.SalonRoutes`)
- `GET /api/v1/salons/{id}/masters` -> `SalonController.listPublicSalonMasters` (публично; активные `salon_masters` + `master_profiles` + услуги, см. `service/master_public.go`)
- `POST /api/v1/salons/{id}/bookings` -> `SalonController.createGuestBooking` (через `SalonController.SalonRoutes`; тело: `serviceId` (первая услуга) и опционально `serviceIds` для нескольких услуг; опц. `startsAt`/`endsAt`/`salonMasterId`/`masterProfileId` — иначе сервис сам подбирает первый слот в ближайшие 7 дней или возвращает `ErrBookingUnavailable`; вставка `appointments` + строки `appointment_line_items` со снимком цены/длительности)
- `GET /api/v1/salons/{id}/slots?date=&serviceId=&serviceIds=&masterProfileId=&salonMasterId=` -> `SalonController.listPublicSlots` (публичный пикер слотов, ответ `{date, slotDurationMinutes, slots[], masters[]}`; `serviceIds` — UUID через запятую (до 10), длительность слота = сумма услуг с оверрайдами мастера; мастера без полного набора услуг отфильтровываются; сузить мастера можно **либо** `masterProfileId`, **либо** `salonMasterId` — при передаче обоих — **400** `use only one of masterProfileId or salonMasterId`)
- `GET /api/v1/dashboard/slots?date=&serviceId=&salonMasterId=` -> `DashboardController.listDashboardSlots` (JWT, тот же формат ответа)
- `GET /api/v1/masters/{masterProfileId}` -> `MasterController.MasterRoutes` → `MasterPublicService.GetMasterProfilePublic`
- `GET /api/v1/places/search` -> `PlacesController.SearchPlaces`
- `GET /api/v1/places/item/{id}` -> `PlacesController.GetPlaceByID`
- `GET /api/v1/search` -> `SearchController.Search`
- `GET|POST|PATCH|PUT|DELETE /api/v1/dashboard/...` -> `auth.RequireAuth` + `DashboardController.DashboardRoutes` (записи, услуги, мастера, расписание, статистика, профиль салона)
  - **Клиенты (CRM):** `GET /api/v1/dashboard/clients?search=&tag_ids=&page=&page_size=`, `GET /clients/:id`, `PUT /clients/:id`, `GET /clients/:id/appointments`, `GET /clients/tags`, `POST /clients/tags`, `POST /clients/:id/tags`, `DELETE /clients/:id/tags/:tagId`, `POST /clients/:id/merge` — все через `SalonClientController.HandleClients`
- `GET|POST|PUT /api/v1/master-dashboard/...` -> `auth.RequireAuth` + `MasterDashboardController.MasterDashboardRoutes` (кабинет мастера: профиль, инвайты, салоны, записи; без привязанного `master_profiles.user_id` — 403)
- `GET /api/v1/geo/region` -> `GeoController.ResolveRegion`
- `GET /api/v1/geo/cities` -> `GeoController.SearchCities`
- `GET /api/v1/geo/reverse` -> `GeoController.ReverseGeocode`
- `POST /api/auth/otp/request` -> `AuthController.RequestOTP` (`withCORS`)
- `POST /api/auth/otp/verify` -> `AuthController.VerifyOTP` (`withCORS`)
- `POST /api/auth/refresh` -> `AuthController.Refresh` (`withCORS`)
- `GET /api/auth/me` -> `auth.RequireAuth(jwtMgr, AuthController.Me)` (`withCORS`; в JSON поле `masterProfileId`, если у пользователя есть активный `master_profiles` с `user_id`)
- `POST /api/auth/logout` -> `auth.RequireAuth(jwtMgr, AuthController.Logout)` (`withCORS`)

### Модели/сущности с полями

#### Domain модели (`backend/internal/model`)

- `PlacesSearchInput`: `Query`, `Category`, `RegionID`, `RubricIDs`, `Lat`, `Lon`, `RadiusM`, `Locale`, `Page`, `PageSize`, `HasRating`, `HasReviews`, `HasPhotos`, `WorkTimeNow`
- `PlacesSearchResult`: `Items`, `Total`, `Meta`
- `PlacesSearchMeta`: `RegionID`, `RubricFilterUsed`, `FallbackMode`
- `PlaceItem`: `ExternalID`, `Name`, `Address`, `Lat`, `Lon`, `PhotoURL`, `Rating`, `ReviewCount`, `RubricNames`
- `PlaceContact`: `Type`, `Value`, `Label`
- `PlaceScheduleDay`: `Day`, `WorkingHours[{From, To}]`, `Is247`, `Comment`
- `PlaceDetail`: `ExternalID`, `Name`, `Address`, `FullAddressName`, `Lat`, `Lon`, `Description`, `PhotoURLs`, `Rating`, `ReviewCount`, `RubricNames`, `OrgName`, `BrandName`, `ScheduleComment`, `Schedule247`, `WeeklySchedule`, `Contacts`, `TwoGisAlias`
- `Salon`: `ID`, `ExternalIDs`, `NameOverride`, `AddressOverride`, `Timezone`, `Description`, `PhonePublic`, `OnlineBookingEnabled`, `CategoryID`, `BusinessType`, `Lat`, `Lng`, `Address`, `District`, `PhotoURL`, `Badge`, `CardGradient`, `Emoji`, `CachedRating`, `CachedReviewCount`, `CreatedAt`
- `ServiceLine`: `ID`, `Name`, `DurationMinutes`, `PriceCents`
- `ServiceDTO`: `ID`, `Name`, `DurationMinutes`, `PriceCents`
- `SalonDTO`: `ID`, `Name`, `Category`, `BusinessType`, `Rating`, `ReviewCount`, `DistanceKm`, `Address`, `District`, `Services`, `AvailableToday`, `OnlineBooking`, `PhotoURL`, `Badge`, `CardGradient`, `Emoji`
- `SearchResultItem`: `ExternalID`, `Name`, `Address`, `Lat`, `Lon`, `PhotoURL`, `Rating`, `ReviewCount`, `RubricNames`, `DistanceKm`, `Category`, `SalonID`, `OnlineBooking`, `Services`
- `SearchResult`: `Items`, `Total`
- `SearchInput`: `UserLat`, `UserLon`, `RegionID`, `Category`, `Page`, `PageSize`
- Enums (`backend/internal/model/enums.go`):
  - `GlobalRole`: `client`, `salon_owner`, `master`, `advertiser`, `admin`
  - `AppointmentStatus`: `pending`, `confirmed`, `cancelled_by_client`, `cancelled_by_salon`, `completed`, `no_show`
  - `SalonMemberRole`: `owner`, `admin`
  - `SubscriptionPlan`: `free`, `paid`
  - `SubscriptionStatus`: `active`, `expired`, `trial`

#### Persistence модели (`backend/internal/infrastructure/persistence/model/models.go`)

- `SalonExternalID`: `SalonID`, `Source`, `ExternalID`, `Meta`, `SyncedAt`
- `User`: `ID`, `PhoneE164`, `DisplayName`, `GlobalRole`, `CreatedAt`
- `Salon`: `ID`, `ExternalIDs`, `NameOverride`, `AddressOverride`, `Timezone`, `Description`, `PhonePublic`, `OnlineBookingEnabled`, `CategoryID`, `BusinessType`, `Lat`, `Lng`, `Address`, `District`, `PhotoURL`, `Badge`, `CardGradient`, `Emoji`, `CachedRating`, `CachedReviewCount`, `CreatedAt`
- `SalonMember`: `SalonID`, `UserID`, `Role`
- `Staff`: `ID`, `SalonID`, `DisplayName`, `IsActive`, `CreatedAt`
- `SalonService` (`services`): `ID`, `SalonID`, `Name`, `DurationMinutes`, `PriceCents`, `IsActive`, `SortOrder`, `Category`, `CategorySlug`, `Description` (см. миграции dashboard)
- `WorkingHour`: `ID`, `SalonID`, `DayOfWeek`, `OpensAt`, `ClosesAt`, `ValidFrom`, `ValidTo`
- `SalonSubscription`: `ID`, `SalonID`, `Plan`, `Status`, `CurrentPeriodEnd`, `ExternalPaymentRef`, `PaymentProvider`, `CreatedAt`
- `Appointment`: `ID`, `SalonID`, `ClientUserID`, `GuestName`, `GuestPhoneE164`, `StaffID`, `ServiceID`, `SalonClientID`, `StartsAt`, `EndsAt`, `Status`, `ClientNote`, `CreatedAt`, `UpdatedAt`
- `SalonClient`: `ID`, `SalonID`, `UserID`, `PhoneE164`, `DisplayName`, `Notes`, `CreatedAt`, `UpdatedAt`
- `SalonClientTag`: `ID`, `SalonID` (nullable — системные), `Name`, `Color`, `CreatedAt`
- `SalonClientTagAssignment`: `SalonClientID`, `TagID` (composite PK)
- `UserTelegramIdentity`: `UserID`, `TelegramUserID`, `TelegramChatID`, `LinkedAt`
- `Review`: `ID`, `AppointmentID`, `Rating`, `Body`, `ResponseText`, `CreatedAt`
- `WaitlistEntry`: `ID`, `UserID`, `SalonID`, `ServiceID`, `DesiredFrom`, `DesiredTo`, `Status`, `CreatedAt`
- `OtpCode`: `ID`, `PhoneE164`, `Code`, `Attempts`, `ExpiresAt`, `Used`, `CreatedAt`
- `RefreshToken`: `ID`, `UserID`, `TokenHash`, `ExpiresAt`, `Revoked`, `CreatedAt`

### Интерфейсы (включая PlacesProvider и OTPSender)

- `PlacesProvider` (`backend/internal/service/places.go`):
  - `SearchNearby(ctx context.Context, in model.PlacesSearchInput) (*model.PlacesSearchResult, error)`
  - `GetByExternalID(ctx context.Context, externalID, locale string) (*model.PlaceDetail, error)`
- `PlacesService` (`backend/internal/service/places.go`)
- `SearchService` (`backend/internal/service/search.go`)
- `SalonService` (`backend/internal/service/salon.go`)
- `BookingService` (`backend/internal/service/booking.go`)
- `GeoService` (`backend/internal/service/geo_service.go`)
- `HealthService` (`backend/internal/service/health.go`)
- Repository interfaces:
  - `AuthRepository` (`backend/internal/repository/auth.go`)
  - `SalonRepository` (`backend/internal/repository/salon.go`)
  - `MasterPublicRepository` (`backend/internal/repository/master_public.go`) — публичные списки мастеров салона и профиль мастера
  - `MasterDashboardRepository` (`backend/internal/repository/master_dashboard.go`) — claiming по телефону, кабинет мастера (профиль, инвайты, записи по `master_id`)
  - `AppointmentRepository` (`backend/internal/repository/appointment.go`) — `Create`, `CreateWithLineItems`, `FindServiceForSalon`, `FindByMasterInRange` (активные записи мастера за интервал, статусы `cancelled_*` / `no_show` исключены)
  - `BookingSlotsRepository` (`backend/internal/repository/booking_slots.go`) — `GetSalonMeta`, `ListActiveSalonMasters`, `GetSalonMaster`, `GetSalonMasterByProfileID`, `GetMasterWorkingHour`, `GetServiceDurationOverride`, `GetMasterServiceOverrides`, `ListSalonMastersCoveringServices` для генерации слотов и мульти-услуги
  - `SalonClientRepository` (`backend/internal/repository/salon_client.go`) — `ListBysalon`, `GetByID`, `Create`, `Update`, `GetOrCreateByPhone`, `GetOrCreateByUserID`, `MergeGuestToUser`, `ListTags`, `CreateTag`, `AssignTag`, `RemoveTag`, `ListClientAppointments`
  - `HealthRepository` (`backend/internal/repository/health.go`)
- `OTPSender`:
  - отдельный интерфейс `OTPSender` в коде отсутствует;
  - в `backend/internal/service/auth.go` есть `TODO` на интеграцию SMS-провайдера.

### План `track2-booking-slots` и фактическая модель (имена таблиц)

В [`docs/plans/track2-booking-slots.md`](plans/track2-booking-slots.md) в алгоритме `GetAvailableSlots` встречается **`staff_working_hours`**. В репозитории это **не отдельная актуальная таблица под таким именем**: в миграции [`000012_master_profiles.up.sql`](../backend/migrations/000012_master_profiles.up.sql) таблица **`staff_working_hours` переименована в `salon_master_hours`**. Именно **`salon_master_hours`** читает `BookingSlotsRepository.GetMasterWorkingHour` при расчёте слотов.

| Что в плане track2 (смысл)                                                              | Где в коде / БД                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Рабочие часы мастера в салоне, перерыв, выходной (`staff_working_hours` в тексте плана) | Таблица **`salon_master_hours`** (строка на `(salon_master_id, day_of_week)`, поля `opens_at` / `closes_at`, перерыв, `is_day_off`). Репозиторий: [`booking_slots_repository.go`](../backend/internal/infrastructure/persistence/booking_slots_repository.go) (`GetMasterWorkingHour`). |
| Длительность услуги и оверрайд у мастера                                                | **`services.duration_minutes`** и **`salon_master_services`** (`duration_override_minutes`, `price_override_cents`) — `GetMasterServiceOverrides` / `GetServiceDurationOverride`.                                                                                                       |
| Шаг сетки                                                                               | **`salons.slot_duration_minutes`** — `GetSalonMeta`.                                                                                                                                                                                                                                    |
| Занятые окна                                                                            | **`appointments`** по `salon_master_id` — `AppointmentRepository.FindByMasterInRange`.                                                                                                                                                                                                  |

**Не смешивать с `working_hours`:** в БД есть отдельная таблица **`working_hours`** — это расписание **салона** (`salon_id`), а не недельные строки мастера для генерации слотов в `BookingService.GetAvailableSlots` (логика трека 2 опирается на **`salon_master_hours`**).

### Структура БД (таблицы и колонки из миграций)

Финальная схема после `000001`..`000006`:

- `users`: `id`, `phone_e164`, `display_name`, `global_role`, `created_at`
- `salons`: `id`, `name_override`, `address_override`, `timezone`, `description`, `phone_public`, `online_booking_enabled`, `category_id`, `business_type`, `lat`, `lng`, `address`, `district`, `photo_url`, `badge`, `card_gradient`, `emoji`, `cached_rating`, `cached_review_count`, `created_at`
- `salon_external_ids`: `salon_id`, `source`, `external_id`, `meta`, `synced_at`
- `salon_members`: `salon_id`, `user_id`, `role`
- `salon_masters` (ранее `staff`): `id`, `salon_id`, `master_id` → `master_profiles`, `display_name`, `color`, `status` (`active`/`pending`/`inactive`), `is_active`, и др.; `master_profiles`: независимый профиль мастера (`bio`, `specializations`, `phone_e164`, …)
- `services`: `id`, `salon_id`, `name`, `duration_minutes`, `price_cents`, `is_active`, `sort_order`, `category`, `category_slug`, `description`
- `service_categories`: системный справочник категорий услуг (см. миграция `000010`)
- `working_hours`: `id`, `salon_id`, `day_of_week`, `opens_at`, `closes_at`, `valid_from`, `valid_to`
- `salon_subscriptions`: `id`, `salon_id`, `plan`, `status`, `current_period_end`, `external_payment_ref`, `payment_provider`, `created_at`
- `appointments`: `id`, `salon_id`, `client_user_id`, `guest_name`, `guest_phone_e164`, `salon_master_id`, `service_id`, `salon_client_id`, `starts_at`, `ends_at`, `status`, `client_note`, `created_at`, `updated_at`
- `appointment_line_items`: `id`, `appointment_id`, `service_id`, `service_name`, `duration_minutes`, `price_cents`, `sort_order`, `created_at` (снимок на момент записи; миграция `000014`)
- `salon_clients`: `id`, `salon_id`, `user_id` (nullable), `phone_e164` (nullable), `display_name`, `notes`, `created_at`, `updated_at` (миграция `000015`; unique index по `(salon_id, user_id)` и по `(salon_id, phone_e164)`)
- `salon_client_tags`: `id`, `salon_id` (nullable — системные теги), `name`, `color`, `created_at` (миграция `000015`; unique `(salon_id, name)`)
- `salon_client_tag_assignments`: `salon_client_id`, `tag_id` (composite PK; миграция `000015`)
- `user_telegram_identities`: `user_id`, `telegram_user_id`, `telegram_chat_id`, `linked_at`
- `reviews`: `id`, `appointment_id`, `rating`, `body`, `response_text`, `created_at`
- `waitlist_entries`: `id`, `user_id`, `salon_id`, `service_id`, `desired_from`, `desired_to`, `status`, `created_at`
- `otp_codes`: `id`, `phone_e164`, `code`, `attempts`, `expires_at`, `used`, `created_at`
- `refresh_tokens`: `id`, `user_id`, `token_hash`, `expires_at`, `revoked`, `created_at`

### Внешние зависимости (где и как вызываются)

- 2GIS Catalog API:
  - `backend/internal/infrastructure/twogis/catalog_adapter.go`
    - `GET https://catalog.api.2gis.com/3.0/items`
    - `GET https://catalog.api.2gis.com/3.0/items/byid`
    - `http.DefaultClient`, key через query param `key=...`
  - `backend/internal/service/geo_service.go`
    - `GET https://catalog.api.2gis.com/2.0/region/search`
    - `GET https://catalog.api.2gis.com/3.0/items/geocode`
    - `GET https://catalog.api.2gis.com/3.0/items`
- PostgreSQL: `backend/internal/infrastructure/persistence/postgres.go` (`gorm.Open(postgres.Open(cfg.DSN), ...)`)
- JWT: `backend/internal/auth/jwt.go` (`github.com/golang-jwt/jwt/v5`, HS256)
- Telegram:
  - HTTP/API интеграции нет;
  - есть только таблица/модель `user_telegram_identities`.

## 3. Фронтенд (React)

### Все роуты

Источник: `frontend/src/app/App.tsx`, `frontend/src/shared/config/routes.ts`.

- `/` -> `SearchPage`: основной поиск и выдача
- `/salon/:id` -> `SalonPage`: детальная страница салона
- `/place/:externalId` -> `SalonPage`: детальная страница места (через загрузку place + маппинг в формат salon)
- `/login` -> `LoginPage`: авторизация phone/OTP
- `/dashboard` -> `DashboardPage`: кабинет салона; секции через `?section=`: overview, calendar, appointments, services, staff, schedule, profile, **clients**
  - `/dashboard/staff/:staffId` -> `StaffDetailView` (карточка мастера)
  - `/dashboard/clients/:clientId` -> `ClientDetailView` (CRM-профиль клиента)
- `/master-dashboard` -> `MasterDashboardPage`: кабинет мастера (JWT + `masterProfileId` в сессии; иначе редирект на `/`)

### Redux store: slices, actions, thunks

Store: `frontend/src/app/store.ts`

- Reducers:
  - `search` -> `searchSlice.reducer`
  - `auth` -> `authSlice.reducer`
  - `location` -> `locationSlice.reducer`

`searchSlice` (`frontend/src/features/search-salons/model/searchSlice.ts`):

- state: `query`, `category`, `onlyAvailableToday`, `onlineOnly`, `openNow`, `highRating`, `sortBy` (`popular` | `nearby` | `rating`)
- actions: `setQuery`, `setCategory`, `toggleAvailableToday`, `toggleOnlineOnly`, `toggleOpenNow`, `toggleHighRating`, `setSortBy`, `resetFilters`
- thunks: нет

`authSlice` (`frontend/src/features/auth-by-phone/model/authSlice.ts`):

- state: `step`, `phone`, `token`, `user`, `loading`, `error`
- actions: `backToPhone`
- thunks:
  - `sendOtp(phone)` -> `requestOTP`
  - `confirmOtp({phone, code})` -> `verifyOTP`, затем `storeTokens`
  - `loadMe()` -> `fetchMe`
  - `logout()` -> `logoutApi`

`locationSlice` (`frontend/src/features/location/model/locationSlice.ts`):

- state: `city`, `pickerOpen`, `device`, `addressLine`, `addressLevel`
- actions: `setCity`, `clearCity`, `openCityPicker`, `closeCityPicker`, `setDeviceLocation`, `setAddressLine`, `setAddressLevel`
- thunks: нет

### API-файлы и вызываемые эндпоинты

`frontend/src/shared/api/authApi.ts`:

- `POST /api/auth/otp/request` body `{ phone }`
- `POST /api/auth/otp/verify` body `{ phone, code }`
- `POST /api/auth/refresh` body `{ refreshToken }`
- `GET /api/auth/me` (Bearer token; ответ включает `masterProfileId` при наличии профиля мастера)
- `POST /api/auth/logout` (Bearer token)
- base: `import.meta.env.VITE_API_URL ?? ''`

`frontend/src/shared/api/masterDashboardApi.ts`:

- `GET|PUT /api/v1/master-dashboard/profile`
- `GET /api/v1/master-dashboard/invites`, `POST .../invites/:id/accept|decline`
- `GET /api/v1/master-dashboard/salons`
- `GET /api/v1/master-dashboard/appointments` (query `from`, `to`, `status` — даты `YYYY-MM-DD`; поле `serviceName` в элементах списка — как в дашборде салона: агрегат имён из `appointment_line_items` при наличии строк, иначе имя основной услуги)
- base через `publicApiUrl`

`frontend/src/shared/api/geoApi.ts`:

- `GET /api/v1/geo/region?lat=&lon=`
- `GET /api/v1/geo/cities?q=`
- `GET /api/v1/geo/reverse?lat=&lon=`
- base через `publicApiUrl(path)`

`frontend/src/shared/api/placesApi.ts`:

- `GET /api/v1/places/item/:externalId`
- `GET /api/v1/places/search` params: `q`, `lat`, `lon`, optional `region_id`, `radius`, `page`, `page_size`, `category`
- headers: `X-Client-Request-ID`, `X-Client-Action`

`frontend/src/shared/api/salonApi.ts`:

- `GET /v1/salons` params optional: `lat`, `lon`, `category`, `online_only`
- `GET /v1/salons/:salonId`
- `GET /v1/salons/by-external?source=2gis&id=...` — lookup связанного платформенного салона для внешнего place id
- `GET /v1/salons/:salonId/masters` — публичный список мастеров салона
- `GET /v1/masters/:masterProfileId` — публичный профиль мастера и салоны
- `GET /v1/salons/:salonId/slots?date=YYYY-MM-DD&serviceId=` или `&serviceIds=uuid,uuid` + `masterProfileId` или `salonMasterId` (не оба)
- `POST /v1/salons/:salonId/bookings` body `{ serviceId, serviceIds?, name, phone, note?, startsAt?, endsAt?, salonMasterId?, masterProfileId? }` (`serviceIds` — несколько услуг; `serviceId` = первая из списка)
- base: `import.meta.env.VITE_API_BASE ?? ''` (в `.env` это `/api`, итоговые URL: `/api/v1/...`)

`frontend/src/shared/api/searchApi.ts`:

- `GET /api/v1/search` params: `lat`, `lon`, `category`, optional `region_id`, `page`, `page_size`
- headers: `X-Client-Request-ID`, `X-Client-Action`

`frontend/src/shared/api/clientsApi.ts`:

- `GET /api/v1/dashboard/clients?search=&tag_ids=&page=&page_size=`
- `GET /api/v1/dashboard/clients/:id`
- `PUT /api/v1/dashboard/clients/:id` body `{ displayName?, notes? }`
- `GET /api/v1/dashboard/clients/:id/appointments?page=&page_size=`
- `GET /api/v1/dashboard/clients/tags`
- `POST /api/v1/dashboard/clients/tags` body `{ name, color }`
- `POST /api/v1/dashboard/clients/:id/tags` body `{ tagId }`
- `DELETE /api/v1/dashboard/clients/:id/tags/:tagId`
- `POST /api/v1/dashboard/clients/:id/merge` body `{ userId }`
- base через `publicApiUrl('/api/v1/dashboard/clients')`

### Тема: маркетплейс и кабинет

- **Бренд (глобально):** `ThemeModeProvider` + `createAppTheme` (`frontend/src/shared/theme/createAppTheme.ts`) — режимы `light` / `dark`, палитры `COLORS_LIGHT` / `COLORS_DARK` (`palettes.ts`).
- **Дашборд:** расширение MUI — `theme.palette.dashboard` (`dashboardPalette.ts`, `getDashboardPalette`), доступ в UI через `useDashboardPalette()`; списки/карточки могут использовать `useDashboardListCardSurface()` для согласованных фона и тени в светлой теме.
- **DnD в дашборде:** `@dnd-kit/react` (на dom-слое `@dnd-kit/dom`) — календарь «День»/«Неделя»: `DragDropProvider`, `useDraggable` / `useDroppable`; утилиты пересчёта времени и id — `pages/dashboard/lib/dndCalendarUtils.ts`. В `frontend/package.json` также `@dnd-kit/core` и `@dnd-kit/modifiers` для возможных ограничений оси/жестов.
- **Главная:** `SearchPage` — фон Hero зависит от режима: в светлой теме светлый градиент (cream / blush), в тёмной — прежний тёмный линейный градиент; `SearchBar` подстраивает стиль поля поиска под тот же контраст.

### Страницы и ключевые компоненты

Страницы:

- `SearchPage` (`frontend/src/pages/search/ui/SearchPage.tsx`): общий поиск (`/api/v1/search` + fallback `/api/v1/places/search`), карточки, infinite scroll, карта; Hero и строка поиска учитывают светлую/тёмную тему (см. выше).
- `SalonPage` (`frontend/src/pages/salon/ui/SalonPage.tsx`): детали салона/места, вкладки; гостевая запись через `GuestBookingDialog` — wizard **услуга → мастер** (`fetchSalonMasters`, фильтр по `services` мастера) **→ слот** (`PublicSlotPicker` / `fetchPublicSlots`: `masterProfileId` или `salonMasterId`) **→ контакты**; вход: CTA «Записаться» в hero, кнопка у услуги и «Записаться онлайн» в сайдбаре — всегда с шага выбора услуги (опциональный проп `initialServiceId` в диалоге зарезервирован для других сценариев). Вкладка «Мастера» — `GET /v1/salons/:id/masters` для UUID-салона.
- `SalonPage` работает в dual-mode:
  - `salon` режим (`/salon/:id`) — услуги/мастера/онлайн-запись;
  - `place` режим (`/place/:externalId`) — данные 2GIS, CTA «Позвонить»;
  - при открытии `/place/:externalId` выполняется lookup `/v1/salons/by-external`; если внешний id уже связан, происходит `replace`-redirect на `/salon/:id`.
- `MasterPage` (`frontend/src/pages/master/ui/MasterPage.tsx`): публичный профиль мастера (`/master/:masterProfileId`), `GET /v1/masters/:id`.
- `LoginPage` (`frontend/src/pages/login/ui/LoginPage.tsx`): phone/OTP flow.
- `DashboardPage` (`frontend/src/pages/dashboard/ui/DashboardPage.tsx`): кабинет салона; секции overview, calendar, appointments, services, staff, schedule, profile, **clients**; вложенные маршруты `/dashboard/staff/:staffId` и `/dashboard/clients/:clientId`.
- `ClientsListView` (`frontend/src/pages/dashboard/ui/ClientsListView.tsx`): таблица CRM-клиентов с поиском и фильтрацией по тегам.
- `ClientDetailView` (`frontend/src/pages/dashboard/ui/ClientDetailView.tsx`): профиль клиента + история записей; открывается по `/dashboard/clients/:clientId`.
- `MasterDashboardPage` (`frontend/src/pages/master-dashboard/ui/MasterDashboardPage.tsx`): кабинет мастера, палитра `useDashboardPalette()`.
- `AuthBootstrap` (`frontend/src/app/AuthBootstrap.tsx`): при наличии токена вызывает `loadMe()` для заполнения Redux (в т.ч. `masterProfileId`).

Ключевые UI/feature-компоненты:

- `NavBar`: навигация, локация; для авторизованных — ссылки «Кабинет салона» (роль `salon_owner`), «Кабинет мастера» (есть `masterProfileId`), «Выйти»; иначе вход / регистрация в кабинет.
- `SearchBar`, `CategoryFilter`, `FilterRow`: управление фильтрами поиска.
- `SearchResultCard`, `SearchResultCardSkeleton`, `PlaceCard`, `SalonCard`: карточки выдачи.
- **SearchPage layout**: в режиме списка — две колонки в контейнере `maxWidth` (~1180px): слева счётчик + bento-сетка, справа узкая колонка с `PromoBanner` (sticky на desktop); в режиме карты — полная ширина контента, без промо-колонки.
- **Bento**: `assignFeaturedVariants` (`pages/search/lib/calcFeaturedScore.ts`) делит выдачу на батчи по 5, выбирает featured по score; чётные батчи — `featured-vertical` (первая в батче), нечётные — `featured-horizontal` (**первая обычная, вторая — wide**, чтобы в сетке 3 колонки занимала слоты 2–3). У каждой карточки слот 0–4 задаёт градиент медиа из `bentoGradients.ts` (как `grad-1`…`grad-5` в `docs/beautica-v2-redesign.html`).
- `MapSidebar`, `MapToggleButton`: карта 2GIS + переключение список/карта.
- `GuestBookingDialog` + `PublicSlotPicker`: пошаговая гостевая запись и загрузка слотов (`features/guest-booking/ui/`).
- **`CreateAppointmentDrawer`** (`frontend/src/pages/dashboard/ui/drawers/CreateAppointmentDrawer.tsx`): боковая панель создания записи с prefill времени и мастера; заменяет модалку в контексте календаря.
- `features/reschedule-appointment/` — FSD feature-модуль: `useReschedule` (DnD-логика, оптимистичное обновление, откат), `RescheduleDragOverlay.tsx`.
- `entities/appointment/` — переиспользуемый `AppointmentBlock` (карточка записи для всех видов календаря).
- `shared/ui/DataGrid/` — обёртка MUI DataGrid (`RenderTable`, `Pagination`, `noRowsStates`, `styles`, `types`).
- `shared/ui/iconify/` — `Iconify.tsx` компонент для `@iconify/react`.
- `DeviceLocationSync`, `LocationBootstrap`, `GeoLocationStorageWatcher`, `CityPickerModal`: геолокация/город/синхронизация localStorage.

### Переменные окружения (`VITE_*`)

- В коде используются:
  - `VITE_API_URL`
  - `VITE_API_BASE`
  - `VITE_2GIS_MAP_KEY`
- В `frontend/vite.config.ts` используется `process.env.VITE_PROXY_TARGET` для proxy `/api`.
- В `frontend/.env`:
  - `VITE_API_BASE=/api`
  - `VITE_2GIS_MAP_KEY=...`
  - `VITE_API_BASE_URL` в комментарии (закомментировано)

## 4. База данных

### Список миграций и что делает каждая

- `000001_initial_schema.up.sql`: стартовая схема (enum types, core tables, индексы, триггеры/функции для appointments)
- `000001_initial_schema.down.sql`: откат стартовой схемы
- `000002_phase2.up.sql`: добавляет `reviews`, `waitlist_entries`, `payment_provider` в `salon_subscriptions`
- `000002_phase2.down.sql`: удаляет изменения phase2
- `000003_frontend_align.up.sql`: добавляет поля каталога/карточек в `salons` (`category_id`, гео, фото, badge, rating cache и др.)
- `000003_frontend_align.down.sql`: удаляет эти поля
- `000004_auth.up.sql`: auth-схема (`global_role`, `otp_codes`, `refresh_tokens` + индексы)
- `000004_auth.down.sql`: откат auth-схемы
- `000005_guest_appointments.up.sql`: гостевые записи (`client_user_id` nullable, `guest_name`, `guest_phone_e164`, check constraint client-or-guest)
- `000005_guest_appointments.down.sql`: откат гостевых изменений
- `000006_external_ids.up.sql`: нормализация внешних id в `salon_external_ids`, перенос данных из `salons.external_source/external_id`
- `000006_external_ids.down.sql`: обратная денормализация в `salons.external_source/external_id`
- Далее: `000007`–`000008` (графики staff/salon), `000009` (расширение dashboard: staff, services, слоты, перерывы), `000010` (`service_categories`, `salon_type`, `services.category_slug`), `000011` и др.; `000012` (`master_profiles`, переименование `staff` → `salon_masters`, `salon_master_services` с оверрайдами); `000013` (`salon_master_status`); `000014` (`appointment_line_items` для мульти-услуги и снимков цены); `000015` (CRM: `salon_clients`, `salon_client_tags`, `salon_client_tag_assignments`, колонка `appointments.salon_client_id`); `000016` (seed системных тегов + backfill клиентов из существующих записей) — см. `backend/migrations/`.

### Статусы записей и машина состояний

Подробная спецификация — **`docs/entities/appointment-statuses.md`**.

Коротко:

- Статусы: `pending` → `confirmed` → `completed` / `no_show` / `cancelled_by_salon`; `cancelled_by_client` зарезервирован
- Редактирование деталей разрешено только в `pending` и `confirmed`; редактирование `confirmed`-записи автоматически сбрасывает статус в `pending`
- Терминальные статусы (`completed`, `cancelled_*`, `no_show`) не редактируются и не допускают переходов
- Логика переходов: `allowedStatusTransition` в `backend/internal/service/dashboard_appointment.go`
- Защита редактирования по статусу должна быть на **бэкенде** (не только на фронтенде)

### Ключевые индексы и constraints

- Unique constraints:
  - `users(phone_e164)`
  - `salon_external_ids(source, external_id)`
  - `working_hours(salon_id, day_of_week)`
  - `reviews(appointment_id)`
  - `user_telegram_identities(telegram_user_id)`
- Partial unique index:
  - `idx_refresh_tokens_hash` on `refresh_tokens(token_hash)` where `NOT revoked`
- Важные checks:
  - `appointments_time_order` (`starts_at < ends_at`)
  - `appointments_client_or_guest` (либо user, либо guest pair)
  - `working_hours_opens_before_closes`
  - `day_of_week BETWEEN 0 AND 6`
  - `duration_minutes > 0`
  - `rating BETWEEN 1 AND 5`
- FK-связи по всем основным таблицам (`salons`, `users`, `services`, `salon_masters`, `appointments`, `reviews`, `waitlist_entries`, `refresh_tokens`, `salon_external_ids`).

## 5. Конфигурация и инфраструктура

### `docker-compose`: сервисы и порты

`docker-compose.yml`:

- `postgres` -> `5433:5432`
- `backend` -> `8080:8080`
- `frontend` -> `5173:5173`
- `openobserve` -> `5080:5080`
- `vector` -> без внешнего порта, шиппинг логов в OpenObserve

### Переменные окружения бэкенда

`backend/internal/config/config.go` читает:

- `HTTP_ADDR` (default `:8080`)
- `LOG_LEVEL` (default `development`)
- `DATABASE_DSN` (default локальный postgres DSN)
- `2GIS_API_KEY`
- `2GIS_REGION_ID` (default `32`)
- `JWT_SECRET` (default `dev-secret-change-me-in-production`)

В `docker-compose.yml` для backend задаются:

- `HTTP_ADDR`
- `LOG_LEVEL`
- `DATABASE_DSN`
- `2GIS_API_KEY` (из `TWO_GIS_API_KEY`)
- `2GIS_REGION_ID` (из `TWO_GIS_REGION_ID`)
- `JWT_SECRET`

### Скрипты запуска

- `Makefile`:
  - `up`, `down`, `rebuild`, `diagnose`, `logs`, `logs-vector`, `ps`, `restart`, `smoke-logs`
- Root `README.md`:
  - `docker compose up -d`
  - миграции через `migrate -path backend/migrations ... up`
  - backend: `cd backend && go run ./cmd/api`
  - frontend: `cd frontend && npm install && npm run dev`
- `frontend/package.json` scripts:
  - `dev`, `build`, `lint`, `preview`
- `Makefile`:
  - `seed-salon-page-dev` — импорт тестового SQL `backend/migrations/dev_seed_salon_place.sql` (через локальный `psql` или fallback в `docker compose exec postgres`)

## 6. Как работает поиск

Технически поиск построен как объединение внешнего каталога 2GIS и внутренних данных платформы. `SearchPage` на фронте формирует запросы в `searchApi` (`GET /api/v1/search`) с `lat/lon/category/region_id/page/page_size` и добавляет `X-Client-Request-ID`/`X-Client-Action`; при ошибке основного unified endpoint страница делает fallback в `placesApi` (`GET /api/v1/places/search`) и отображает place-only карточки. На бэкенде `SearchController.Search` вызывает `SearchService.Search`, который нормализует вход (`page/pageSize`, category), выбирает дефолтные координаты Москвы при отсутствии гео, транслирует категорию в query-текст (`categoryQuery`) и вызывает `PlacesService.SearchNearby`. `PlacesService` валидирует/обогащает вход, подставляет default region, при необходимости добавляет category terms к query, вызывает `PlacesProvider` (реализация `twogis.CatalogAdapter`) и при пустой выдаче может сделать повторный запрос в режиме `rubric_only`. Далее `SearchService` фильтрует шум (спам-рубрики/названия), дедуплицирует по `ExternalID`, матчингует найденные внешние id с внутренними салонами через `SalonRepository.FindByExternalIDs("2gis", ids)`, подмешивает внутренние услуги (`FindServicesBySalonIDs`), рассчитывает distance по Haversine и возвращает `SearchResultItem[]`, где часть результатов имеет `salonId` + `onlineBooking=true/false`, а часть остается только внешними place-объектами без привязки к нашей БД.

**Отрисовка на главной:** ответ преобразуется в последовательность карточек через `assignFeaturedVariants` (см. §3 выше): сетка CSS `grid-template-columns: repeat(3, 1fr)`, `grid-auto-flow: dense`, варианты с `grid-column: span 2` / `grid-row: span 2` для featured.

Бизнесово текущий поиск реализует воронку "охват внешнего рынка -> конверсия в собственную запись". Пользователь всегда получает выдачу по близости и категории даже если база собственных салонов неполная, потому что 2GIS выступает источником широкого покрытия; одновременно платформа поднимает приоритет "своих" салонов за счет обогащения карточек (ID внутри платформы, услуги, онлайн-запись), что позволяет конвертировать внешний трафик в внутренние бронирования. Категоризация (`hair`, `nails`, `spa`, etc.), гео-привязка, fallback на rubric-only и фильтрация спама уменьшают мусор в выдаче и повышают релевантность без ручной модерации каждой карточки. По сути, поиск уже работает как гибридный маркетплейс-слой: discovery приходит из внешнего справочника, монетизируемая ценность формируется там, где внешняя организация связана с внутренним salon-профилем, поддерживает онлайн-бронь и может развиваться в подписки/продвижение внутри платформы.

## 7. Кабинет салона (Dashboard)

### Бэкенд

- **Регистрация в DI** (`backend/internal/app/app.go`): `persistence.NewDashboardRepository`, `service.NewDashboardService`, `controller.NewDashboardController`; а также `persistence.NewSalonClientRepository`, `service.NewSalonClientService`, `controller.NewSalonClientController`.
- **Точка входа HTTP:** префикс `/api/v1/dashboard` (см. `DashboardController.DashboardRoutes` в [`dashboard_controller.go`](backend/internal/controller/dashboard_controller.go)); перед этим `auth.RequireAuth` и проверка членства в салоне.
- **Логика:** разбита на файлы `service/dashboard_appointment.go` (CRUD записей, машина состояний), `dashboard_schedule.go` (расписание, слоты), `dashboard_service_mgmt.go` (услуги, категории), `dashboard_staff.go` (мастера, invite), `dashboard_stats.go` (статистика), `dashboard_helpers.go` (общее), `dashboard_types.go` (DTO); клиенты — [`service/salon_client_service.go`](backend/internal/service/salon_client_service.go). **Персистенция:** [`dashboard_repository.go`](backend/internal/infrastructure/persistence/dashboard_repository.go) — `ListAppointments`: **`serviceName`** = `string_agg(appointment_line_items.service_name)` или имя основной услуги; **`service_id`** — фильтр по основной услуге и по `EXISTS` в line items; клиенты — [`salon_client_repository.go`](backend/internal/infrastructure/persistence/salon_client_repository.go).
- **Данные:** таблица `service_categories` (системный каталог slug), поля `services.category_slug`, `salons.salon_type`, `salons.slot_duration_minutes`, `salon_master_services` (связь мастер–услуга и оверрайды), `master_profiles`, расширения `salon_masters`/schedule, **`appointment_line_items`** (снимки строк мульти-услуги; миграция `000014`), **`salon_clients`** + **`salon_client_tags`** (CRM; миграции `000015`–`000016`) — см. [`docs/service-categories.md`](service-categories.md).

**Типовые группы эндпоинтов (не исчерпывающе):**

| Область                      | Методы и путь (под `/api/v1/dashboard`)                                                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Записи                       | `GET /appointments?from=&to=&status=&salon_master_id=&service_id=&page=&page_size=` (`service_id` — основная услуга **или** любая строка `appointment_line_items`), `POST /appointments`, `PUT /appointments/{id}`, `PATCH /appointments/{id}/status` |
| Услуги                       | `GET/POST/PUT/DELETE /services`, связи мастер–услуга (`salon_master_services`)                                                                                                                                                            |
| Категории услуг              | `GET /service-categories` (в т.ч. режим полного списка для валидации)                                                                                                                                                                     |
| Мастера, расписание, профиль | **`/salon-masters`** (основной путь; deprecated **`/staff`** — те же хендлеры), `PUT .../salon-masters/:id/services`, **`GET /masters/lookup`**, **`POST /master-invites`**, `/schedule`, `/salon/profile`, bundle-роуты по необходимости |
| Статистика                   | `GET /stats`                                                                                                                                                                                                                              |
| Клиенты (CRM)                | `GET /clients`, `GET /clients/:id`, `PUT /clients/:id`, `GET /clients/:id/appointments`, `GET /clients/tags`, `POST /clients/tags`, `POST /clients/:id/tags`, `DELETE /clients/:id/tags/:tagId`, `POST /clients/:id/merge`                |

### Фронтенд

- **Клиент API:** [`frontend/src/shared/api/dashboardApi.ts`](frontend/src/shared/api/dashboardApi.ts) — все вызовы кабинета; [`clientsApi.ts`](frontend/src/shared/api/clientsApi.ts) — CRM-клиенты.
- **Корневой экран:** [`DashboardPage.tsx`](frontend/src/pages/dashboard/ui/DashboardPage.tsx) — секции через `?section=`: overview, calendar, appointments, services, staff, schedule, profile, **clients**; маршруты `/dashboard/staff/:staffId` и `/dashboard/clients/:clientId`.
- **Клиенты (CRM):** [`ClientsListView.tsx`](frontend/src/pages/dashboard/ui/ClientsListView.tsx) — таблица с поиском и тегами; [`ClientDetailView.tsx`](frontend/src/pages/dashboard/ui/ClientDetailView.tsx) — профиль + история записей.
- **Услуги и категории:** [`views/ServicesView.tsx`](frontend/src/pages/dashboard/ui/views/ServicesView.tsx), [`modals/ServiceFormModal.tsx`](frontend/src/pages/dashboard/ui/modals/ServiceFormModal.tsx), [`lib/salonTypeOptions.ts`](frontend/src/pages/dashboard/lib/salonTypeOptions.ts).
- **Записи:** [`DashboardAppointments.tsx`](frontend/src/pages/dashboard/ui/DashboardAppointments.tsx) — список, создание записи — [`CreateAppointmentDrawer.tsx`](frontend/src/pages/dashboard/ui/drawers/CreateAppointmentDrawer.tsx) (боковая панель, поддерживает prefill времени и мастера), просмотр/редактирование — [`AppointmentDrawer.tsx`](frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx) (клик по строке).
- **Карточка мастера:** [`StaffDetailView.tsx`](frontend/src/pages/dashboard/ui/views/StaffDetailView.tsx) по `/dashboard/staff/:staffId` — шапка (статус, bio, специализации), таблица услуг с оверрайдами, недельное расписание, ближайшие записи; [`ScheduleDrawer.tsx`](frontend/src/pages/dashboard/ui/drawers/ScheduleDrawer.tsx) для `PUT .../salon-masters/:id/schedule`; тот же `AppointmentDrawer` по клику на запись. Редактирование мастера и услуг — [`StaffFormModal.tsx`](frontend/src/pages/dashboard/ui/modals/StaffFormModal.tsx).
- **Календарь:** [`DashboardCalendar.tsx`](frontend/src/pages/dashboard/ui/DashboardCalendar.tsx); сетки день/неделя/месяц — [`CalendarDayStaffGrid.tsx`](frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx), [`CalendarWeekGrid.tsx`](frontend/src/pages/dashboard/ui/CalendarWeekGrid.tsx), [`CalendarMonthGrid.tsx`](frontend/src/pages/dashboard/ui/CalendarMonthGrid.tsx); расчёт позиций и длительности — [`lib/calendarGridUtils.ts`](frontend/src/pages/dashboard/lib/calendarGridUtils.ts). **DnD (рефакторинг FSD):** логика вынесена в `features/reschedule-appointment/` — хук [`useReschedule`](frontend/src/features/reschedule-appointment/model/useReschedule.ts) (расчёт координат, оптимистичное обновление, откат при ошибке API), [`RescheduleDragOverlay.tsx`](frontend/src/features/reschedule-appointment/ui/RescheduleDragOverlay.tsx); утилиты [`lib/dndCalendarUtils.ts`](frontend/src/pages/dashboard/lib/dndCalendarUtils.ts); entity-слой [`entities/appointment/`](frontend/src/entities/appointment/) — переиспользуемый `AppointmentBlock`. UI-слой — `@dnd-kit/react`, сохранение через `PUT .../appointments/:id`. Реализовано: NowLine, штриховка нерабочих часов, блоки перерывов, аватарки мастеров, 3-строчные блоки событий, клик по дню → «День», индикаторы загруженности в месяце, детальный drawer записи, перенос drag-and-drop в дне и неделе с оптимистичным обновлением.

Подробнее для постановки задач агенту см. **`docs/status.md` §7**.

## 8. Что НЕ реализовано (заглушки и TODO)

### Backend

- `backend/internal/service/auth.go`
  - `TODO: send SMS via provider` (OTP реально не отправляется, только логируется)
  - `maxOTPPerMin` объявлен, но в бизнес-логике ограничения не применяется
- `backend/internal/service/booking.go` — заглушка `nextGuestSlot` («завтра 10:00») удалена; `BookingService.GetAvailableSlots` + `pickNextSlot` считают реальные слоты по расписанию мастеров и существующим записям (трек 2).
- `backend/internal/service/search.go`
  - hardcoded defaults: координаты Москвы, `categoryQuery`, `rubricCategory`
- `backend/internal/service/places.go`
  - hardcoded `categoryQueryTerms`
- `backend/internal/infrastructure/twogis/catalog_adapter.go`
  - hardcoded category->rubric maps, `maxTwoGISPageSize = 10`
- `backend/internal/controller/server.go`
  - CORS `Access-Control-Allow-Origin: *`
- `backend/internal/config/config.go`
  - insecure default `JWT_SECRET=dev-secret-change-me-in-production`

### Frontend

- `frontend/src/entities/salon/model/mockData.ts`
  - основная коллекция `mockSalons`
- `frontend/src/pages/salon/ui/SalonPage.tsx`
  - `Static mock content` (мастера, отзывы, промо, photo blocks)
  - fallback загрузки из `mockSalons` для не-UUID `id`
  - map section как placeholder
- `frontend/src/pages/dashboard/ui/DashboardPage.tsx`
  - часть подразделов кабинета всё ещё упрощается по UX (resize/zoom таймлайна, конфликты слотов — см. `docs/plans/track4-dashboard-features.md`)
- `frontend/src/features/location/ui/CityPickerModal.tsx`
  - статический `DEFAULT_CITIES`
- hardcoded московские fallback-координаты:
  - `locationSlice.ts`
  - `DeviceLocationSync.tsx`
  - `effectiveSearchCoords.ts`
  - `MapSidebar.tsx`
- `frontend/src/features/search-salons/ui/FilterRow.tsx`
  - часть чипов визуальные без подключенных reducer/actions (`openNow`, `budget`, `newOnly`)

## Синхронизация с docs/status.md

Исторические расхождения закрыты: `docs/status.md` обновляется вместе с кодом. Если что-то снова разъедется — править оба файла.

Оставшиеся нюансы (зафиксированы в status):

- `user_telegram_identities` в схеме есть; продуктового использования пока нет.
- Интерфейс `OTPSender` в DI не введён — OTP логируется, доставка не подключена.
