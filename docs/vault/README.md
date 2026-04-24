---
title: Beauty Marketplace — Vault MOC
updated: 2026-04-24
source_of_truth: true
code_pointers: []
---

# Карта документации (MOC)

**Точка входа для агентов и людей:** прочитай этот файл и [`product/status.md`](product/status.md) перед задачей. Полный снимок монолитов до миграции — `docs/archive/*-monolith-2026-04-24.md` (исторический справочник, не править как источник правды).

## Продукт

| Заметка | Зачем |
|--------|--------|
| [`product/context.md`](product/context.md) | Рынок, MVP, монетизация, стратегия запуска, кабинет салона (обзор) |
| [`product/status.md`](product/status.md) | Что сделано, эндпоинты, техдолг, приоритеты, §7 кабинет для ТЗ |

## Архитектура

| Заметка | Зачем |
|--------|--------|
| [`architecture/overview.md`](architecture/overview.md) | Высокоуровневая схема клиент ↔ API ↔ БД ↔ 2GIS |
| [`architecture/backend.md`](architecture/backend.md) | Fx DI, сервисы, конфиг, 2GIS |
| [`architecture/db-schema.md`](architecture/db-schema.md) | ER и таблицы PostgreSQL |
| [`architecture/api-flows.md`](architecture/api-flows.md) | Sequence: auth, booking, search, dashboard |
| [`architecture/frontend.md`](architecture/frontend.md) | FSD, страницы, фичи |
| [`architecture/code-map.md`](architecture/code-map.md) | **Концепция → путь в коде** (читай перед правками) |

## ADR

| Файл | Тема |
|------|------|
| [`adr/0001-no-2gis-db-cache.md`](adr/0001-no-2gis-db-cache.md) | Каталог 2GIS только реалтайм, без кеша в БД |
| [`adr/0002-fsd-architecture-frontend.md`](adr/0002-fsd-architecture-frontend.md) | Feature-Sliced Design на фронте |
| [`adr/0003-uber-fx-for-di.md`](adr/0003-uber-fx-for-di.md) | Uber Fx для DI на бэкенде |
| [`adr/0004-jwt-auth-with-otp.md`](adr/0004-jwt-auth-with-otp.md) | OTP + JWT |
| [`adr/0005-salon-master-vs-master-profile.md`](adr/0005-salon-master-vs-master-profile.md) | `salon_masters` как мост салон ↔ мастер |

## Runbooks

| Файл | Когда |
|------|--------|
| [`runbooks/add-db-migration.md`](runbooks/add-db-migration.md) | Новая SQL-миграция |
| [`runbooks/add-dashboard-endpoint.md`](runbooks/add-dashboard-endpoint.md) | Новый эндпоинт под `/api/v1/dashboard` |
| [`runbooks/add-frontend-feature-fsd.md`](runbooks/add-frontend-feature-fsd.md) | Новая фича по FSD |
| [`runbooks/session-end-update-status.md`](runbooks/session-end-update-status.md) | Конец сессии — обновить статус |

## Сущности (спеки)

| Файл | Зачем |
|------|--------|
| [`entities/appointment-statuses.md`](entities/appointment-statuses.md) | Машина статусов записи |
| [`entities/dashboard-i18n.md`](entities/dashboard-i18n.md) | i18n дашборда |
| [`entities/entity-prototype.md`](entities/entity-prototype.md) | Прототип сущности |
| [`entities/master-profiles-salon-masters.md`](entities/master-profiles-salon-masters.md) | Мастер в салоне vs профиль |
| [`entities/plan-unified-search.md`](entities/plan-unified-search.md) | Unified search |
| [`entities/service-categories.md`](entities/service-categories.md) | Slug категорий услуг |
| [`entities/user-roles.md`](entities/user-roles.md) | Двухуровневая модель ролей и `EffectiveRoles` |

## Архив постановок (`../archive/vault-plans-2026-04-24/`)

Реализованные планы и agent-prompt’ы перенесены из волта в архив (история, ссылки из `product/status.md` ведут сюда).

| Файл | Зачем |
|------|--------|
| [`phase1-agent-prompt.md`](../archive/vault-plans-2026-04-24/phase1-agent-prompt.md) | Стартовый контекст для агента (исторический) |
| [`multi-service-guest-booking.md`](../archive/vault-plans-2026-04-24/multi-service-guest-booking.md) | Мульти-услуга, line items |
| [`track2-booking-slots.md`](../archive/vault-plans-2026-04-24/track2-booking-slots.md) | Слоты букинга |
| [`track4-dashboard-features.md`](../archive/vault-plans-2026-04-24/track4-dashboard-features.md) | Календарь, DnD |
| [`calendar-upgrade-prompt.md`](../archive/vault-plans-2026-04-24/calendar-upgrade-prompt.md) | Апгрейд календаря |
| [`agent-prompt-stage1-master-profiles.md`](../archive/vault-plans-2026-04-24/agent-prompt-stage1-master-profiles.md) | Этап 1 — профили |
| [`agent-prompt-stage2-master-dashboard.md`](../archive/vault-plans-2026-04-24/agent-prompt-stage2-master-dashboard.md) | Этап 2 — мастера в дашборде |
| [`agent-prompt-stage3-master-public.md`](../archive/vault-plans-2026-04-24/agent-prompt-stage3-master-public.md) | Этап 3 — публичный мастер |
| [`agent-prompt-stage4-master-cabinet.md`](../archive/vault-plans-2026-04-24/agent-prompt-stage4-master-cabinet.md) | Этап 4 — кабинет мастера |
| [`agent-prompt-dashboard-master-page-drawer.md`](../archive/vault-plans-2026-04-24/agent-prompt-dashboard-master-page-drawer.md) | Страница мастера, drawer |
| [`salon_place_page.md`](../archive/vault-plans-2026-04-24/salon_place_page.md) | Страница салона / place |
| [`bento-redesign-task.md`](../archive/vault-plans-2026-04-24/bento-redesign-task.md) | Bento сетка |

## Прочее

- [`glossary.md`](glossary.md) — термины RU/EN  
- [`CLAUDE.md`](CLAUDE.md) — Session Protocol для волта в Obsidian  
- [`../multi-service-booking-rollout-summary.md`](../multi-service-booking-rollout-summary.md) — сводка по мульти-услуге (вне волта, соседний файл)

## Диаграммы вне волта

- `docs/frontend-architecture.excalidraw`, `docs/app-pages-graph.html` — визуализация; при изменениях архитектуры обновляй или линкуй из `architecture/frontend.md`.
