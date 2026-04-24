---
title: Runbook — новая SQL-миграция
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - backend/migrations
---

1. Определи следующий номер: сейчас последняя up-миграция **`000016_...`** → следующая **`000017_<краткое_имя>.up.sql`** и пара **`000017_<...>.down.sql`**.
2. Пиши **идемпотентный** `up`: новые таблицы/колонки/индексы; в `down` — обратимый откат.
3. Если добавляешь **enum** или справочные строки, обязателен **seed** в той же или следующей миграции (как `000016` для тегов клиентов).
4. Прогон локально: `make db-migrate` (или `migrate` с тем же DSN, что в `AGENTS.md`).
5. Обнови [`architecture/db-schema.md`](../architecture/db-schema.md) и при смене контракта — [`product/status.md`](../product/status.md).
