---
title: Статус разработки
updated: 2026-05-01
source_of_truth: true
code_pointers:
  - backend/internal/app/app.go
  - frontend/src/app/App.tsx
---

# Статус разработки — Beauty Marketplace

> Дата: 2026-04-21 | Версия: pre-MVP (v0.1)

### Последние изменения (2026-05-01)

- **Discovery (продукт):** добавлена заметка [`product/discovery-plan.md`](discovery-plan.md) (раунд 1: интервью ICP 90 дней, критерии выбора сегмента); ссылка в [`README.md`](../README.md) MOC.
- **appointment.created payload:** при гостевом и ручном создании записи в `notifications.data` добавлены `guestName`/`guestPhone` для отображения контакта в snackbar (`handleIncomingNotification`, `customContent` в `ActionSnackbar`/`FormSnackbar`).
- **Гость → вход с префиллом телефона:** на экране успеха бронирования и кнопка «Войти» ведут на `/login?phone=…`; шаг телефона в OTP читает `searchParams`.
- **Дашборд UI:** фильтр мастера в `DashboardCalendar`, фильтр категории в `ServicesView` и правки палитры/Select — через семантический токен `V` (`palettes.ts`); добавлен `data-testid="services-category-filter"`; `ScheduleView`/хуки расписания: явная обработка ошибок при загрузке, прямые вызовы `fetch*`-API (без промежуточного хука).
- **Snackbars:** `ActionSnackbar`/`FormSnackbar` берут цвета вариантов из MUI-палиты с учётом light/dark, скругление 16px, тени адаптированы под режим темы.

- **Документация (vault):** обновлены [`entities/notifications.md`](../entities/notifications.md) (payload `guestName`/`guestPhone`), блок «Последние изменения» и MOC под discovery; см. также ранее: [`architecture/code-map.md`](../architecture/code-map.md), [`architecture/frontend.md`](../architecture/frontend.md), [`architecture/backend.md`](../architecture/backend.md); в корневый `.gitignore` добавлены `/backend/api` и `/Beautica 2 (2)/`. В `frontend/.gitignore` — `playwright-report/`, `test-results/`, `.claude/`.
- **Авто-аккаунт при гостевой записи:** `CreateGuestBooking` теперь создаёт/находит `users`-запись по `guest_phone_e164` и сохраняет appointment с `client_user_id` (без guest полей), удовлетворяя DB-constraint `appointments_client_or_guest`. `bookingService` получил зависимости `AuthRepository` + `TelegramLinkRepository` + `TelegramOutboxWriter`. Telegram-уведомление гостю ставится в `telegram_outbox` best-effort (если chat_id привязан). CRM: `GetOrCreateByUserID` вместо `GetOrCreateByPhone` после создания пользователя. Backfill: миграция `000027_guest_booking_auto_user` создаёт аккаунты для исторических гостевых записей и линкует `client_user_id`. `AuthRepository` расширен методом `UpdateDisplayName`. `TelegramLinkRepository` + новый `TelegramOutboxWriter` интерфейс (`QueueMessage`) — реализованы в `persistence/telegram_link_repository.go`.
- **GET /api/v1/me/appointments:** новый `UserAppointmentRepository` (interface + persistence impl с JOIN по salon/service/master/line_items + STRING_AGG), `UserAppointmentService`, handler в `UserController.handleMeAppointments`. Поддержка пагинации `?page=&page_size=`. Зарегистрированы в Fx-графе.
- **"Мои записи" на /me:** новая FSD-entity `entities/user-appointment` (types, RTK Query `useGetMyAppointmentsQuery`, `AppointmentCard` + `AppointmentCardSkeleton`). Новая секция `AppointmentsSection.tsx` (пагинированный список без RenderTable, empty state, skeleton). Добавлен таб `appointments` в `MePage.tsx`. `rtkApi` получил тег `MyAppointments`.
- **GuestBookingDialog — success UX:** вместо немедленного `onClose()` после записи переходим в step `'success'` с анимированной иконкой, текстом и кнопками «Войти» (→ `/login?phone=`) / «Закрыть». При закрытии с success-шага показывается notistack-snackbar с action-кнопкой «Войти». i18n: добавлены ключи `guestBooking.successTitle/successBody/successTelegramExtra/successProfileCardHint/successLogin/successClose/snackbarTitle/snackbarBody/snackbarAction`, `myAppointments.*`.

### Последние изменения (2026-04-30)

- **Notifications provider на уровне приложения:** подписка на `SSE` и показ snackbar входящих уведомлений вынесены из `NotificationMenuPopover` в `frontend/src/app/NotificationsProvider.tsx`, подключенный в `main.tsx`. Это убирает зависимость от рендера popover и обеспечивает обработку новых уведомлений на всех страницах авторизованного пользователя. `NotificationMenuPopover` оставлен для списка/бейджа и действий `seen/read`.
- **Dashboard calendar → новая запись:** при клике по свободному слоту в недельном или дневном календаре (`DashboardCalendar`) поле «Дата и время» в `CreateAppointmentDrawer` заполняется выбранным слотом; форма сбрасывается из `initialData` при каждом открытии drawer (раньше `useState` брал значение только при первом монтировании). Для плейсхолдера `id === 'new'` не открывается `AppointmentDrawer`, чтобы не дублировать UI и запрос детали записи.
- **Frontend snackbar crash fix:** кастомные snackbars (`ActionSnackbar`, `FormSnackbar`) теперь используют `forwardRef` и передают ref/style на DOM-обёртку, как требует notistack для transition-анимаций. Это устраняет runtime error `notistack - Custom snackbar is not refForwarding` при показе уведомлений.
- **Public booking notifications fix:** публичная запись через страницу салона (`POST /api/v1/salons/:id/bookings`) теперь создаёт in-app notification `appointment.created` для участников салона и назначенного мастера так же, как ручное создание записи из кабинета. Логика получателей вынесена в общий `AppointmentNotifier`, который переиспользуют `BookingService` и `DashboardService`; SSE `/api/v1/notifications/stream` получает событие сразу после создания уведомления.
- **Notifications seen/read upgrade:** добавлена миграция `000026_notifications_seen` (`notifications.seen_at` + индекс `idx_notifications_user_unseen`), API `POST /api/v1/notifications/:id/seen` и `POST /api/v1/notifications/seen-all`, а `GET /api/v1/notifications/unread-count` теперь возвращает оба счётчика `{ unread, unseen }`. `POST .../read` и `POST .../read-all` автоматически заполняют `seen_at`, если ранее было `NULL`. Фронтенд (`entities/notification`, `NotificationsPopover`) использует бейдж по `unseen`, отмечает `seen` при показе snackbar/открытии popover и помечает уведомление `read` после успешного CTA «Подтвердить запись».

### Последние изменения (2026-04-29)

- **Notifications MVP foundation (in-app + SSE backend):** добавлен базовый модуль уведомлений: миграция `000025_notifications` (`notifications`, `notification_preferences`, `telegram_outbox`), backend `NotificationService` + `NotificationRepository`, REST API (`GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`) и SSE stream `GET /api/v1/notifications/stream`. Уведомления о создании/смене статуса записи и по claim-flow (submitted/approved/rejected) теперь пишутся в `notifications`; фронтенд получил entity `notification` (RTK Query) и бейдж/список уведомлений в `UserMenu`.
- **Logout UX/state fix (dashboard/master/me):** после `POST /api/auth/logout` фронтенд теперь гарантированно делает переход на главную (`/`) из меню пользователя (dashboard, master-dashboard, `/me`), а клиентская очистка сессии дополнительно сбрасывает `activeSalonId` и `profile`-слайс. Это убирает кейс, когда после успешного logout UI оставался на dashboard и визуально выглядел как авторизованный.
- **Инициализация расписания при создании салона через claim:** после approve заявки салона бэкенд теперь автоматически заполняет `working_hours` для нового `salon_id`: сначала пытается построить неделю из `2GIS` (`PlaceDetail.WeeklySchedule` по `source=2gis` и `external_id`), а при недоступности/пустом графике использует fallback по умолчанию (Пн–Сб 10:00–21:00, Вс выходной). Это устраняет кейс пустого ответа `GET /api/v1/dashboard/schedule` с `workingHours: []` сразу после создания кабинета.

### Последние изменения (2026-04-28)

- **Auth bootstrap after OTP (owner menu/dashboard fix):** после `POST /api/auth/otp/verify` фронтенд теперь сразу запрашивает `GET /api/v1/me` и кладёт в `auth.user` полный `effectiveRoles` (включая `salonMemberships`). Это убирает гонку, когда в аватар-меню не показывался «Кабинет салона» до любого дополнительного действия, и предотвращает ложный редирект из `/dashboard/:salonId` на `/me` при ранней проверке membership.
- **Onboarding fixes (dashboard CTA + categories select):** в `ClaimStatusPage` кнопка «Открыть салон» после `approved` теперь ведёт в кабинет салона (`/dashboard/:salonId`), а не на публичную страницу. В `OnboardingWizard` добавлена фиксация `activeSalonId` из роута (`/dashboard/:salonId/onboarding`), чтобы `authFetch` передавал `X-Salon-Id` и список категорий в первом шаге загружался корректно.
- **Onboarding redirect race fix (salon-scoped profile fetch):** в `DashboardPage` проверка `onboardingCompleted` теперь привязана к текущему `salonId` из URL и выполняется после явной установки `activeSalonId`; это убирает возврат на шаг 1, когда после `PUT /api/v1/dashboard/salon/profile` страница дашборда успевала прочитать профиль другого салона по устаревшему `X-Salon-Id`.
- **Onboarding hardening (`X-Salon-Id` priority):** `authFetch` больше не перезаписывает явно переданный `X-Salon-Id` значением из `localStorage`; `OnboardingWizard` и `DashboardPage` передают `salonId` из роута прямо в `PUT/GET /api/v1/dashboard/salon/profile`. Это фиксирует кейс «Пропустить все»/«Перейти в кабинет», когда запрос мог сохранять или читать онбординг не того салона.
- **Onboarding persistence bugfix (backend):** в `dashboard_repository.UpdateSalonProfile` добавлено обновление колонки `onboarding_completed`. Ранее `PUT /api/v1/dashboard/salon/profile` возвращал `200 OK`, но флаг завершения онбординга не сохранялся в БД, из-за чего владелец после «Пропустить все» снова попадал на шаг 1.
- **Dev auth/e2e bootstrap endpoints:** добавлены dev-флаги `DEV_OTP_BYPASS_ANY` (логин с любым номером/кодом без сохранённого OTP) и `DEV_ENDPOINTS` (роуты `POST /api/dev/claim/by-external`, `POST /api/dev/e2e/seed-salon`). Dev-роуты выполняют fast-claim салона по `source/externalId`, создают/назначают owner-membership для указанного телефона и возвращают `salonId` + `dashboardUrl` + `tokenPair` для e2e setup. Конфиг защищён от включения dev-флагов в production.
- **Auth TTL update:** `accessToken` увеличен с 15 минут до 2 часов (`backend/internal/auth/jwt.go`), `refreshToken` оставлен 30 дней; ротация refresh при `/api/auth/refresh` и revoke на `/api/auth/logout` без изменений.
- **E2E flow-runner (Playwright + YAML):** в `frontend/e2e/` добавлена декларативная инфраструктура сценариев (`scenarios/flows.yaml`, `tests/flow-runner.spec.ts`, доменные `actions/*`, `helpers/*`, `playwright.config.ts`, `README.md`) с фильтрацией по тегам (`E2E_TAG`) и `ApiHelpers`-подготовкой данных через dev endpoint `/api/dev/e2e/seed-salon`.
- **Makefile dev/e2e tooling:** добавлены цели `backend-local-e2e`, `db-reset` (`MODE=data|full`), `e2e-test`, `e2e-test-reseed` для локального воспроизводимого запуска e2e и быстрого сброса тестовых данных БД.
- **Релиз в `master`:** код и волт синхронизированы с описанным ниже блоком 2026-04-27 (персонал, инвайты, multi-salon UI). Миграция `000024_staff_management`, модуль `dashboard_personnel`, entity `frontend/src/entities/salon-invite/`, `shared/lib/activeSalon.ts`, удалён устаревший корневой `LINTING_TYPECHECK_SPEC.md`, в репозиторий добавлен skill `.claude/skills/frontend-react-fsd/SKILL.md` (проверки — по `AGENTS.md`).

### Последние изменения (2026-04-27)

- **Персонал салона (staff-management, фаза 3–4):** бэкенд — `GET/POST/DELETE /api/v1/dashboard/staff-invites`, `GET/PATCH/DELETE /api/v1/dashboard/salon-members`, `GET /api/v1/me/salon-invites`, `POST .../accept|decline`, привязка телефона к pending-инвайтам после `VerifyOTP` (`LinkPendingByPhone`); модель `SalonMemberInvite`, репозиторий `SalonMemberInviteRepository`, расширение `DashboardRepository` и `DashboardService`. Фронт — секция «Персонал» (только owner) в `DashboardPage`, `PersonnelView` + `InviteStaffDrawer`, RTK `entities/salon-invite`, вкладка «Приглашения» на `/me` с бейджем `pendingInvites`.
- **Документация (vault) под персонал и роли:** обновлены [`architecture/backend.md`](../architecture/backend.md) (Fx `SalonMemberInviteRepository`, `dashboard_personnel`, маршруты), [`architecture/api-flows.md`](../architecture/api-flows.md) (`X-Salon-Id`, сценарий инвайтов, шаг OTP), [`architecture/db-schema.md`](../architecture/db-schema.md) (`salon_member_invites`, роли `salon_members`, `global_role`, онбординг по `salonId`), [`entities/user-roles.md`](../entities/user-roles.md) (`salonMemberships`, `pendingInvites`, `receptionist`, гейты UI).
- **Multi-salon дашборд — доводка UI:** `UserMenu` переведён на `effectiveRoles.salonMemberships` (одна кнопка «Кабинет салона» или список салонов с подписью роли); сайдбар `DashboardPage` фильтрует пункты через `visibleNav`, подпись роли из `salonRoleLabelRu`, вложенный маршрут мастера — `staff/:staffId` под `/dashboard/:salonId`; навигация в `StaffTabsView` / `StaffListView` / `StaffDetailView` / `OnboardingWizard` и пункт «Для бизнеса» в `NavBar` используют `dashboardPath` / `dashboardSectionPath` и при необходимости `getActiveSalonId()`.
- **Календарь (режим «Неделя») — DnD-перенос на соседние недели через edge-gutter:** вместо узких боковых drop-зон добавлены внешние edge-гаттеры, соприкасающиеся с сеткой недели. При перетаскивании записи и удержании курсора в гаттере выполняется автолистание на `-7/+7` дней; первый и последний день недели остаются безопасными для обычного drop внутри сетки.
- **Staff detail — ближайшие записи мастера:** в `StaffDetailView` список «Ближайшие записи» переведён на выборку ближайших 10 визитов (`pageSize=10`) с явной сортировкой `starts_at asc` и фильтром по активным статусам (`pending`, `confirmed`), чтобы в карточке мастера отображались именно предстоящие записи.
- **CRM клиенты — CRUD через drawer + soft-delete/restore:** в dashboard-клиентах добавлены `POST /api/v1/dashboard/clients` (создание), `DELETE /api/v1/dashboard/clients/:id` (soft-delete) и `POST /api/v1/dashboard/clients/:id/restore` (восстановление). Список клиентов получил фильтр `include_deleted=true`; удалённые клиенты возвращаются с `deletedAt` и неактивны в гриде.
- **CRM клиенты — доп. контакты и редактирование телефона:** миграция `000023_salon_clients_extra_contact` добавила `salon_clients.extra_contact`. Для зарегистрированных клиентов доступно поле `extraContact`; для гостевых разрешено редактирование `phoneE164` (с валидацией формата), для привязанных к `user_id` телефон редактировать нельзя.
- **Dashboard UI клиентов:** вместо отдельной страницы детали используется `ClientDetailDrawer`; добавлен `CreateClientDrawer`, действия merge/tagging/удаление/восстановление, и расширение RTK Query API в entity-слое `entities/client`.
- **Staff в entity-слое + табы в dashboard:** логика мастеров перенесена в `frontend/src/entities/staff/` (RTK Query endpoints + `staffSlice`, подключен в `app/store.ts`), в `shared/api/rtkApi.ts` добавлен `tagTypes: ['Staff']`. В `DashboardPage.tsx` секция staff теперь рендерит `StaffTabsView`, а роут обновлен с `staff/:staffId` на `staff/*` для вложенной таб-навигации списка/детали. `StaffListView` переведен на `useGetStaffListQuery` + `RenderTable` с action-колонкой, `StaffFormModal` — на entity-хуки (`useCreate/Update/DeleteStaffMutation`, `useCreateMasterInviteMutation`, `useLazyGetStaffByIdQuery`, `useLazyLookupMasterByPhoneQuery`) и `.unwrap()`.
- **Dashboard shell polish:** в sidebar добавлен пользовательский блок с аватаром/меню (`Главная`, `Профиль`, `Кабинет салона`, `Выйти`), улучшена адаптивность drawer и стили навигации.

### Последние изменения (2026-04-26)

- **Профиль салона — убраны устаревшие поля из формы:** `salonType` и `businessType` больше не отправляются при `PUT /api/v1/dashboard/salon/profile` из UI дашборда. Бэкенд не сломается — `PutSalonProfile` использует nil-проверки на входе и не трогает поля, не пришедшие в теле запроса (значения сохраняются в БД). `salon_type` по-прежнему используется как fallback при вычислении `salonCategoryScopes` на бэкенде (см. `salonCategoryScopes` → `ParentSlugsForSalonType`). Типы `SalonProfile.salonType` и `SalonProfile.businessType` в `dashboardApi.ts` помечены `@deprecated`.

### Последние изменения (2026-04-25)

- **Множественные категории салона (scopes):** добавлена миграция `000021_salon_category_scopes` с таблицей `salon_service_category_scopes (salon_id, parent_slug)` и backfill из legacy `salon_type`. В бэкенде дашборда добавлены чтение/запись `salonCategoryScopes` в профиле (`GET/PUT /api/v1/dashboard/salon/profile`), fallback на `salon_type` сохранён для совместимости. Фильтрация категорий услуг (`GET /api/v1/dashboard/service-categories`) и валидация `category_slug` при создании/редактировании услуги теперь идут через scopes салона (с `allowAllCategories` для полного списка).
- **Dashboard UI — профиль/онбординг/услуги:** в `OnboardingWizard` и `DashboardProfile` добавлен multi-select категорий салона (parent scopes), payload сохраняется через `salonCategoryScopes`. В `ServicesView` вкладки категорий теперь строятся с опорой на API-фильтр scoped-категорий, а `ServiceFormModal` подсказывает про заполнение категорий салона вместо одиночного типа.
- **Salon Claim Flow — post-plan polish (`ClaimStatusPage`):** после закрытия Tasks 1–14 реализована рабочая страница статуса заявки `frontend/src/features/claim-salon/ui/ClaimStatusPage.tsx` (вместо stub): чтение query `source/externalId`, вызов `fetchMyClaimStatus`, отображение состояний `pending|approved|rejected|duplicate`, показ причины отклонения и CTA для перехода в одобренный салон или повторного поиска через `/join`. Это закрывает пользовательский путь проверки статуса без ручных заглушек.
- **Salon Claim Flow — UX polish (claim/admin):** в `ClaimSalonPage` при `claim_already_submitted` теперь мгновенный переход на страницу статуса заявки, без лишней ручной навигации. В `AdminClaimsPage` ошибки действий approve/reject больше не показываются через `alert` и отображаются inline через `Alert`, что делает модерацию стабильнее и предсказуемее в UI.

### Последние изменения (2026-04-24)

- **Профиль пользователя (`/me`):** реализованы новые эндпоинты `/api/v1/me/*` (GET/PUT профиль, sessions list/revoke/revoke-all, DELETE soft-delete), расширение `users` (username, демография, locale/theme, avatar_url, `updated_at`, `deleted_at`), soft-delete-safe вход по телефону и выдача `account_deleted` для удалённых аккаунтов. Добавлены SQL-триггеры пересчёта `users.global_role` от `salon_members`/`master_profiles` + backfill. Фронт: страница `/me` (General/Security/Danger), `UserMenu` в NavBar, поддержка `beauty_session_id`, гейты `/dashboard` и `/master-dashboard` на `effectiveRoles`. Спека: `docs/superpowers/specs/2026-04-24-user-profile-design.md`.
- **Backlog:** отложенные пункты фиксируются в [`product/backlog.md`](backlog.md) (смена телефона, расширение `salon_members.role`, super-admin платформы и пр.).
- **Документация (vault):** единая точка входа [`README.md`](../README.md); продукт в `product/`; **планы** перенесены в архив [`docs/archive/vault-plans-2026-04-24/`](../../archive/vault-plans-2026-04-24/) (реализованные постановки); **entities** остаются в `docs/vault/entities/`; монолиты заархивированы в `docs/archive/*-monolith-2026-04-24.md`; ADR, runbooks, [`architecture/code-map.md`](../architecture/code-map.md), `make docs-check`.
- **Telegram OTP auth (MVP):** добавлен канал OTP через Telegram (`POST /api/auth/otp/request` принимает `channel: "sms" | "telegram"`), новая ошибка `422 {"error":"telegram_not_linked","botUsername":"@..."}`; миграция `000017_telegram_phone_links`; репозиторий связок `phone_e164 -> chat_id`; новый рантайм `backend/cmd/bot` (long-polling, `/start`, сохранение контакта). Фронтенд логина получил переключатель SMS/Telegram и подсказку по привязке через бота при `telegram_not_linked`.

### Последние изменения (2026-04-21)

- **Рефакторинг сервиса дашборда (god-file split):** `backend/internal/service/dashboard.go` (~1534 строк) разбит на 7 доменных файлов: `dashboard_appointment.go` (машина состояний записей, CRUD), `dashboard_helpers.go` (общие хелперы), `dashboard_schedule.go` (расписание и слоты), `dashboard_service_mgmt.go` (услуги и категории), `dashboard_staff.go` (мастера, invite-flow), `dashboard_stats.go` (статистика), `dashboard_types.go` (DTO и типы). Публичный интерфейс `DashboardService` не изменился — все вызовы и DI без изменений.

- **Модуль клиентов (CRM) — бэкенд:** новые миграции `000015_salon_clients` (таблицы `salon_clients`, `salon_client_tags`, `salon_client_tag_assignments`; колонка `salon_client_id` в `appointments`) и `000016_salon_clients_seed_backfill` (5 системных тегов; backfill клиентов из существующих записей по зарегистрированным пользователям и по guest-телефону; привязка `appointments.salon_client_id`). Интерфейс `SalonClientRepository` (`repository/salon_client.go`): `ListBysalon`, `GetByID`, `Create`, `Update`, `GetOrCreateByPhone`, `GetOrCreateByUserID`, `MergeGuestToUser`, `ListTags`, `CreateTag`, `AssignTag`, `RemoveTag`, `ListClientAppointments`. Сервис `SalonClientService` (`service/salon_client_service.go`). Контроллер `SalonClientController` (`controller/salon_client_controller.go`) встроен в `DashboardController` по префиксу `/clients`; роут `/api/v1/dashboard/clients/*` зарегистрирован в `app.go`. Все три компонента зарегистрированы в Fx-графе.

  Эндпоинты (JWT + членство в салоне, `/api/v1/dashboard`):
  - `GET /clients?search=&tag_ids=&page=&page_size=` → список клиентов с тегами, `visitCount`, `lastVisitAt`
  - `GET /clients/:id` → профиль клиента
  - `PUT /clients/:id` body `{ displayName?, notes? }` → обновление
  - `GET /clients/:id/appointments?page=&page_size=` → история записей клиента
  - `GET /clients/tags` → список тегов (системные + кастомные салона)
  - `POST /clients/tags` body `{ name, color }` → создать тег
  - `POST /clients/:id/tags` body `{ tagId }` → назначить тег
  - `DELETE /clients/:id/tags/:tagId` → снять тег
  - `POST /clients/:id/merge` body `{ userId }` → слить гостя в аккаунт пользователя

- **Модуль клиентов (CRM) — фронтенд:** новый API-клиент `frontend/src/shared/api/clientsApi.ts` (типы `SalonClient`, `ClientTag`, `ClientAppointmentRow`; функции `fetchClients`, `fetchClientById`, `updateClient`, `fetchClientAppointments`, `fetchClientTags`, `createClientTag`, `assignClientTag`, `removeClientTag`, `mergeClientToUser`). Новые UI-компоненты: `ClientsListView.tsx` (таблица-список с поиском и тегами) и `ClientDetailView.tsx` (профиль клиента + история записей). `DashboardPage.tsx` — добавлена секция `'clients'` (иконка 👥, заголовок «Клиенты»), маршрут `/dashboard/clients/:clientId`.

- **Рефакторинг DnD-календаря (FSD):** логика drag-and-drop вынесена в feature-модуль `frontend/src/features/reschedule-appointment/` — хук `useReschedule` (расчёт координат, превью, откат), типы в `model/types.ts`, компонент `RescheduleDragOverlay.tsx`. Создан entity-слой `frontend/src/entities/appointment/` с переиспользуемым `AppointmentBlock`. Создан `CreateAppointmentDrawer.tsx` (`frontend/src/pages/dashboard/ui/drawers/`) — боковая панель создания записи вместо модалки; поддерживает `initialData` (prefill времени, мастера). Оптимистичное обновление при перетаскивании — мгновенный сдвиг блока с откатом при ошибке API.

- **Новые shared UI-компоненты:** `frontend/src/shared/ui/DataGrid/` (обёртка над MUI DataGrid: `RenderTable.tsx`, `Pagination/`, `noRowsStates/`, `styles.tsx`, `types.ts`) и `frontend/src/shared/ui/iconify/` (`Iconify.tsx` — иконки через `@iconify/react`).

### Последние изменения (2026-04-18)

- **Мульти-услуга — гость и дашборд (итог):** на странице салона — выбор **нескольких** услуг, мастера с полным набором, слот по сумме длительностей (`GET .../slots?serviceIds=`), сводка цен **над** контактами, `POST .../bookings` с `serviceId` + `serviceIds`, в БД `appointment_line_items` (миграция **`000014`** — обязательна на всех окружениях). В кабинете салона и у мастера список записей: **`serviceName`** из агрегата line items или из основной услуги; **`GET .../dashboard/appointments?service_id=`** находит визит и если услуга только во второй (и далее) строке мульти-записи (`EXISTS` по `appointment_line_items`). Код: `booking.go`, `salon_controller.go`, `GuestBookingDialog.tsx`, `dashboard_repository.go`, `master_dashboard_repository.go`. Планы: [`../../archive/vault-plans-2026-04-24/multi-service-guest-booking.md`](../../archive/vault-plans-2026-04-24/multi-service-guest-booking.md); отображение в списках — см. также §12 того файла. **Сводка для PR / релиза и backlog улучшений:** [`../../multi-service-booking-rollout-summary.md`](../../multi-service-booking-rollout-summary.md).

- **Трек 4.1 — перенос записей в календаре дашборда (DnD):** режимы «День» и «Неделя» обёрнуты в `DragDropProvider` (`@dnd-kit/react`); блоки записей — `useDraggable`, колонки — `useDroppable` (`staff:<columnId>:<ymd>`, `week:<ymd>`); вертикальное смещение по `event.operation.transform.y`, шаг и кламп по `slot_duration_minutes` из `GET /api/v1/dashboard/schedule` и рабочим часам мастера (`dndCalendarUtils.ts`); `PUT /api/v1/dashboard/appointments/:id` через `updateDashboardAppointment`; в неделе уникальный id ячейки `appt:<uuid>:cell:<ymd>` для записей на несколько дней. Файлы: `CalendarDayStaffGrid.tsx`, `CalendarWeekGrid.tsx`, `DashboardCalendar.tsx`. План и дальнейшие задачи: `../../archive/vault-plans-2026-04-24/track4-dashboard-features.md`.

- **Гостевая запись на странице салона (wizard):** см. пункт выше «Мульти-услуга — гость и дашборд»; ранее wizard был только на одну услугу — теперь мультивыбор, `serviceIds` в API слотов и бронирования, CTA «Далее». Публичный `GET .../slots` — также **`salonMasterId`** (без `master_profiles`); **`masterProfileId` и `salonMasterId` вместе — 400**. Файлы: `GuestBookingDialog.tsx`, `PublicSlotPicker.tsx`, `SalonPage.tsx`, `salon_controller.go`.

### Последние изменения (2026-04-17)

- **Трек 2 — реальные слоты букинга:** Заглушка «завтра 10:00» удалена. Новый метод `BookingService.GetAvailableSlots(ctx, SlotParams)` генерирует свободные окна по `salons.slot_duration_minutes`, `salon_master_hours` (с исключением перерывов), `services.duration_minutes` + `salon_master_services.duration_override_minutes`, исключает пересечения с существующими `appointments` (кроме `cancelled_*` / `no_show`), фильтрует прошедшие слоты на сегодня (< `now + 30min`), сортирует по `startsAt` / `masterName`, считает в таймзоне салона. Новый `BookingSlotsRepository` + `AppointmentRepository.FindByMasterInRange`. Новые эндпоинты: публичный `GET /api/v1/salons/:salonId/slots?date=&serviceId=&masterProfileId=` (**+ опционально `salonMasterId`**, см. изменения 2026-04-18) и JWT-ный `GET /api/v1/dashboard/slots?date=&serviceId=&salonMasterId=` с одинаковым JSON `{date, slotDurationMinutes, slots[], masters[]}`. `POST /api/v1/salons/:id/bookings` принимает опциональные `startsAt`/`endsAt`/`salonMasterId`/`masterProfileId`; если не заданы — `pickNextSlot` перебирает до 7 дней (иначе `ErrBookingUnavailable`). Фронт: `fetchAvailableSlots` в `dashboardApi.ts`, `fetchPublicSlots` в `salonApi.ts`; компонент `SlotPicker` заменил статический `TimeSlotGrid` в форме создания записи дашборда; `PublicSlotPicker` в гостевом флоу. Юнит-тесты `TestGetAvailableSlots_BasicDay/_DayOff/_BreakExclusion/_FullyBooked/_TodayPast` (моки через интерфейсы, без БД). См. `../../archive/vault-plans-2026-04-24/track2-booking-slots.md`.
- **Этап 4 — кабинет мастера:** при успешной OTP-верификации теневой `master_profiles` (`user_id IS NULL`, тот же `phone_e164`, самый ранний по `created_at`) автоматически привязывается к пользователю (`ClaimMasterProfile`). `GET /api/auth/me` и ответ `verify` включают `masterProfileId` (UUID или отсутствует). API кабинета под префиксом **`/api/v1/master-dashboard/`** (JWT + строка `master_profiles` с `user_id = текущий пользователь`, иначе 403): `GET|PUT /profile`, `GET /invites`, `POST /invites/:salonMasterId/accept|decline`, `GET /salons`, `GET /appointments?from=&to=&status=`. Реализация: `master_dashboard_repository.go`, `service/master_dashboard.go`, `controller/master_dashboard_controller.go`, доработка `service/auth.go`, регистрация в `app.go` / `server.go`. Фронт: `masterDashboardApi.ts`, `/master-dashboard` (`MasterDashboardPage.tsx`, секции `?section=profile|invites|salons|appointments`), защита без `masterProfileId` → редирект на `/`, `AuthBootstrap` + поле `masterProfileId` в `authApi`/`authSlice`, в `NavBar` — «Кабинет салона» (роль `salon_owner`) и/или «Кабинет мастера». См. `../../archive/vault-plans-2026-04-24/agent-prompt-stage4-master-cabinet.md`.
- **Дашборд — страница мастера и drawer’ы:** `/dashboard/staff/:staffId` (`StaffDetailView.tsx`): шапка с аватаром (цвет мастера), статус `active`/`pending`/`inactive`, bio и специализации, кнопки «Редактировать» / «Деактивировать» (confirm + `DELETE .../salon-masters/:id` как в форме), таблица услуг с базовой и эффективной ценой/длительностью, «Настроить услуги» открывает `StaffFormModal`; недельное расписание из `GET .../salon-masters/:id/schedule`, правка — `ScheduleDrawer` → `PUT` того же bundle; ближайшие записи — `GET .../appointments?salon_master_id=&from=&page_size=5`, клик — `AppointmentDrawer`. Список записей (`DashboardAppointments.tsx`) использует тот же `AppointmentDrawer` вместо модалки редактирования; создание новой записи по-прежнему в модалке. См. `../../archive/vault-plans-2026-04-24/agent-prompt-dashboard-master-page-drawer.md`.
- **Этап 3 — публичный профиль мастера:** без JWT: `GET /api/v1/salons/:salonId/masters` (активные `salon_masters` + опционально `master_profiles`, услуги с `effectivePriceCents`), `GET /api/v1/masters/:masterProfileId` (профиль + активные салоны и названия услуг; `headerCalendarColor` — цвет первого членства). Реализация: `master_public_repository.go`, `service/master_public.go`, `SalonController` + `MasterController`, маршрут в `server.go`. Фронт: `fetchSalonMasters` / `fetchMasterProfile` в `salonApi.ts`, страница `/master/:masterProfileId` (`MasterPage.tsx`), вкладка «Мастера» на `SalonPage` с реальными данными для UUID-салона (для `/place/...` и mock-id секция скрыта). См. `../../archive/vault-plans-2026-04-24/agent-prompt-stage3-master-public.md`.

### Последние изменения (2026-04-16)

- **Этап 2 — мастера в дашборде:** миграция `000013_salon_master_status` (enum `active` / `pending` / `inactive` на `salon_masters`). API: основной путь `/api/v1/dashboard/salon-masters` (+ deprecated `/staff`), `GET/PUT` с вложенным `masterProfile` и списком услуг с `priceOverrideCents` / `durationOverrideMinutes`, `PUT .../:id/services`, `GET /masters/lookup?phone=`, `POST /master-invites`. Записи в JSON: `salonMasterId`. Фронт: `dashboardApi.ts`, форма мастера (новый / пригласить по телефону, профиль, оверрайды услуг), карточка мастера, календарь и список записей. См. `../../archive/vault-plans-2026-04-24/agent-prompt-stage2-master-dashboard.md`, `../entities/master-profiles-salon-masters.md`.
- **Тема и кабинет:** семантическая палитра дашборда вынесена в `theme.palette.dashboard` (`frontend/src/shared/theme/dashboardPalette.ts`, `getDashboardPalette`), типы расширены через `mui-augmentation.d.ts`. Компоненты дашборда переведены на `useDashboardPalette()` / `useDashboardListCardSurface()` вместо статического `mocha.ts` где это затронуто; общие стили форм — `formStyles.ts`, переиспользуемые блоки — `ui/components/formComponents.tsx`.
- **Главная (поиск):** блок Hero на `SearchPage` использует **светлый** градиент (cream → blush) в **светлой** теме и прежний тёмный Warm Mocha-градиент в **тёмной**; текст и бейдж берутся из брендовых `COLORS` (`ink` / `inkSoft` / `accent`). `SearchBar` переключает «таблетку» поиска: светлая пилюля в light, тёмная — в dark.
- **Календарь дашборда:** реализованы все 8 задач из `../../archive/vault-plans-2026-04-24/calendar-upgrade-prompt.md` — красная линия текущего времени (NowLine), штриховка нерабочего времени и выходных, блоки перерывов мастеров, аватарки с цветом в шапке колонок, 3-строчные блоки событий с длительностью, клик по дню в «Неделе» → «День», индикаторы загруженности в «Месяце», расширенная модалка деталей записи. Светлая тема: `calendarEventLightTextColors`.
- **Документация:** синхронизированы `product/status.md`, `architecture/`; в `backend/internal/requestid/context.go` добавлен пакетный комментарий к заголовкам корреляции.

---

## 1. Сущности и связи

### Персистентные сущности (хранятся в PostgreSQL)

#### Salon

Центральная сущность. Наш агрегат с UUID + обогащённые данные поверх внешних геосервисов.

| Поле                   | Тип                 | Описание                                                  |
| ---------------------- | ------------------- | --------------------------------------------------------- |
| `id`                   | UUID                | Наш внутренний идентификатор                              |
| `ExternalIDs`          | `map[string]string` | Источник → внешний ID: `{"2gis": "...", "yandex": "..."}` |
| `NameOverride`         | `*string`           | Переопределение названия (приоритет над 2GIS)             |
| `AddressOverride`      | `*string`           | Переопределение адреса                                    |
| `Timezone`             | `string`            | Таймзона салона, default `Europe/Moscow`                  |
| `OnlineBookingEnabled` | `bool`              | Включена ли онлайн-запись                                 |
| `CategoryID`           | `*string`           | Категория: `hair`, `nails`, `spa`, `barber` и др.         |
| `BusinessType`         | `*string`           | `venue` (заведение) или `individual` (мастер)             |
| `Lat`, `Lng`           | `*float64`          | Координаты                                                |
| `Address`, `District`  | `*string`           | Адрес и район                                             |
| `PhotoURL`             | `*string`           | Главное фото                                              |
| `Badge`                | `*string`           | UI-бейдж: `popular`, `top`, `new`                         |
| `CardGradient`         | `*string`           | Тема карточки: `bg1`..`bg6`                               |
| `Emoji`                | `*string`           | Эмодзи-иконка                                             |
| `CachedRating`         | `*float64`          | Рейтинг на нашей платформе                                |
| `CachedReviewCount`    | `*int`              | Количество наших отзывов                                  |

#### SalonExternalID

Связывает один салон с N внешними геосервисами (2GIS, Yandex, Google и т.д.).

| Поле                  | Описание                                                          |
| --------------------- | ----------------------------------------------------------------- |
| `salon_id` + `source` | Composite PK                                                      |
| `external_id`         | ID во внешнем сервисе                                             |
| `meta JSONB`          | Произвольные поля: `booking_url`, `rating_snapshot`, промо-ссылки |
| `synced_at`           | Когда последний раз синхронизировались                            |

UNIQUE `(source, external_id)` — один внешний объект не может ссылаться на два наших салона.

#### SalonService (таблица `services`)

Услуги салона — то, на что можно записаться.

| Поле               | Описание                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `salon_id`         | FK → salons                                                              |
| `name`             | Название услуги                                                          |
| `duration_minutes` | Длительность                                                             |
| `price_cents`      | Цена в копейках (nullable — "по договорённости")                         |
| `sort_order`       | Порядок отображения                                                      |
| `is_active`        | Показывать ли в листинге                                                 |
| `category`         | Legacy-текст / группа (часто `parent_slug` или свободная метка)          |
| `category_slug`    | Ссылка на системную строку `service_categories.slug` (см. миграции 010+) |
| `description`      | Описание (миграция 009+)                                                 |

Связь **мастер ↔ услуга**: таблица `staff_services` (N:N), см. миграция `000009_dashboard_extended`.

#### ServiceCategory (таблица `service_categories`)

Справочник «папок» услуг для дашборда (не путать с рубриками 2GIS). Сид: 72 системные строки (`salon_id IS NULL`). Подробная матрица slug — в [service-categories.md](../entities/service-categories.md).

| Поле          | Описание                                              |
| ------------- | ----------------------------------------------------- |
| `slug`        | Уникален среди системных (`salon_id IS NULL`)       |
| `parent_slug` | Группа (hair, nails, barbershop, …)                   |
| `name_ru`     | Отображаемое имя                                    |
| `salon_id`    | NULL = системная; зарезервировано под кастом салона |

#### Salon (доп. поля кабинета)

| Поле                    | Описание                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| `salon_type`            | **Legacy.** Тип заведения (`hair_salon` и др.) — хранится в БД, не редактируется из формы профиля; используется как fallback при расчёте `salonCategoryScopes` (см. `ParentSlugsForSalonType`). |
| `business_type`         | **Legacy.** `venue` / `individual` — хранится в БД, не редактируется из формы профиля. |
| `slot_duration_minutes` | Шаг слота для расчётов расписания (15–240 мин), default 30             |

#### User

Клиент, владелец салона, мастер или администратор. Авторизация по телефону.

| Поле           | Описание                                                     |
| -------------- | ------------------------------------------------------------ |
| `phone_e164`   | Телефон в E.164 формате, unique                              |
| `display_name` | Имя (заполняется пользователем)                              |
| `global_role`  | `client` / `salon_owner` / `master` / `advertiser` / `admin` |

#### OtpCode + RefreshToken

Инфраструктура авторизации. OTP: 4 цифры, TTL 5 минут. RefreshToken: 30 дней, хранится как SHA256-хеш.

#### Appointment

Запись на услугу. Поддерживает как зарегистрированных пользователей, так и гостей.

| Поле                             | Описание                                                  |
| -------------------------------- | --------------------------------------------------------- |
| `salon_id`, `service_id`         | FK → salons, services                                     |
| `client_user_id`                 | FK → users (NULL для гостей)                              |
| `guest_name`, `guest_phone_e164` | Данные гостя (заполняются если нет user_id)               |
| `salon_master_id`                | FK → salon_masters (необязательно)                      |
| `starts_at`, `ends_at`           | Время записи                                              |
| `status`                         | `pending → confirmed → completed / cancelled_* / no_show` |
| `client_note`                    | Пожелания клиента                                         |

DB constraint: либо `client_user_id`, либо `(guest_name + guest_phone_e164)` — не оба и не ни одного.
Поле `salon_client_id` (FK → `salon_clients`, nullable) — связь с CRM-профилем клиента (backfill: миграция `000016`).

#### SalonClient (таблица `salon_clients`) / SalonClientTag

- **SalonClient** — CRM-профиль клиента в салоне: `id`, `salon_id` (FK → salons), `user_id` (FK → users, nullable), `phone_e164` (nullable), `extra_contact` (nullable), `display_name`, `notes`, `created_at`, `updated_at`, `deleted_at` (soft-delete). Уникальные индексы: `(salon_id, user_id) WHERE user_id IS NOT NULL` и `(salon_id, phone_e164) WHERE phone_e164 IS NOT NULL`.
- **SalonClientTag** — теги: `id`, `salon_id` (nullable — системные теги), `name`, `color`. Системные теги (5 штук: VIP, Постоянный, Проблемный, Новый, Требует внимания) создаются миграцией `000016` с `salon_id = NULL` (видны всем салонам).
- **SalonClientTagAssignment** — N:M-связь: `(salon_client_id, tag_id)` composite PK.

#### SalonMaster (таблица `salon_masters`) / SalonMember / WorkingHour

- **SalonMaster** — членство мастера в салоне: `display_name`, цвет календаря, `is_active`, `status` (`active` / `pending` / `inactive`), FK `master_id` → `master_profiles`, связь услуг через `salon_master_services` (в т.ч. override цены и длительности)
- **SalonMember** — связь user ↔ salon с ролью `owner` или `admin`
- **WorkingHour** — расписание по дням недели (day_of_week 0-6, opens_at, closes_at)

#### SalonSubscription

Подписка салона на платформу. Plan: `free` / `paid`. Status: `trial` / `active` / `expired`. Поля под будущий payment provider.

#### Review, WaitlistEntry _(схема есть, функционал не реализован)_

- **Review** — один отзыв на одну запись (rating 1-5, body, ответ владельца)
- **WaitlistEntry** — лист ожидания: пользователь + салон + желаемые даты

---

### In-memory сущности (не хранятся в БД)

#### PlaceItem / PlaceDetail

DTO с данными из 2GIS. Используются только внутри запроса, никогда не персистируются (ограничение лицензии API).

```
PlaceItem: externalId, name, address, lat/lon, photoUrl, rating, reviewCount, rubricNames[]
PlaceDetail: + description, orgName, weeklySchedule[], contacts[], photoUrls[]
```

---

### Диаграмма связей

```
salons ──────────────── salon_external_ids
  │  1:N (source → external_id + meta JSONB)
  │
  ├──1:N── services (salon_services)
  │
  ├──1:N── working_hours
  │
  ├──1:N── salon_masters ──N:1── master_profiles (опционально)
  │
  ├──1:N── salon_members ──N:1── users
  │
  ├──1:N── salon_subscriptions
  │
  └──1:N── appointments ──N:1── users (или гость)
                │
                └──N:1── services
                │
                └──N:1── salon_masters (опционально)
                │
                └──1:1── reviews (post-MVP)

users ──1:N── otp_codes
      ──1:N── refresh_tokens
      ──1:N── waitlist_entries (post-MVP)
      ──1:1── user_telegram_identities (post-MVP)
```

---

## 2. Геосервисы

### Текущее состояние

Реализован один адаптер — **2GIS Catalog API 3.0**.

Архитектура: интерфейс `PlacesProvider` в `service/` → реализация `CatalogAdapter` в `infrastructure/twogis/`. Это позволяет добавить Yandex, Google и другие без изменения бизнес-логики.

```
PlacesService
    └── PlacesProvider (interface)
            └── CatalogAdapter (2GIS)   ← единственная реализация сейчас
```

### Как работает 2GIS

**Поиск** (`GET /api/v1/places/search`):

- Запрос: `q`, `lat`/`lon`, `radius` (м), `page`, `page_size`, `locale`
- Вызывает `https://catalog.api.2gis.com/3.0/items` с `type=branch`
- Возвращает: список PlaceItem + total count

**Детали** (`GET /api/v1/places/item/{externalId}`):

- Те же поля + расписание, контакты, все фото, описание

**Ограничения:**

- Данные НЕ кешируются в БД (лицензия)
- Иногда `point: null` → lat/lon = 0 (известная проблема)
- Pagination через 2GIS (не наша БД)

### Как связаны 2GIS и наши салоны

Связь через `salon_external_ids`:

```sql
INSERT INTO salon_external_ids (salon_id, source, external_id, meta)
VALUES ('<наш UUID>', '2gis', '<2GIS ID>', '{"booking_url": "..."}');
```

Поле `meta JSONB` готово для хранения специфичных для источника данных — например, `booking_url` из Yandex Business (поле `CompanyMetaData.Links[].href` с `type=="online-registration"`).

### Roadmap геосервисов

| Сервис      | Статус       | Примечание                            |
| ----------- | ------------ | ------------------------------------- |
| 2GIS        | ✅ Работает  | Тест 2026-04-04, 12к+ результатов     |
| Yandex Maps | ❌ Не начато | Интерфейс готов, нужен второй адаптер |
| Google Maps | ❌ Не начато | Низкий приоритет для РФ рынка         |

---

## 3. Связь фронтенда с бекендом

### API-файлы на фронтенде

| Файл           | Базовый URL                  | Покрытые эндпоинты                                                                                       |
| -------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `authApi.ts`   | `VITE_API_URL`               | `/api/auth/otp/request`, `/api/auth/otp/verify`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/logout` |
| `salonApi.ts`  | `VITE_API_BASE`              | `GET /v1/salons`, `GET /v1/salons/{id}`, `GET /v1/salons/{id}/masters`, `GET /v1/salons/{id}/slots`, `POST /v1/salons/{id}/bookings` |
| `placesApi.ts` | `publicApiUrl` → `/api/v1/…` | `GET /api/v1/places/search`, `GET /api/v1/places/item/{id}`                                              |
| `searchApi.ts` | `publicApiUrl` → `/api/v1/…` | `GET /api/v1/search` (unified: 2GIS + обогащение из БД), infinite scroll                                 |
| `geoApi.ts`    | `publicApiUrl` → `/api/v1/…` | `GET /api/v1/geo/region`, `/geo/cities`, `/geo/reverse`                                                  |

### Что подключено реально

| Функция                                 | Статус                                                                                                                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Авторизация (OTP + JWT)                 | ✅ Полностью подключена                                                                                                                                                                                                                        |
| Обновление токена (auto-refresh on 401) | ✅ Реализовано                                                                                                                                                                                                                                 |
| Профиль пользователя (`/api/auth/me`)   | ✅ Подключён                                                                                                                                                                                                                                   |
| Поиск мест через 2GIS                   | ✅ Подключён (`placesApi.ts`), в т.ч. как fallback с главной                                                                                                                                                                                   |
| Unified поиск на главной                | ✅ `searchApi.ts` → `GET /api/v1/search`; при ошибке — fallback на `placesApi` и режим «только 2GIS»                                                                                                                                           |
| Детальная страница салона (`SalonPage`) | ✅ Dual-mode: `/salon/:id` (platform) и `/place/:externalId` (2GIS), с auto-redirect через `GET /api/v1/salons/by-external`                                                                                                                  |
| Гостевая запись                         | ✅ Wizard в `GuestBookingDialog` (услуга → мастер → `PublicSlotPicker` → контакты), `POST /v1/salons/{id}/bookings` со слотом                                                                                                                      |
| **Dashboard**                           | ✅ API `GET/POST/PATCH/PUT/DELETE /api/v1/dashboard/...` (JWT + членство в салоне); UI: обзор, календарь (день/неделя/месяц), список записей с редактированием, услуги с категориями, мастера, расписание, профиль. Доступ: `staff.dashboard_access` и/или роль в `salon_members` — см. `../../seed-dashboard-access.sql` |
| Список всех салонов (`GET /v1/salons`)  | ⚠️ Эндпоинт есть; главная использует unified search, не этот список                                                                                                                                                                            |

### Переменные окружения фронтенда

```env
VITE_API_URL=http://localhost:8080     # для auth
VITE_API_BASE=http://localhost:8080    # для salon API
```

### Стек фронтенда

- **React + Vite** (dev server: localhost:5173/5174)
- **Redux Toolkit** — `searchSlice` (категория, сортировка, чипы фильтров), `authSlice`, `locationSlice` (город, геолокация устройства), `appointmentSlice`, `clientSlice`, `staffSlice`, плюс RTK Query `rtkApi`
- **Material-UI** — UI-компоненты, кастомная тема (бренд: ink, accent, sage, blush, cream; для `/dashboard` — `palette.dashboard` и хук `useDashboardPalette`)
- **react-hook-form + yup** — формы с валидацией
- **react-i18next** — i18n (ru_RU)
- **framer-motion** — анимации

---

## 4. Что реализовано

### ✅ Готово и работает

**Бекенд:**

- БД: PostgreSQL, миграции `000001` и далее (в т.ч. `000009` dashboard/staff/services, `000010` service_categories + `salon_type`, `000011` sync), schema production-ready
- Архитектура: Clean Architecture с Uber Fx DI
- Auth: OTP (4 цифры, 5 мин) + JWT (access 2 часа, refresh 30 дней)
- 2GIS: поиск и детали работают (подтверждено тестом 2026-04-04)
- Salon API: `GET /v1/salons`, `GET /v1/salons/{id}`, `GET /v1/salons/{id}/masters`, `GET /v1/salons/{id}/slots`, `POST /v1/salons/{id}/bookings`
- Гостевые записи: без регистрации (имя + телефон)
- Health check: `GET /health`
- CORS middleware

**Фронтенд:**

- Роутинг: `/`, `/salon/:id`, `/place/:externalId`, `/login`, `/dashboard`
- Auth flow: Phone → OTP → JWT tokens в localStorage
- **SearchPage**: unified search + fallback 2GIS; режимы список/карта; bento-сетка (`SearchResultCard`: normal / featured-vertical / featured-horizontal); пять градиентов медиа на батч из 5 карточек (`entities/search/lib/bentoGradients.ts`); горизонтальный featured — вторая ячейка в ряду (1 колонка + 2 колонки); в режиме списка — колонка с промо (`PromoBanner`); скелетоны загрузки
- Карточки: `SearchResultCard`, PlaceCard, SalonCard
- Гостевой букинг: `GuestBookingDialog` (wizard + `PublicSlotPicker`, `fetchSalonMasters` / `fetchPublicSlots`)
- i18n: полный русский перевод
- Гео: выбор города, синхронизация координат, `geoApi` для региона/городов

### ⚠️ Частично готово

| Компонент    | Что сделано                                           | Что осталось                                                                   |
| ------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| OTP-доставка | Логика генерации/верификации                          | SMS/Telegram реально не отправляет (только stderr)                             |
| SearchPage   | Unified API + 2GIS fallback, фильтры, карта, bento UI | Дожать фильтры (часть чипов в `FilterRow` без бэкенда), polish карты           |
| SalonPage    | Dual-mode, lookup `by-external`, hero CTA «Записаться», wizard гостевой записи, расписание и контакты из API | Отзывы/промо/фото-секции скрыты фичефлагами до появления API                    |
| Dashboard    | Записи CRUD, календарь (день/неделя/месяц) с расписанием мастеров, перерывами, NowLine, аватарками, детальной модалкой; услуги с `category_slug`; мастера: `master_profiles` + `salon-masters`, оверрайды услуг, lookup/invite; **DnD-перенос записей** в дне/неделе (`@dnd-kit/react` → `PUT .../appointments/:id`); **Клиенты (CRM)**: `salon_clients` с тегами, история записей, guest↔user merge | Resize длительности, zoom таймлайна, конфликты слотов (предупреждение), кастомные `service_categories` на салон, напоминания, DataGrid в списке записей (в разработке) |

### ❌ Не начато

- SMS-провайдер (SMSC, МТС Exolve и др.)
- Записи через Yandex Business (кнопка "Записаться")
- Публичная витрина мастера `/master/:id` и полноценный кабинет мастера (принятие инвайтов и т.д.) — Этап 3–4
- Эндпоинты отзывов (схема в БД есть)
- Подписки и оплата (ЮКасса, СБП)
- Telegram-бот для уведомлений
- Yandex Maps адаптер
- Production деплой (Docker/K8s, CI/CD)
- React Native мобильное приложение

---

## 5. Куда двигаться дальше

### Приоритет 1 — MVP для реальных пользователей

**1. OTP-доставка** — без этого нельзя онбордить реальных пользователей.

- Подключить SMS: SMSc.ru, МТС Exolve, или Telegram Bot API
- Нужно: новый интерфейс `OTPSender` в `service/`, реализация в `infrastructure/`

**2. Заполнить БД реальными салонами**

- Написать скрипт/команду: запрос к 2GIS → вставка в `salons` + `salon_external_ids`
- Без данных поиск на платформе пустой

**3. ~~Подключить SearchPage к бекенду~~** — сделано через `GET /api/v1/search` + fallback 2GIS

- Дальше: полная поддержка всех фильтров на бэкенде, ранжирование, кэш-политики при необходимости

**4. Dev-проверка салонной страницы (новое)**

- Добавлен seed-файл: `backend/migrations/dev_seed_salon_place.sql`
- Добавлена команда: `make seed-salon-page-dev`
- Покрываемые сценарии:
  - `http://localhost:5173/salon/11111111-1111-1111-1111-111111111111`
  - `http://localhost:5173/place/141373143068690` (redirect case)

### Приоритет 2 — Ценность для салонов

**4. Личный кабинет владельца**

- Базовые эндпоинты и UI на `/api/v1/dashboard` и `/dashboard` уже есть (см. §7)
- Дальше: аналитика, уведомления, конфликты слотов, drag-drop на календаре

**5. Отзывы и рейтинг**

- Схема и модели готовы (`reviews`, `waitlist_entries`)
- Нужно: `POST /api/v1/appointments/{id}/review`, агрегация в `cached_rating`

### Приоритет 3 — Рост и монетизация

**6. Подписки и оплата** — ЮКасса или СБП, webhook на смену статуса

**7. Yandex Maps адаптер** — второй `PlacesProvider`; интерфейс уже есть

**8. Telegram-бот** — уведомления о записях, напоминания

---

## 6. Технический долг и риски

| Проблема                                     | Критичность | Решение                             |
| -------------------------------------------- | ----------- | ----------------------------------- |
| `JWT_SECRET = "dev-secret-change-me"`        | 🔴 Критично | Ротировать перед любым prod-деплоем |
| OTP не отправляется                          | 🔴 Критично | Подключить SMS-провайдера           |
| Нет rate limiting на `/api/auth/otp/request` | 🟡 Важно    | Добавить Redis + rate limiter       |
| CORS разрешает `*`                           | 🟡 Важно    | Ограничить на конкретные домены     |
| lat/lon = 0 для части 2GIS-результатов       | 🟡 Важно    | Дебаггинг запросов к 2GIS API       |
| Нет error tracking (Sentry и т.п.)           | 🟠 Средне   | Добавить перед beta                 |
| Валидация гостевого букинга: мастер обязан оказывать выбранную услугу | 🟠 Средне | UI фильтрует по `salon_master_services`; на бэке опционально жёсткая проверка в `CreateGuestBooking` |

---

## 7. Кабинет салона: модули для постановки задач агенту

Ниже — что уже есть в коде и что логично уточнять в ТЗ.

### Услуги и категории

- **Бэкенд:** `PUT/POST/DELETE /api/v1/dashboard/services`, `GET /api/v1/dashboard/service-categories` (+ опция полного списка), валидация `category_slug` против справочника; профиль салона отдаёт `salonType` (legacy, только GET), фильтрация категорий идёт через `salonCategoryScopes`.
- **Фронт:** [ServicesView.tsx](../../../frontend/src/pages/dashboard/ui/views/ServicesView.tsx), [ServiceFormModal.tsx](../../../frontend/src/pages/dashboard/ui/modals/ServiceFormModal.tsx), [salonTypeOptions.ts](../../../frontend/src/pages/dashboard/lib/salonTypeOptions.ts), клиент [dashboardApi.ts](../../../frontend/src/shared/api/dashboardApi.ts).
- **Док спеки slug:** [service-categories.md](../entities/service-categories.md).
- **Идеи задач:** кастомные категории на салон; импорт/дублирование услуг; связь с поиском маркетплейса (`search` / `SalonService` projection).

### Записи (список)

- **Фронт:** [DashboardAppointments.tsx](../../../frontend/src/pages/dashboard/ui/DashboardAppointments.tsx) — фильтр по дате, поиск, статусы, **двойной щелчок по строке** открывает редактирование.
- **API:** `PUT /api/v1/dashboard/appointments/:id` (время, услуга, мастер, комментарий, гость при необходимости), `PATCH .../status`, `POST` создание.
- **Идеи задач:** массовые операции; экспорт; (перенос из списка — опционально, основной DnD в календаре).

### Календарь

- **Фронт:** [DashboardCalendar.tsx](../../../frontend/src/pages/dashboard/ui/DashboardCalendar.tsx); сетки [CalendarDayStaffGrid.tsx](../../../frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx), [CalendarWeekGrid.tsx](../../../frontend/src/pages/dashboard/ui/CalendarWeekGrid.tsx), [CalendarMonthGrid.tsx](../../../frontend/src/pages/dashboard/ui/CalendarMonthGrid.tsx); геометрия времени [calendarGridUtils.ts](../../../frontend/src/pages/dashboard/lib/calendarGridUtils.ts) — таймлайн 08:00–21:59, высота блока из `endsAt - startsAt`, пересечения в колонке — несколько колонок ширины. **DnD перенос:** [dndCalendarUtils.ts](../../../frontend/src/pages/dashboard/lib/dndCalendarUtils.ts) (id, округление к `slot_duration_minutes`, кламп по видимой сетке и рабочим часам колонки), обёртка `@dnd-kit/react` (`DragDropProvider`, `useDraggable`, `useDroppable`); слот салона — `fetchSalonSchedule` в `DashboardCalendar`.
- **Реализовано (все 8 задач из `../../archive/vault-plans-2026-04-24/calendar-upgrade-prompt.md`):**
  - Красная линия текущего времени (`NowLine`) — день и неделя, обновляется каждые 60 сек.
  - Штриховка нерабочего времени — выходной, до/после рабочих часов мастера (по `staff_working_hours`).
  - Перерывы мастеров — блок «☕ Перерыв» на таймлайне из `breakStartsAt`/`breakEndsAt`.
  - Аватарки мастеров с инициалами и цветом в заголовках колонок (режим «День»).
  - Трёхстрочный блок события: услуга, клиент, «09:00–10:00 · 60 мин» (при height > 40px).
  - Клик по заголовку дня в «Неделе» — переход в режим «День».
  - Индикаторы загруженности в «Месяце» (`LoadBar`: 3 уровня ширины/цвета).
  - Модалка деталей записи: аватар клиента, бейдж статуса, услуга/мастер, дата-время, длительность, заметка, кнопки действий по статусу.
  - **Плюс (трек 4.1):** перетаскивание записи в «Неделе» (смена времени и/или дня колонки) и в «Дне» (время + смена мастера / «Без мастера» / общая колонка) с `PUT /api/v1/dashboard/appointments/:id`.
- **Идеи задач (следующий этап):** resize длительности; zoom масштаб таймлайна; конфликты слотов (визуал + поле в ответе API); доступные слоты в форме создания (частично есть через `SlotPicker`).

**Что можно улучшить в DnD / таймлайне:** `DragOverlay` или кастомный feedback вместо только opacity/outline на исходном блоке; модификатор **только вертикаль** и/или `distance`/`delay` на pointer-сensor, чтобы не конфликтовать с кликом; при drop опираться на **координату указателя в колонке**, а не только на `transform.y`, для более предсказуемого слота при смене колонки; **оптимистичный** сдвиг блока до ответа API (реализовано в `useReschedule`); явный запрет дропа на зону перерыва; перенос из режима «Месяц» — отдельная задача.

**Рефакторинг DnD (FSD):** логика перетаскивания вынесена в `features/reschedule-appointment/` (`useReschedule`, `types.ts`, `RescheduleDragOverlay.tsx`); entity `appointment/` — переиспользуемый `AppointmentBlock`.

### Клиенты (CRM)

- **Бэкенд:** миграции `000015` (`salon_clients`, `salon_client_tags`, `salon_client_tag_assignments`, колонка `appointments.salon_client_id`) и `000016` (seed системных тегов + backfill). API: `SalonClientRepository` + `SalonClientService` + `SalonClientController` под `/api/v1/dashboard/clients/`.
- **Эндпоинты:** `GET /clients` (список с поиском + фильтр по тегам + пагинация, `include_deleted=true`), `POST /clients`, `GET /clients/:id`, `PUT /clients/:id`, `DELETE /clients/:id` (soft-delete), `POST /clients/:id/restore`, `GET /clients/:id/appointments`, `GET /clients/tags`, `POST /clients/tags`, `POST /clients/:id/tags`, `DELETE /clients/:id/tags/:tagId`, `POST /clients/:id/merge` (слияние guest → user).
- **Фронт:** [`clientsApi.ts`](../../../frontend/src/shared/api/clientsApi.ts) — типы и функции; [`ClientsListView.tsx`](../../../frontend/src/pages/dashboard/ui/ClientsListView.tsx) — таблица клиентов; [`ClientDetailView.tsx`](../../../frontend/src/pages/dashboard/ui/ClientDetailView.tsx) — профиль + история записей; секция `clients` в `DashboardPage.tsx` + маршрут `/dashboard/clients/:clientId`.
- **Идеи задач:** добавление заметок из записи, bulk-теггинг, аналитика по клиенту.

### Мастера и профили (Этап 2)

- **Бэкенд:** `GET/POST/PUT/DELETE /api/v1/dashboard/salon-masters` (deprecated-алиасы `/api/v1/dashboard/staff` и `/staff/:id`), `PUT .../salon-masters/:id/services` (полная замена `salon_master_services` с оверрайдами), `GET /api/v1/dashboard/masters/lookup?phone=`, `POST /api/v1/dashboard/master-invites` (создаёт `salon_masters` со `status=pending`). Миграция `000013_salon_master_status`. В ответах списка и карточки: вложенный `masterProfile`, массив `services` с `salonPriceCents` / оверрайдами. Записи: в JSON поле `salonMasterId`.
- **Фронт:** таб-обёртка [StaffTabsView.tsx](../../../frontend/src/pages/dashboard/ui/views/StaffTabsView.tsx) (роут `/dashboard/staff/*`), [StaffFormModal.tsx](../../../frontend/src/pages/dashboard/ui/modals/StaffFormModal.tsx), [StaffListView.tsx](../../../frontend/src/pages/dashboard/ui/views/StaffListView.tsx), [StaffDetailView.tsx](../../../frontend/src/pages/dashboard/ui/views/StaffDetailView.tsx), entity API [staffApi.ts](../../../frontend/src/entities/staff/model/staffApi.ts), базовый RTK API [rtkApi.ts](../../../frontend/src/shared/api/rtkApi.ts).
- **Концепция:** [master_profiles_salon_masters.md](../entities/master-profiles-salon-masters.md), постановка: [agent-prompt-stage2-master-dashboard.md](../../archive/vault-plans-2026-04-24/agent-prompt-stage2-master-dashboard.md).

### Общие файлы API

- [dashboardApi.ts](../../../frontend/src/shared/api/dashboardApi.ts) — legacy helper-функции дашборда и shared типы; [rtkApi.ts](../../../frontend/src/shared/api/rtkApi.ts) — базовый `createApi` с auth headers/tagTypes; [clientsApi.ts](../../../frontend/src/shared/api/clientsApi.ts) — legacy CRM helper API; [staffApi.ts](../../../frontend/src/entities/staff/model/staffApi.ts) — staff endpoints в RTK Query entity-слое.
- **Бэкенд:** [dashboard_controller.go](../../../backend/internal/controller/dashboard_controller.go); сервис разбит на `service/dashboard_appointment.go`, `dashboard_schedule.go`, `dashboard_service_mgmt.go`, `dashboard_staff.go`, `dashboard_stats.go`, `dashboard_helpers.go`, `dashboard_types.go`; [`dashboard_repository.go`](../../../backend/internal/infrastructure/persistence/dashboard_repository.go).
