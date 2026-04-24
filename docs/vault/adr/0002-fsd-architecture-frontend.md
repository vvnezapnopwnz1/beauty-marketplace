---
title: "ADR 0002: Feature-Sliced Design на фронтенде"
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - frontend/src/app/App.tsx
---

## Контекст

Фронтенд растёт (поиск, салон, дашборд, мастер); нужна предсказуемая структура импортов и изоляция фич.

## Решение

Слои **FSD**: `app` → `pages` → `features` → `entities` → `shared`. Страницы собирают виджеты; бизнес-флоу в `features/*`; переиспользуемые доменные куски в `entities/*`.

## Последствия

- Импорт только «вниз» по слоям; перекрёстные зависимости через публичный API слоя (`index.ts`).
- Новые фичи — по [`runbooks/add-frontend-feature-fsd.md`](../runbooks/add-frontend-feature-fsd.md).

## Альтернативы

- Плоская структура `components/` — отклонена из‑за связности дашборда и поиска.
