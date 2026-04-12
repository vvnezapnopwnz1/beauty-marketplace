# Claude Instructions for This Repository

Use `AGENTS.md` as the canonical instruction set for this project.

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
