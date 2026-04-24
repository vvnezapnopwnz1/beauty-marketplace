---
title: "ADR 0005: salon_master как мост салон ↔ master_profile"
updated: 2026-04-24
source_of_truth: true
code_pointers:
  - backend/internal/infrastructure/persistence/model/models.go
---

## Контекст

Мастер может работать в нескольких салонах; в салоне нужны свои цены/длительности/цвет колонки и статус приглашения (`pending` / `active` / `inactive`).

## Решение

- **`master_profiles`** — глобальная сущность человека (телефон, `user_id` после claim).
- **`salon_masters`** — членство в конкретном салоне + оверрайды услуг (`salon_master_services`).
- Запись (`appointments`) ссылается на **`salon_master_id`** там, где важен контекст колонки календаря.

## Последствия

- Публичные слоты могут принимать `salonMasterId` без глобального `masterProfileId` в отдельных сценариях — см. API в `product/status.md`.

## Альтернативы

- Только `staff_id` внутри салона без глобального профиля — не даёт кабинет мастера между салонами.
