---
title: Календарь в мобильном приложении — Неделя и Месяц должны выглядеть как нативный календарь
status: open
priority: normal
scheduled: 2026-05-07
dateCreated: 2026-05-07T14:54:52.731+03:00
dateModified: 2026-05-07T15:00:00.000+03:00
tags:
  - task
  - mobile
  - calendar
  - ux
---

## Цель

Привести вкладки «Неделя» и «Месяц» календаря в мобильном приложении к ожиданиям нативного календаря iOS/Android: плавный swipe между неделями/месяцами, тач-таргеты ≥ 44pt, понятные today-индикаторы, правильная RU-локаль и неделя с понедельника, читаемые блоки записей. Сейчас сетка кастомная и визуально ощущается как «веб в WebView».

## Текущее состояние

- `mobile/app/(tabs)/calendar.tsx` — экран с переключателем `viewMode: "day" | "week"` (вкладки «Месяц» как самостоятельного режима по сути нет, есть только `MonthHeatmap` сверху).
- `mobile/src/features/calendar/MasterCalendar.tsx` — кастомная week/day-сетка.
- `mobile/src/features/calendar/MonthHeatmap.tsx` — кастомная тепловая карта по `GET /api/v1/master-dashboard/appointments/heatmap?month=YYYY-MM`.
- `mobile/src/features/calendar/AppointmentQuickActionsSheet.tsx` — bottom-sheet (`@gorhom/bottom-sheet`), вызывается тапом по записи.
- `mobile/src/features/reschedule/useRescheduleAppointment.ts` — optimistic-перенос через DnD, который на мобайле сейчас работает в текущем кастомном week-grid.

## Проблемы

1. Нет полноценного режима «Месяц» — только heatmap; нельзя тапнуть по дню и увидеть записи.
2. Нет swipe между неделями/месяцами; навигация через кнопки/верхнюю строку.
3. Неделя начинается с воскресенья (`d.getDay()` без сдвига) — для RU должна с понедельника.
4. Today/now-индикатор минималистичный, без ощущения живой временной шкалы как в нативном календаре.
5. Блоки записей в часе — без типографики/иерархии (мастер/услуга/клиент).

## Что сделать

### Этап 1 — дизайн (через `frontend-design` / `ios-hig-design` skill)

- Запустить `frontend-design` или `ui-ux-pro-max` skill с brief'ом: native iOS/Android calendar, клиент = мастер/администратор, ключевая операция = быстрая запись клиента и перенос записи; референсы — Fantastical, Apple Calendar, Google Calendar, Cron, Booksy.
- На выходе: 3 варианта (минималистичный / насыщенный данными / гибридный), мокапы Week / Month / Day для светлой и тёмной темы.

### Этап 2 — выбор библиотеки

Кандидаты (в порядке приоритета — учитывать DnD-совместимость, т.к. drag-перенос уже работает):

| Библиотека | + | − |
|-----------|---|---|
| `@howljs/react-native-calendar-kit` | Современный API, поддержка событий, week/day, drag-and-drop из коробки, gesture-handler, локали | Меньшее community, активная разработка |
| `react-native-big-calendar` | Минимальный, легко кастомизируется | DnD надо допиливать; нет month-режима с агрегатами |
| `react-native-calendars` (wix) | De-facto стандарт, отличный месяц/agenda, RU-локаль | Нет нативного DnD событий, week-режим — только timeline через подмодуль |

Гибрид: `wix/react-native-calendars` для **Месяца** (агрегаты + календарная сетка) + кастомный или `@howljs` для **Недели/Дня** с DnD. Сохраняем `MonthHeatmap` как fallback / overlay цвет дня по нагрузке.

### Этап 3 — реализация

- Добавить полноценный `viewMode: "day" | "week" | "month"` в `calendar.tsx`.
- Месяц: `react-native-calendars` Calendar с `markedDates` из heatmap-API, при тапе по дню — переход в режим Day с этой датой.
- Неделя: оценить миграцию `MasterCalendar` на `@howljs/react-native-calendar-kit` или оставить кастомную, но добавить:
  - Понедельник как первый день недели (фикс `getDay()` → ISO weekday).
  - Horizontal swipe (через `react-native-gesture-handler` Pager) между неделями.
  - Sticky now-line, обновление по таймеру.
  - Типографика в блоке: время → услуга → клиент (3 строки), цвет полоски слева = цвет мастера.
- Локаль: подключить `LocaleConfig.locales['ru']` и использовать существующий i18n (`mobile/src/shared/i18n/i18n.ts`).
- Сохранить совместимость с `useRescheduleAppointment` (optimistic + rollback).

### Этап 4 — приёмка

- [ ] Swipe влево/вправо между неделями и месяцами без лагов на iPhone 12+ / Pixel 6+.
- [ ] Сегодня визуально выделяется и в Месяце, и в Неделе.
- [ ] Понедельник — первый день недели, локаль RU.
- [ ] Drag-перенос записи продолжает работать.
- [ ] Bottom-sheet с быстрыми действиями открывается так же.
- [ ] Тёмная и светлая темы соответствуют дизайну.

## Связанные ссылки

- [`product/status.md`](../../product/status.md) — Phase 2 (P2-1..P2-5) от 2026-05-06 (heatmap, MasterCalendar, AppointmentQuickActionsSheet).
- Архив: [`docs/archive/vault-plans-2026-04-24/calendar-upgrade-prompt.md`](../../../archive/vault-plans-2026-04-24/calendar-upgrade-prompt.md) — что уже сделано на вебе (now-line, штриховка нерабочего, DnD between weeks); идеи переиспользовать.
