---
title: Архитектура системы (обзор)
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - backend/internal/controller/server.go
  - frontend/src/app/App.tsx
---

# Архитектура системы

Высокоуровневая схема сервисов и их взаимодействия. Указатели в код: [`code-map.md`](code-map.md).

```mermaid
graph TB
    subgraph Client["Клиент (React/TS · Vite)"]
        FE["Frontend SPA"]
    end

    subgraph Backend["Backend (Go · fx · net/http)"]
        API["HTTP Server\n:8080"]
        AUTH["auth\n(JWT + OTP)"]
        SVC["Services\n(business logic)"]
        REPO["Repositories\n(interfaces)"]
    end

    subgraph Infra["Инфраструктура"]
        PG[("PostgreSQL")]
        TWOGIS["2GIS API\n(geo / places)"]
    end

    FE -->|"REST /api/v1"| API
    API --> AUTH
    AUTH --> SVC
    SVC --> REPO
    REPO --> PG
    SVC --> TWOGIS

    style Client fill:#f0f4ff,stroke:#6b7fc4
    style Backend fill:#f0fff4,stroke:#4caf78
    style Infra fill:#fff8f0,stroke:#c47b30
```

## Слои бэкенда

| Слой | Папка | Отвечает за |
|------|-------|------------|
| Controllers | `internal/controller` | HTTP-роутинг, decode/encode |
| Services | `internal/service` | Бизнес-логика |
| Repositories | `internal/repository` | Интерфейсы доступа к данным |
| Persistence | `internal/infrastructure/persistence` | Реализации репозиториев (GORM) |
| Auth | `internal/auth` | JWT, middleware |

## Связанные заметки

- [[db-schema]] ([db-schema.md](db-schema.md)) — ER-диаграмма базы данных
- [[api-flows]] ([api-flows.md](api-flows.md)) — sequence-диаграммы ключевых API
- [[frontend]] ([frontend.md](frontend.md)) — дерево React-компонентов
