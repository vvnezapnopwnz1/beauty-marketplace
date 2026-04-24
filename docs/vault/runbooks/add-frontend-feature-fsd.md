---
title: Runbook — новая фича по FSD
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - frontend/src/features
  - frontend/src/entities
---

1. Определи слой: **`feature`** (сценарий с UI и эффектами) vs **`entity`** (доменный блок без привязки к странице) vs **`shared`** (ui, api, config).
2. Создай папку `frontend/src/features/<name>/` с `ui/`, `model/`, `index.ts` по образцу существующих фич.
3. Подключи роут/страницу в `frontend/src/app/App.tsx` или в странице дашборда через секции.
4. API — в `shared/api/`; не импортируй `pages` из `features` снизу вверх.
5. Обнови [`architecture/frontend.md`](../architecture/frontend.md) или [`code-map.md`](../architecture/code-map.md), если появился новый значимый поток.
