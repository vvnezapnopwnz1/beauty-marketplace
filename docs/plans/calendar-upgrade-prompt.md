# Задача: Улучшение календаря дашборда

## Контекст

Репозиторий: монорепо `beauty-marketplace`.
- Бэкенд: Go 1.24 + `net/http` + Fx + GORM + PostgreSQL.
- Фронтенд: React + TypeScript + Vite + MUI + Redux Toolkit.
- Тема дашборда: тёплая мокко-палитра в [`frontend/src/pages/dashboard/theme/mocha.ts`](../frontend/src/pages/dashboard/theme/mocha.ts).
- Правила проекта: `AGENTS.md` (минимальные изменения, backwards-compatible API, после кода — `go test ./...` + `npm run lint` + `npm run build`).

Эталонный мокап: [`docs/beautica-calendar-staff-mockup.html`](beautica-calendar-staff-mockup.html), вкладки «Календарь» и «Спеки». Скриншот спеки прикреплён как [`assets/image-9c65d25f-2f22-4c93-932f-3288dede0d2c.png`](../assets/../.cursor/projects/Users-vvnezapnopwnz-Documents-Files-beauty-marketplace/assets/image-9c65d25f-2f22-4c93-932f-3288dede0d2c.png).

---

## Что уже есть и что менять НЕ нужно

### Уже работает и трогать не нужно
- Таймлайн в режимах «День» и «Неделя»: события позиционируются абсолютно по `startsAt`/`endsAt` (высота пропорциональна длительности). Константы: `CALENDAR_HOUR_HEIGHT_PX = 48`, `CALENDAR_PX_PER_MINUTE = 0.8`. Файл: [`frontend/src/pages/dashboard/lib/calendarGridUtils.ts`](../frontend/src/pages/dashboard/lib/calendarGridUtils.ts).
- Пересечения в одной колонке: жадный алгоритм overlap columns в `layoutTimelineEventsForDay`.
- Клик по пустому месту открывает модалку создания записи с предзаполненным временем и мастером.
- Клик по событию открывает модалку деталей.
- Переключатели режимов (День / Неделя / Месяц), навигация по датам, фильтры мастер/услуга.
- Все три сетки: [`CalendarDayStaffGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx), [`CalendarWeekGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarWeekGrid.tsx), [`CalendarMonthGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarMonthGrid.tsx).
- Форматирование диапазона «09:00–10:30» в [`formatAppointmentTimeRangeRu`](../frontend/src/pages/dashboard/lib/calendarGridUtils.ts).

---

## Задачи для реализации

Реализуй задачи по одной, проверяя тесты и линтер после каждой группы. Не нарушай существующий API и не удаляй существующие экспорты из файлов-утилит.

---

### Задача 1 — Красная линия текущего времени

**Что нужно:** В режимах «День» и «Неделя» поверх таймлайна нарисовать горизонтальную красную линию, соответствующую текущему времени. Линия обновляется каждую минуту.

**Визуал (из мокапа):**
```css
/* Горизонтальная линия толщиной 2px, цвет var(--red) / mocha.red = '#FF6B6B' */
/* Слева — красный круг диаметром 8px */
/* z-index выше событий */
/* pointer-events: none */
```

**Где менять:**
- [`CalendarDayStaffGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx) — добавить компонент `NowLine` внутри каждой колонки (или абсолютно поверх тела таймлайна).
- [`CalendarWeekGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarWeekGrid.tsx) — то же.
- Добавить хук/утилиту в [`calendarGridUtils.ts`](../frontend/src/pages/dashboard/lib/calendarGridUtils.ts): `function nowLineTopPx(day: Date, pxPerMinute: number): number | null` — возвращает `null` если текущий день не совпадает с `day`.

**Логика:**
```ts
const now = new Date()
// Показывать линию только если today === day (локальная дата)
// top = ((now.getHours() * 60 + now.getMinutes()) - CALENDAR_HOUR_START * 60) * CALENDAR_PX_PER_MINUTE
// Если top < 0 или top > timelineH — не показывать
```

**Обновление:** `setInterval` на 60 000 мс, не забыть `clearInterval` при unmount.

---

### Задача 2 — Нерабочее время (штриховка колонки)

**Что нужно:** В режиме «День» колонки мастеров, у которых данный день является выходным (нет записи в `staff_working_hours` для этого `day_of_week`, или `is_day_off = true`), должны отображаться с диагональной штриховкой и полупрозрачностью. Аналогично — часы вне рабочего окна мастера затеняются.

**Визуал (мокап CSS):**
```css
.cal-cell.non-working {
  background: repeating-linear-gradient(
    45deg,
    transparent, transparent 4px,
    rgba(42,42,50,.15) 4px, rgba(42,42,50,.15) 5px
  );
}
```

**API:** расписание мастеров уже есть в бэкенде — `GET /api/v1/dashboard/schedule/staff/:staffId`. В `CalendarDayStaffGrid` уже принимается `staffColumns: StaffColumn[]`. Нужно передавать в него также расписание каждого мастера на этот день.

**Где менять:**
- [`DashboardCalendar.tsx`](../frontend/src/pages/dashboard/ui/DashboardCalendar.tsx) — при загрузке `mode === 'day'` запрашивать расписание мастеров (либо брать из уже загруженных данных, если dashboard хранит расписание).
- [`CalendarDayStaffGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx) — добавить prop `staffSchedules?: Map<string, { opensMins: number; closesMins: number; isOff: boolean }>` (минуты от полуночи). Перед отрисовкой блоков событий: если `isOff` — всю колонку перекрыть overlay со штриховкой. Если рабочие — добавить `beforeWork` и `afterWork` полосы с `position: absolute`.

**Подсказка по данным:** модель `StaffWorkingHour` (`staff_working_hours`) уже есть в `models.go` с полями `DayOfWeek`, `OpensAt` (string `HH:MM`), `ClosesAt`, `IsDayOff`, `BreakStartsAt`, `BreakEndsAt`. Парсить `"10:00"` → минуты.

---

### Задача 3 — Перерывы мастеров на таймлайне

**Что нужно:** В режиме «День» на таймлайне мастера показывать блок перерыва (обеда). Блок визуально отличается от событий — диагональная штриховка + текст «☕ Перерыв» / «🍽️ Обед».

**Визуал (мокап):**
```css
.cal-break {
  background: repeating-linear-gradient(
    45deg,
    rgba(42,42,50,.2), rgba(42,42,50,.2) 3px,
    transparent 3px, transparent 6px
  );
  color: var(--text3);
  font-size: 10px;
  text-align: center;
}
```

**Данные:** `StaffWorkingHour.BreakStartsAt`, `StaffWorkingHour.BreakEndsAt` (строки `HH:MM`, nullable). Конвертировать в `top` и `height` по той же логике, что и события.

**Где менять:**
- [`calendarGridUtils.ts`](../frontend/src/pages/dashboard/lib/calendarGridUtils.ts) — добавить `function breakBlockLayout(day: Date, breakStartHhmm: string, breakEndHhmm: string, pxPerMinute: number): { top: number; height: number } | null`.
- [`CalendarDayStaffGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx) — рендерить блок перерыва `position: absolute` поверх штриховки, под событиями (z-index 2, события — z-index 3+).

---

### Задача 4 — Аватарки мастеров в заголовке колонок (День) с цветовым акцентом

**Что нужно:** В шапке колонок режима «День» вместо простого текста имени показывать аватарку с инициалами и цветом мастера (поле `staff.color`). Мастер без цвета — серый фон.

**Визуал (мокап):**
```
[Аватар 28×28, borderRadius 50%, инициалы 2 буквы, фон = цвет мастера с opacity 0.2, цвет текста = цвет мастера]
[Имя, font-size 11px, обрезка по ширине]
```

**Цвета из моки** (7 вариантов, уже есть константа `STAFF_COLOR_SWATCHES` в [`dashboardApi.ts`](../frontend/src/shared/api/dashboardApi.ts)):
- `#D8956B` (accent), `#B088F9` (purple), `#FF8FAB` (pink), `#4ECDC4` (blue), `#FFA94D` (orange), `#6BCB77` (green), `#FFD93D` (yellow).

**Где менять:**
- [`CalendarDayStaffGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx) — расширить `StaffColumn` полем `color?: string | null`. Рисовать аватарку через `Box` с `borderRadius: '50%'`, фоном `rgba(<color>, 0.2)`, инициалами через `getInitials(label)`.
- [`DashboardCalendar.tsx`](../frontend/src/pages/dashboard/ui/DashboardCalendar.tsx) — при формировании `staffColumns` брать `color` из загруженного `staff`.

**Утилита:**
```ts
function getInitials(name: string): string {
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
```

---

### Задача 5 — Улучшенный блок события: цвет мастера + подпись в 3 строки

**Что нужно:** Блоки событий в таймлайне должны показывать больше информации, если хватает высоты. По спеке мокапа:

```
Строка 1 (bold): Название услуги
Строка 2: Имя клиента
Строка 3 (при height > 40px): Диапазон времени «09:00–10:00 · 60 мин»
```

Левая граница блока (`border-left: 3px solid <цвет мастера или статуса>`) уже есть в `VARIANT_SX`. Добавить — если у мастера есть свой цвет, использовать его как `border-left-color` вместо цвета статуса (опционально, по усмотрению).

**Дополнение к блоку (из мокапа):**
- Показывать длительность в минутах: `«09:00–10:00 · 60 мин»`. Для этого нужно вычислить `(endsAt - startsAt) / 60000` в минутах.

**Где менять:**
- [`CalendarDayStaffGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarDayStaffGrid.tsx) — `TimelineEventBlock`.
- [`CalendarWeekGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarWeekGrid.tsx) — аналогично.
- [`calendarGridUtils.ts`](../frontend/src/pages/dashboard/lib/calendarGridUtils.ts) — расширить `formatAppointmentTimeRangeRu` или добавить `formatAppointmentTimeRangeWithDuration`.

---

### Задача 6 — Улучшенный режим «Неделя»: агрегация по типам + переход в «День» по клику на ячейку

**Что нужно:** В режиме «Неделя» ячейки часа должны показывать количество записей по типу (подтверждённые / ожидающие / отмены), а клик на любую ячейку дня — переключать на режим «День» на эту дату.

**Визуал (из спеки мокапа):**
```
В ячейке: «Стрижка ×2» или «Подтверждена ×3, Ожидает ×1»
```

На деле — проще показывать общий счётчик с цветом статуса большинства:
```
Если все confirmed → зелёный блок «3 записи»
Если есть pending → жёлтый «2 · 1 ожид.»
Если есть cancelled → показать отдельно
```

**Клик по шапке дня** (уже реализовано частично через `CalendarMonthGrid`) — добавить в `CalendarWeekGrid` аналогичный callback `onDayHeaderClick?: (day: Date) => void`, в `DashboardCalendar` — при вызове переключать `mode` на `'day'` и `setAnchor(day)`.

**Где менять:**
- [`CalendarWeekGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarWeekGrid.tsx) — добавить prop `onDayHeaderClick?: (day: Date) => void`, рендерить шапку дня как кликабельную.
- [`DashboardCalendar.tsx`](../frontend/src/pages/dashboard/ui/DashboardCalendar.tsx) — передавать `onDayHeaderClick`.

---

### Задача 7 — Улучшенный режим «Месяц»: индикаторы загруженности

**Что нужно:** В месячной сетке вместо (или вместе с) текстовыми строками событий добавить **цветную полосу или точку** под числом дня, отражающую количество записей:

- 0 записей — пусто
- 1–3 — одна точка или короткая полоска
- 4–7 — средняя полоска
- 8+ — полная полоска / тёмный фон

Клик на день — переключение в режим «День» (уже реализовано через `onPickDay`).

**Где менять:**
- [`CalendarMonthGrid.tsx`](../frontend/src/pages/dashboard/ui/CalendarMonthGrid.tsx) — под `Typography` с числом дня добавить `LoadBar` или набор точек на основе `show.length` (уже есть в компоненте).

---

### Задача 8 — Модалка деталей записи: расширение информации

**Что нужно:** Модалка деталей записи (открывается по клику на событие в календаре, см. `DashboardCalendar.tsx`, `detail` state) должна показывать всё по спеке мокапа:

```
[Аватар клиента с инициалами] [Имя, телефон, N визитов] [Бейдж статуса]
─────────────────────────────────────────────────────────────
Услуга         | Мастер
Дата и время   | Стоимость
─────────────────────────────────────────────────────────────
Заметка клиента (если есть)
─────────────────────────────────────────────────────────────
[Закрыть]  [✏️ Редактировать]  [✓ Завершить]  [✗ Отменить]
```

**Текущее состояние:** `detail` уже хранит `DashboardAppointment` с полями `serviceName`, `staffName`, `clientLabel`, `clientPhone`, `status`, `clientNote`, `startsAt`, `endsAt`. Не хватает: числа визитов (нет в API), цены услуги (нет в списке записей).

**Минимальная реализация (без числа визитов):**
- Показать аватарку с инициалами из `clientLabel`, фон — цвет мастера или `mocha.control`.
- Добавить строку «Дата и время»: `startsAt … endsAt` локально, + длительность в минутах.
- Убрать кнопку-эмодзи «✏️» (текущая ставит `completed`!) — заменить на корректное «Завершить» для `confirmed`.
- Добавить кнопку «✏️ Редактировать» — открывать ту же модалку редактирования что в `DashboardAppointments`.

**Где менять:**
- [`DashboardCalendar.tsx`](../frontend/src/pages/dashboard/ui/DashboardCalendar.tsx) — блок `Dialog` с `detail`.
- Можно вынести в отдельный компонент `AppointmentDetailModal.tsx` в `frontend/src/pages/dashboard/ui/modals/`, чтобы переиспользовать из `DashboardAppointments`.

---

## Приоритеты и порядок

Рекомендуемый порядок реализации:

1. **Задача 4** (аватарки в шапке) — визуально заметно, просто, без бэкенда.
2. **Задача 5** (блок события: 3 строки + длительность) — просто, улучшает читаемость.
3. **Задача 1** (красная линия) — заметный UX-элемент, только фронт.
4. **Задача 6** (неделя: клик на заголовок дня) — малое изменение, большой эффект.
5. **Задача 7** (месяц: индикаторы загруженности) — улучшение без API.
6. **Задача 8** (модалка деталей) — немного рефакторинга.
7. **Задача 2** (нерабочее время) — требует данных расписания мастера.
8. **Задача 3** (перерывы) — требует данных расписания мастера.

---

## Что НЕ входит в эту задачу (следующий этап)

- **Drag & drop событий** (перенос в другой слот / к другому мастеру) — требует серьёзной DnD библиотеки и изменения API (`PUT /appointments/:id` уже есть, нужна обёртка).
- **Drag за нижний край** (изменение длительности) — сложный resize handler.
- **Слайдер масштаба** (zoom Fresha-style) — потребует изменения `CALENDAR_HOUR_HEIGHT_PX`.
- **Доступные слоты** в форме создания (пикер `09:00 / 10:00 / ...`) — требует API `GET /dashboard/slots?staffId=&date=&serviceId=` (сейчас не реализован).
- **Override цены/длительности мастера** на услугу — в БД `staff_services` без доп. полей цены/длительности; нужно расширение схемы.
- **Отпуска/исключения** (`staff_absences`) на таймлайне — модели есть, API частично, нужен UI.

---

## Технические ограничения и стиль

- Все цвета берутся из [`mocha.ts`](../frontend/src/pages/dashboard/theme/mocha.ts) или из совпадающих значений с CSS-переменными мокапа.
- Не использовать `React` напрямую — импортировать конкретные хуки/типы из `'react'`.
- Не устанавливать новые npm-пакеты без необходимости.
- Все хелперы добавляются в `calendarGridUtils.ts`; компоненты — в существующие файлы или новые под `ui/modals/`.
- После изменений: `npm run lint` (0 errors), `npm run build` (success).
