---
title: Runbook — новый dashboard API
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - backend/internal/app/app.go
  - backend/internal/controller/dashboard_controller.go
---

1. **Repository** (если нужен новый доступ к БД): интерфейс в `backend/internal/repository/`, реализация в `backend/internal/infrastructure/persistence/`.
2. **Service**: методы в подходящем `dashboard_*.go` или новом сервисе; держи транзакции и доменные правила здесь.
3. **Controller**: метод на `DashboardController` (или отдельный контроллер, вмонтированный под `/api/v1/dashboard`).
4. **Fx**: зарегистрируй конструкторы в `backend/internal/app/app.go`.
5. **Маршруты**: `backend/internal/controller/server.go` (или тот же файл, где биндится dashboard).
6. **Frontend**: `frontend/src/shared/api/dashboardApi.ts` + типы; UI в `pages/dashboard/` или `features/*`.
7. Документация: [`architecture/api-flows.md`](../architecture/api-flows.md), [`architecture/code-map.md`](../architecture/code-map.md), [`product/status.md`](../product/status.md).
