# Design Context — Beauty Marketplace (Beautica)

> Файл для Claude Design. Описывает продукт, дизайн-систему и компонент Calendar.

---

## 1. Продукт

**Beautica** — двусторонний маркетплейс салонов красоты и частных мастеров для России и СНГ.
Аналог ушедшего Booksy (2022). Два пользователя: **клиент** (ищет и записывается) и **владелец/мастер** (ведёт расписание).

**Стек:** React 18 + Vite + MUI v5 + Redux Toolkit, Go 1.24 backend, PostgreSQL, 2GIS API.

**Основные страницы:**
- `/` — SearchPage (поиск салонов + карта 2GIS)
- `/salon/:id`, `/place/:externalId` — SalonPage + гостевой букинг
- `/login` — OTP-авторизация (телефон → 4 цифры → JWT)
- `/dashboard` — панель владельца (календарь, записи, мастера, услуги, расписание, профиль)

---

## 2. Дизайн-система

### 2.1 Типографика

| Роль | Шрифт | Вес |
|---|---|---|
| Заголовки h1–h5 | Fraunces (serif) | 500 |
| UI / тело | DM Sans (sans-serif) | 400 / 500 |
| Кнопки, чипы | DM Sans | 500 |

`letter-spacing`: h1 `-1.5px`, h2 `-1px`, h3/h4 `-0.5px`.
`textTransform: none` на всех кнопках.

### 2.2 Цвета — Light Theme

```
cream:       #FAF7F2   (фон страницы)
ink:         #1A1612   (основной текст)
inkSoft:     #6B6460   (вторичный текст)
inkFaint:    #C2BDB8   (плейсхолдеры, disabled)
blush:       #E8C4B0   (акцентный тёплый розовый)
blushLight:  #F5EBE4   (hover overlay кнопок)
sage:        #8FAF8A   (secondary green)
sageLight:   #EAF0E9
accent:      #C4703F   (основной акцент — терракот)
accentLight: #F2E6DC
white:       #FFFFFF
border:      #EDE8E2
borderLight: #E0D8D0
onAccent:    #FFFFFF
hoverOverlay: rgba(0,0,0,0.06)
```

### 2.3 Цвета — Dark Theme (Warm Mocha)

```
cream:       #2B241F   (фон страницы)
ink:         #F0EAE3   (основной текст)
inkSoft:     #B8A896
inkFaint:    #8a8278
blush:       rgba(216,149,107,0.28)
blushLight:  rgba(216,149,107,0.12)
sage:        #8FAF8A
sageLight:   rgba(143,175,138,0.18)
accent:      #D8956B   (акцент в тёмной теме)
accentLight: rgba(216,149,107,0.15)
white:       #3A3028   (surface / paper)
border:      #4A423A
borderLight: #5a5348
onAccent:    #1a0e09
hoverOverlay: rgba(255,255,255,0.08)
```

### 2.4 Dashboard Palette (отдельный набор для панели владельца)

**Dark:**
```
page:        #171310   (тёмный фон дашборда)
sidebar:     #3A3028
card:        #252119
cardAlt:     #2B2720
dialog:      #1F1B17
border:      #38322C
borderLight: #4d4640
borderFocus: #7A6655
control:     #2B2720   (фон кнопок-переключателей)
controlHover:#332e28
input:       #252119
grid:        #38322C
gridHeader:  #252119
timeColumn:  #1F1B17
cell:        #2B2720
cellAlt:     #1F1B17
text:        #EDE7DF
muted:       #A89280
mutedDark:   #6C5E52
accent:      #C8855A
accentDark:  #b5714a
onAccent:    #1a0e09
--- статус-цвета ---
red:    #E06060
green:  #6BCB77
yellow: #FFD93D
blue:   #4ECDC4
purple: #B088F9
pink:   #FF8FAB
```

**Light:**
```
page:        #FAF7F2
sidebar:     #F2ECE5
card:        #FFFFFF
cardAlt:     #F5EFE8
dialog:      #FFFFFF
border:      #E0D8D0
borderFocus: #C4703F
control:     #EFE7DE
input:       #FFFFFF
grid:        #E5DDD3
gridHeader:  #F2ECE5
timeColumn:  #F7F2EC
cell:        #FFFFFF
cellAlt:     #F5EFE8
text:        #1A1612
muted:       #6B6460
accent:      #C4703F
accentDark:  #AB5F34
onAccent:    #FFFFFF
red:    #C74B4B
green:  #3F9A52
yellow: #A27C12
blue:   #2F91A5
purple: #7D5CC1
pink:   #B85684
```

### 2.5 Компоненты MUI (глобальные переопределения)

- **borderRadius:** 16px (карточки), 100px (кнопки и чипы), 6px (мелкие кнопки в дашборде)
- **MuiCard:** `boxShadow: none`, `border: 1px solid border`, hover → `translateY(-2px)` + тень
- **MuiButton:** `textTransform: none`, `boxShadow: none`, `containedPrimary` использует `ink` в светлой теме и `accent` в тёмной
- **MuiChip:** `borderRadius: 100`
- **MuiOutlinedInput:** рамка `borderLight`

---

## 3. Календарь (DashboardCalendar)

### 3.1 Архитектура

Компонент `DashboardCalendar` — центральная часть дашборда. Три режима отображения:

| Режим | Компонент | Описание |
|---|---|---|
| `week` | `CalendarWeekGrid` | 7 колонок (пн–вс), таймлайн 08:00–21:00, DnD |
| `day` | `CalendarDayStaffGrid` | Колонки по мастерам + «Без мастера», таймлайн, DnD |
| `month` | `CalendarMonthGrid` | 6×7 матрица, точки событий, клик → день |

### 3.2 Таймлайн — константы

```
CALENDAR_HOUR_START = 8   (08:00)
CALENDAR_HOUR_END   = 21  (21:00 включительно → 22:00 нижняя граница)
CALENDAR_HOUR_HEIGHT_PX = 48   (высота одного часа)
CALENDAR_PX_PER_MINUTE  = 48/60 ≈ 0.8
Полная высота = 14 * 48 = 672 px
Минимальная высота события = 20 px
Шаг слота (slot duration) = 15 мин (конфигурируется через API salonSchedule)
```

### 3.3 Статусы записей

| Статус | Метка (RU) | Цвет (dark) | Цвет (light) |
|---|---|---|---|
| `confirmed` / `completed` | Подтверждена / Завершена | `#6BCB77` green | `#3F9A52` |
| `pending` | Ожидает | `#FFD93D` yellow | `#A27C12` |
| `cancelled_*`, `no_show` | Отменена / No-show | `#E06060` red | `#C74B4B` |
| прочее | Прочее | `accent` | `accent` |

### 3.4 Действия и взаимодействия

- **Клик по пустой ячейке** → диалог «Новая запись» (выбор услуги, мастера, времени, имя, телефон гостя)
- **Клик по событию** → детальный диалог (аватар клиента, имя, телефон, услуга, мастер, время, длительность, заметка, кнопки смены статуса)
- **Drag & Drop** → `updateDashboardAppointment` (startsAt, endsAt, salonMasterId)
- **Переключение режима** → ToggleButtonGroup (Неделя / День / Месяц)
- **Навигация** → кнопки ‹ / ›, «Сегодня»
- **Фильтры** → Select «Мастер» + Select «Услуга»
- **Клик на заголовок дня** (week) → переход в режим «День»
- **Клик по дню** (month) → переход в режим «День»

### 3.5 Дневной вид (Day mode) — колонки по мастерам

Колонки формируются из `staffListItems` (активные мастера):
- Если мастеров нет → одна колонка «Записи» (`__ALL__`)
- Если есть неназначенные записи → добавляется колонка «Без мастера» (`__none__`)
- Каждый мастер имеет `color` (hex) для цветной шапки и аватара

Каждая мастер-колонка показывает:
- **Серый оверлей** — время «не работает» (до `opensMins` и после `closesMins`)
- **Полосатый блок** — перерыв (`breakStartsAt` / `breakEndsAt`)
- **Красная линия** текущего времени (только сегодня)

### 3.6 Раскладка событий (layout algorithm)

`layoutTimelineEventsForDay`:
1. Обрезать события по видимой сетке (08:00–22:00)
2. Найти связные компоненты пересекающихся интервалов
3. Жадно назначить каждому событию колонку (greedy interval coloring)
4. `widthPct = 100 / maxCols`, `leftPct = col * widthPct`
5. Минимальная высота события 20 px

### 3.7 Типы данных

```typescript
interface DashboardAppointment {
  id: string
  startsAt: string       // ISO 8601
  endsAt: string
  status: string
  serviceName: string    // может быть "Стрижка, Укладка" (несколько услуг)
  staffName?: string | null
  clientLabel: string    // имя или "Гость"
  clientPhone?: string | null
  guestName?: string | null
  guestPhone?: string | null
  clientUserId?: string | null
  serviceId: string
  salonMasterId?: string | null
  clientNote?: string | null
}

interface DashboardStaffRow {
  id: string
  salonId: string
  displayName: string
  isActive: boolean
  color?: string | null  // hex для цветной метки мастера
}

interface StaffScheduleInfo {
  opensMins: number      // минуты от полуночи
  closesMins: number
  isOff: boolean
  breakStartsAt?: string | null  // "HH:MM"
  breakEndsAt?: string | null
}
```

### 3.8 Легенда (снизу календаря)

```
● Подтверждена  #6bcb77
● Ожидает       #ffd93d
● Прочее        accent
● Отмена/No-show #ff6b6b
```

### 3.9 Локализация

Все подписи на **русском языке**. Даты через `toLocaleDateString('ru-RU', ...)`.
Формат заголовков: «Неделя 14–18 апреля 2026», «понедельник, 14 апреля 2026», «апрель 2026».

---

## 4. Дашборд в целом

### Разделы (sidebar навигация)

| Раздел | Компонент |
|---|---|
| Обзор | DashboardOverview (stats + быстрые действия) |
| Календарь | DashboardCalendar |
| Записи | DashboardAppointments (таблица) |
| Мастера | DashboardStaff |
| Услуги | DashboardServices |
| Расписание | DashboardSchedule (рабочие часы по дням недели) |
| Профиль | DashboardProfile |

### Stats (DashboardOverview)

```typescript
interface DashboardStats {
  appointmentsToday: number
  appointmentsTodayConfirmed: number
  newAppointmentsWeek: number
  newAppointmentsPrevWeek: number
  weekChangePct: number
  loadPct: number         // загрузка % (0–100)
  rating: number          // 0–5.0
  reviewCount: number
  pendingCount: number    // ожидают подтверждения
}
```

---

## 5. Ключевые UI-паттерны

- **Без теней на карточках в покое** — тень только при hover
- **Warm Mocha dark mode** — тёмный дашборд по умолчанию; светлый через ThemeModeProvider
- **Диалоги** используют `d.dialog` как фон (темнее основного page)
- **Control кнопки** (навигация, переключатели) — `d.control` фон, `d.muted` текст; активный — `d.accent`
- **Avatar инициалы** клиента: первые 2 буквы имени + цвет мастера как рамка/фон
- **Мелкие кнопки** (mockBtnSx): `borderRadius: 6px`, `fontSize: 12px`, минималистичные
- **Responsive:** `useMediaQuery('(max-width:600px)')` → уже timeColWidth (40px vs 56px)
