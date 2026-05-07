---
title: Детали записи в frontend
status: open
priority: normal
scheduled: 2026-05-07
dateCreated: 2026-05-07T14:13:28.860+03:00
dateModified: 2026-05-07T15:00:00.000+03:00
tags:
  - task
  - frontend
  - dashboard
---

## Цель

При выборе/изменении услуг в дровере записи автоматически подставлять «Итого» = сумма `priceCents` выбранных услуг, при этом сохраняя возможность ручного оверрайда. Сейчас поле остаётся пустым, расчётная цена показывается только в `placeholder`/`helperText` — пользователь каждый раз вводит сумму руками.

## Текущее состояние

- Бэкенд уже отличает `totalSource: 'calculated' | 'manual'` и хранит `calculatedTotalCents` рядом с `totalCents` (см. ответ `AppointmentDrawer.appointment` в `frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx:58-59,574,716`).
- В `CreateAppointmentDrawer.tsx:66,78-80,290` уже считается `calculatedTotal`, но `form.totalCents` инициализируется `null` → поле пустое.
- В `AppointmentDrawer.tsx:145,200,273,290` `totalCents` подтягивается из записи; при добавлении услуги в редактирование пересчёта в форме нет.
- В кабинете мастера: `CreateMasterAppointmentDrawer` / `MasterPersonalAppointmentDrawer` (`frontend/src/entities/master/...`) — должны вести себя так же.
- Мульти-услуга и `appointment_line_items` (миграция `000014`) — учитывать сумму по всем строкам, см. [`product/status.md`](../../product/status.md) запись от 2026-04-18.

## Что сделать (frontend)

1. В `CreateAppointmentDrawer`: при изменении `serviceIds` синхронизировать `form.totalCents = calculatedTotal`, пока пользователь не правил поле вручную. Завести флаг `totalManuallyEdited` в локальном стейте (sticky после первого ручного ввода) — это совместимо с тем, что бэкенд интерпретирует `null` как «авторасчёт».
2. В `AppointmentDrawer`: при добавлении/удалении услуги (если такое возможно из дровера) — аналогичный пересчёт. Если редактирование услуг идёт только через отдельный экран, ограничиться initial-инициализацией `totalCents = appointment.totalCents ?? appointment.calculatedTotalCents`.
3. Тот же паттерн применить в `CreateMasterAppointmentDrawer` и `MasterPersonalAppointmentDrawer` (кабинет мастера).
4. Мобильное приложение (`mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx` + будущий drawer создания) — повторить логику; пока создание записи на мобайле не реализовано, оставить пометкой в backlog мобайла.
5. Не подставлять авторасчёт, если хотя бы одна выбранная услуга имеет `priceCents == null` («по договорённости») — поле пустое + helper «Цена части услуг — по договорённости».
6. i18n: вынести строки `Итого`, helper-теxts в `ru/en` (сейчас захардкожены).

## Acceptance criteria

- Выбор услуги → поле «Итого» сразу показывает сумму, без ручного ввода.
- Удаление услуги → сумма обновляется (если не было ручного оверрайда).
- Ручной ввод → сумма больше не пересчитывается до явного сброса (кнопка «Сбросить к расчётной» рядом с полем — nice to have).
- При сохранении: если значение совпало с `calculatedTotalCents`, отправляем `null` (бэкенд проставит `totalSource: 'calculated'`); иначе `totalCents` явно и `totalSource: 'manual'`.

## Связанные ссылки

- [`product/status.md`](../../product/status.md) — записи от 2026-04-21 (DnD/drawer рефактор) и 2026-04-18 (line items).
- Архив: [`docs/archive/vault-plans-2026-04-24/multi-service-guest-booking.md`](../../../archive/vault-plans-2026-04-24/multi-service-guest-booking.md) §12 — отображение мульти-услуги в списках.
