---
title: Указатели концепция → код
updated: 2026-05-01
source_of_truth: true
code_pointers:
  - backend/internal/app/app.go
  - frontend/src/app/App.tsx
---

# Code map

Краткая таблица: **где в коде искать логику**. Детали — в [`backend.md`](backend.md), [`frontend.md`](frontend.md), [`api-flows.md`](api-flows.md).

| Концепция | Backend | Frontend |
|-----------|---------|----------|
| OTP + JWT, claim теневого мастера | `backend/internal/service/auth.go` | `frontend/src/features/auth-by-phone/` |
| Расчёт слотов, гостевое бронирование (авто user по телефону, `client_user_id`) | `backend/internal/service/booking.go` (`GetAvailableSlots`, `CreateGuestBooking`) | `frontend/src/features/guest-booking/ui/PublicSlotPicker.tsx`, `GuestBookingDialog.tsx` |
| State machine записи в дашборде | `backend/internal/service/dashboard_appointment.go` | `frontend/src/entities/appointment/` |
| Палитра дашборда | — | `frontend/src/shared/theme/dashboardPalette.ts` |
| 2GIS адаптер | `backend/internal/infrastructure/twogis/` | — |
| DI-граф, регистрация контроллеров | `backend/internal/app/app.go` | — |
| Redux store | — | `frontend/src/app/store.ts` |
| HTTP-роутинг сервера | `backend/internal/controller/server.go` | — |
| Роуты SPA | — | `frontend/src/app/App.tsx` |
| Unified search | `backend/internal/service/search.go`, `controller/search_controller.go` | `frontend/src/features/` + `entities/search/` |
| CRM клиенты салона | `backend/internal/service/salon_client_service.go`, `controller/salon_client_controller.go` | `frontend/src/shared/api/clientsApi.ts`, `pages/dashboard/ui/ClientsListView.tsx` |
| Staff entity (RTK Query + slice) | `backend/internal/service/dashboard_staff.go`, `controller/dashboard_controller.go` | `frontend/src/entities/staff/model/staffApi.ts`, `frontend/src/entities/staff/model/staffSlice.ts`, `frontend/src/pages/dashboard/ui/views/StaffTabsView.tsx` |
| Персонал салона, инвайты членов (`salon_member_invites`) | `repository/salon_member_invite.go`, `persistence/salon_member_invite_repository.go`, `service/dashboard_personnel.go`, `controller/dashboard_personnel_handlers.go`, `service/auth.go` (привязка инвайтов по телефону после OTP) | `frontend/src/entities/salon-invite/`, `pages/dashboard/ui/views/PersonnelView.tsx`, `drawers/InviteStaffDrawer.tsx` |
| Multi-salon дашборд (`X-Salon-Id`, маршрут `/dashboard/:salonId`) | `controller/dashboard_controller.go` (`resolveSalonMembership`) | `shared/lib/activeSalon.ts`, `shared/config/routes.ts`, `App.tsx`, `DashboardPage.tsx`, `widgets/user-menu/ui/UserMenu.tsx` |
| Приглашения в салон (принятие пользователем) | `controller/user_controller.go` (`/api/v1/me/salon-invites/*`) | `shared/api/meApi.ts`, `pages/me/ui/sections/SalonInvitesSection.tsx` |
| **Мои записи** (`GET /api/v1/me/appointments`) | `backend/internal/service/user_appointments.go`, `repository/user_appointment.go`, `infrastructure/persistence/user_appointment_repository.go`, `controller/user_controller.go` | `frontend/src/entities/user-appointment/`, `pages/me/ui/sections/AppointmentsSection.tsx` |
| In-app notifications (`seen`/`read`, SSE, счетчики) | `controller/notification_controller.go`, `service/notification_service.go`, `service/appointment_notifier.go`, `infrastructure/persistence/notification_repository.go` | `app/NotificationsProvider.tsx`, `entities/notification/model/notificationApi.ts`, `entities/notification/model/notificationStream.ts`, `widgets/notification-popover/ui/NotificationMenuPopover.tsx`, `widgets/notification-popover/lib/handleIncomingNotification.tsx`, `pages/notifications/` |
| DnD перенос записи | `PUT .../appointments/:id` (см. dashboard) | `frontend/src/features/reschedule-appointment/`, `pages/dashboard/lib/dndCalendarUtils.ts` |
| Dev auth/e2e bootstrap (`DEV_OTP_BYPASS_ANY`, `/api/dev/*`) | `backend/internal/config/config.go`, `backend/internal/service/auth.go`, `backend/internal/controller/dev_controller.go`, `backend/internal/controller/server.go` | `frontend/e2e/helpers/api-helpers.ts`, `frontend/e2e/playwright.config.ts`, `frontend/e2e/tests/flow-runner.spec.ts` |
| E2E flow-runner (YAML сценарии + action registry) | — | `frontend/e2e/scenarios/flows.yaml`, `frontend/e2e/actions/index.ts` (+ `notification.actions.ts`), `frontend/e2e/helpers/flow-loader.ts` |

## Связанные заметки

- [[overview]] ([overview.md](overview.md)) — архитектура системы
- [[backend]] ([backend.md](backend.md)) — детали бэкенда
