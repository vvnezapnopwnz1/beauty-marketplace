---
title: Vault CLAUDE protocol
updated: 2026-04-24
source_of_truth: true
code_pointers: []
---

# Beauty Marketplace — Vault

Obsidian vault для проекта beauty-marketplace. Открой папку `docs/vault` как vault в Obsidian. Карта всех заметок: [[README]] ([README.md](README.md)).

## Стек

- **Backend**: Go 1.24, uber/fx, net/http, GORM, PostgreSQL
- **Frontend**: React 18, TypeScript, Vite, Redux Toolkit, MUI, Feature-Sliced Design
- **Infra**: Docker Compose, PostgreSQL, 2GIS API (geo/places)

## Архитектурные заметки

- [[architecture/overview]] ([overview.md](architecture/overview.md)) — высокоуровневая схема сервисов
- [[architecture/backend]] ([backend.md](architecture/backend.md)) — DI-граф, сервисный слой, слоты, state machine записей
- [[architecture/db-schema]] ([db-schema.md](architecture/db-schema.md)) — ER-диаграмма PostgreSQL (все таблицы)
- [[architecture/api-flows]] ([api-flows.md](architecture/api-flows.md)) — sequence-диаграммы: auth, booking, search, dashboard
- [[architecture/frontend]] ([frontend.md](architecture/frontend.md)) — дерево React-компонентов и FSD-слои
- [[architecture/code-map]] ([code-map.md](architecture/code-map.md)) — концепция → путь в коде

## Продуктовая документация

- [[product/context]] ([context.md](product/context.md)) — продуктовый контекст, рынок, MVP, монетизация
- [[product/status]] ([status.md](product/status.md)) — текущий статус разработки, что готово / в процессе / не начато

## Контекст проекта

Beauty marketplace — платформа для онлайн-бронирования в салонах красоты.

**Ключевые сценарии:**
1. Клиент ищет салон/мастера по карте или поиску (2GIS интеграция)
2. Гостевое бронирование без регистрации (мультисервисный флоу)
3. Аутентификация по телефону (OTP)
4. Дашборд салона: управление записями, расписанием, персоналом, услугами
5. Дашборд мастера: личный профиль, записи, инвайты от салонов

## Session Protocol

```
At start:
  1. Read README.md (MOC) + product/status.md
When implementing:
  2. Check architecture/code-map.md → open the listed code pointers
When changing a product/architecture decision:
  3. Add or update the relevant ADR in adr/
At end:
  4. Update product/status.md section «Последние изменения» with date if anything shipped
```

## Структура репозитория

```
beauty-marketplace/
├── backend/
│   ├── cmd/api/main.go
│   └── internal/
│       ├── controller/    ← HTTP роутинг
│       ├── service/       ← бизнес-логика
│       ├── repository/    ← интерфейсы
│       ├── infrastructure/
│       │   ├── persistence/  ← GORM реализации
│       │   └── twogis/       ← 2GIS адаптер
│       ├── model/         ← доменные модели
│       └── auth/          ← JWT + middleware
├── frontend/
│   └── src/
│       ├── app/           ← App, Store, AuthBootstrap
│       ├── pages/         ← SearchPage, DashboardPage, SalonPage...
│       ├── features/      ← auth-by-phone, guest-booking, location
│       ├── entities/      ← salon, place, search, appointment
│       └── shared/        ← api/, ui/, config/, theme/
└── docs/vault/            ← этот vault
```
