---
title: Runbook — конец сессии разработки
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - docs/vault/product/status.md
---

Перед коммитом / сдачей задачи:

1. Открой [`product/status.md`](../product/status.md).
2. В **«Последние изменения»** добавь пункт с датой (формат как у существующих) и 1–3 bullets: что сделано, какие файлы/миграции.
3. Если менялось архитектурное решение — создай или обнови ADR в [`adr/`](../adr/).
4. Если новый публичный контракт API — кратко отрази в [`architecture/api-flows.md`](../architecture/api-flows.md) или в code-map.
5. Прогон проверок из `AGENTS.md` (`go test`, `npm run lint` / `build` по затронутым частям).
