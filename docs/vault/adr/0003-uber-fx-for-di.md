---
title: "ADR 0003: Uber Fx для DI на бэкенде"
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - backend/internal/app/app.go
---

## Контекст

Много сервисов, репозиториев и HTTP-контроллеров; нужен явный граф зависимостей и единая точка сборки.

## Решение

**`uber/fx`**: модули `fx.Provide` / `fx.Invoke` в `app.go`, конструкторы `New*` для репозиториев, сервисов, контроллеров.

## Последствия

- Новые компоненты регистрируются в `app.go` (и при необходимости в `server.go` для маршрутов).
- См. [`runbooks/add-dashboard-endpoint.md`](../runbooks/add-dashboard-endpoint.md).

## Альтернативы

- Ручной `main` с порядком инициализации — хрупко при росте.
- Wire — отклонён в пользу уже освоенного Fx в проекте.
