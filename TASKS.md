# TASKS — Beauty Marketplace

> Последнее обновление: 2026-04-24
> Проект: Beauty Marketplace (pre-MVP, v0.1)
> Стек: Go backend + React/TS frontend, PostgreSQL

---

## 🔴 Критично (блокеры MVP)

- [ ] **OTP-доставка — SMS/Telegram** — без этого нельзя онбордить реальных пользователей. Добавить интерфейс `OTPSender` в `service/auth.go`, реализацию в `infrastructure/telegram/` (или SMS-провайдер — SMSc.ru, МТС Exolve).
- [ ] **Страница профиля пользователя** — после входа показывать профиль (имя, телефон, аватар), форма редактирования, CRUD. Учесть роли: гость / зарегистрированный / владелец / администратор.
- [ ] **Seed реальных московских салонов** — скрипт `cmd/seed/main.go` (2GIS → `salons` + `salon_external_ids`), команда `make seed-moscow`.

---

## 🟡 Важно (до первого онбординга)

- [ ] **Production деплой** — VPS + Docker Compose, NGINX reverse proxy, Let's Encrypt, `.env.production`. Без деплоя нельзя показать продукт салонам.
- [ ] **Rate limiting на `/api/auth/otp/request`** — добавить Redis + rate limiter.
- [ ] **CORS** — ограничить `*` до конкретных доменов.
- [ ] **JWT_SECRET** — сменить `"dev-secret-change-me"` перед prod-деплоем.

---

## 🟠 Дашборд — следующий этап UX

- [ ] **Resize длительности записи** — перетаскивание нижней границы блока в календаре.
- [ ] **Zoom таймлайна** — масштаб 08:00–21:59 по горизонтали или вертикали.
- [ ] **Конфликты слотов** — визуальный индикатор + поле в ответе API при пересечении.
- [ ] **Кастомные категории услуг на салон** — таблица `service_categories` с `salon_id != NULL`.
- [ ] **Напоминания клиентам** — push/SMS за N часов до записи.

---

## 🔵 Backlog (отложено)

- [ ] Смена телефона через OTP (редкая операция, нетривиальный флоу)
- [ ] Загрузка аватара пользователя (нужна S3-инфраструктура — Yandex Object Storage / MinIO)
- [ ] Расширить `salon_members.role` → добавить `receptionist` и `accountant`
- [ ] Super-admin интерфейс (роль `admin` уже в `global_role`, нет UI/API)
- [ ] SMS-провайдер (SMSC, МТС Exolve)
- [ ] Эндпоинты отзывов (схема в БД есть, функционал не начат)
- [ ] Подписки и оплата (ЮКасса, СБП)
- [ ] Telegram-бот для уведомлений о записях
- [ ] Yandex Maps адаптер (второй `PlacesProvider`)
- [ ] React Native мобильное приложение
- [ ] Bulk-теггинг клиентов и аналитика по клиенту
- [ ] Записи через Yandex Business

---

## ✅ Сделано

- [x] OTP + JWT авторизация (access 15 мин, refresh 30 дней)
- [x] Telegram OTP канал (`POST /api/auth/otp/request` с `channel: "telegram"`)
- [x] 2GIS адаптер — поиск и детали работают
- [x] Unified search (`GET /api/v1/search` + fallback 2GIS)
- [x] Гостевая запись (wizard: услуга → мастер → слот → контакты)
- [x] Мульти-услуга в букинге (`appointment_line_items`, миграция 000014)
- [x] Кабинет салона: записи CRUD + календарь (день/неделя/месяц)
- [x] DnD-перенос записей в календаре (`@dnd-kit/react`)
- [x] Расписание мастеров, перерывы, NowLine, аватарки в колонках
- [x] Мастера: профили, инвайты, оверрайды услуг, lookup по телефону
- [x] Кабинет мастера (`/api/v1/master-dashboard/`, `/master-dashboard`)
- [x] Публичный профиль мастера (`/master/:masterProfileId`)
- [x] CRM-модуль клиентов (`salon_clients`, теги, история, merge guest→user)
- [x] Рефакторинг `dashboard.go` → 7 доменных файлов
- [x] FSD-архитектура фронтенда (`features/reschedule-appointment/`)
- [x] Страница мастера в дашборде + drawer'ы
- [x] DataGrid: `shared/ui/DataGrid/`, иконки через Iconify
- [x] Семантическая палитра дашборда (`theme.palette.dashboard`)
- [x] Bento-сетка SearchResultCard (normal / featured-vertical / featured-horizontal)
- [x] Профиль пользователя `/me` (backend, шаги 1-4): расширение `users`, soft-delete-safe auth, recalc `global_role`, API `GET/PUT /api/v1/me`, sessions endpoints, `VerifyOTP.user.sessionId`
