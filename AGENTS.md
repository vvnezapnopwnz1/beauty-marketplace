# AI Operating Guide

This file is the shared source of truth for AI coding agents in this repository.
Tool-specific wrappers (`.cursor/rules/*`, `CLAUDE.md`) should point to this guide and not duplicate logic.

## 1) Project Context

- Monorepo with:
- `backend/`: Go 1.24, `net/http` + Fx + GORM + PostgreSQL.
- `frontend/`: React + TypeScript + Vite + MUI + Redux Toolkit.
- Local run:
- DB: `docker compose up -d`
- Backend: `cd backend && go run ./cmd/api`
- Frontend: `cd frontend && npm run dev`

## 2) Engineering Rules

- Keep changes focused and minimal for the requested task.
- Do not edit secrets (`.env*`, credentials) unless user explicitly asks.
- Prefer explicit, readable code over clever one-liners.
- Keep API contracts backward-compatible unless migration is part of task.
- Update docs when behavior or contract changes.

## 3) Safety Rules

- Never run destructive commands (`git reset --hard`, `rm -rf`, force push) unless explicitly requested.
- Never commit or push unless user explicitly asks.
- If unexpected unrelated file changes appear during the task, stop and ask user.

## 4) Verification Checklist (before done)

- Backend changed:
- `cd backend && go test ./...`
- Frontend changed:
- `cd frontend && npm run lint`
- Build-impacting frontend changes:
- `cd frontend && npm run build`

If a command cannot be run locally, report what is missing and provide exact command for the user.

## 5) PR/Commit Style

- Keep commit messages concise and intention-first.
- In PR summary include:
- user-visible behavior change
- risk/rollback notes
- test plan (exact commands)

## 6) MCP Governance

- Use only approved MCP servers configured in workspace.
- Before calling a new MCP tool, read its schema/descriptor first.
- Do not install or configure "shadow MCP" servers without explicit user approval.
