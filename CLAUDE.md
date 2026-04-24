# Claude Instructions for This Repository

Use `AGENTS.md` as the canonical instruction set for this project.

**Cursor:** те же шаги закреплены в **`.cursor/rules/00-core.mdc`** и **`.cursor/rules/10-workflow.mdc`** (`alwaysApply: true`), чтобы агенты в IDE не зависели только от чтения `CLAUDE.md`.

## Документация (обязательно)

Перед любой задачей прочитай **[`docs/vault/README.md`](docs/vault/README.md)** (карта волта, MOC) и **[`docs/vault/product/status.md`](docs/vault/product/status.md)** (последние изменения и приоритеты). Источник правды по продукту и архитектуре — каталог **`docs/vault/`**; снимки старых монолитов — только в **`docs/archive/*-monolith-2026-04-24.md`**.

## Project

- Monorepo: Go backend + React/TS frontend.
- Respect existing architecture and keep changes task-focused.

## Required Behavior

- Follow engineering and safety rules from `AGENTS.md`.
- Run relevant verification commands from `AGENTS.md` before declaring task done.
- Do not commit or push unless explicitly requested by the user.
- Do not perform destructive git actions unless explicitly requested.

## MCP

- Use only approved MCP servers.
- Read tool schema/descriptor before first call.
- Do not add unapproved/shadow MCP servers.
