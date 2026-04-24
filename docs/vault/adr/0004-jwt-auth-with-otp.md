---
title: "ADR 0004: аутентификация OTP + JWT"
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - backend/internal/service/auth.go
  - backend/internal/auth/jwt.go
---

## Контекст

Пользователи и владельцы салонов в РФ: привычный вход по телефону без пароля.

## Решение

- OTP (4 цифры, TTL ~5 мин) → выдача **access JWT** (короткий TTL) + **refresh** (дольше, хранится хеш в БД).
- Защищённые роуты — middleware по access; refresh — отдельный эндпоинт.

## Последствия

- Доставка OTP в dev может быть заглушкой; для prod нужен провайдер (SMS/Telegram) — см. `product/status.md` техдолг.

## Альтернативы

- Magic link email — не приоритет для целевой аудитории MVP.
