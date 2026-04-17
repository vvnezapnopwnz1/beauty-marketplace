# ТЗ: Bento Grid Redesign — SearchPage

> Задача для агента-разработчика. Весь контекст собран и изложен ниже.

---

## 0. Общий контекст

Проект: beauty-маркетплейс Beautica (React + Vite frontend, Go backend).
Стек фронтенда: React, Redux Toolkit, Vite, TypeScript.
Живой сайт: `http://localhost:5173/`
Главная страница поиска: `SearchPage.tsx` (`frontend/src/pages/search/ui/SearchPage.tsx`)

Сейчас SearchPage показывает:
- Hero-секция (заголовок + поиск) — занимает 60% viewport
- Категории (chip-фильтры)
- Фильтры (FilterRow)
- Карточки в 3 колонки (SearchResultCard) — слева
- Карта (MapSidebar) — справа, ~1/3 ширины
- Баннер «Скидка 20%» (PromoBanner)

---

## 1. Задача: три изменения

### Изменение A — Bento Grid с алгоритмом «featured»

Заменить текущий равномерный grid карточек на **bento-grid** с разноразмерными карточками.

#### Алгоритм «featured card»

Карточки приходят массивом `SearchResultItem[]` из `useSearch()`. Обрабатываем пачками по 5:

**Шаг 1 — Рассчитать score для каждой карточки в пачке из 5:**

```typescript
function calcScore(item: SearchResultItem): number {
  let score = 0;

  // Рейтинг (0–5) нормализованный → 0–30 баллов
  if (item.rating) score += (item.rating / 5) * 30;

  // Количество отзывов → 0–20 баллов (cap на 200)
  if (item.reviewCount) score += Math.min(item.reviewCount / 200, 1) * 20;

  // Онлайн-запись → +20 баллов
  if (item.onlineBooking) score += 20;

  // Есть фото (не заглушка) → +15 баллов
  if (item.photoUrl) score += 15;

  // Есть услуги с ценами → +15 баллов
  if (item.services && item.services.length > 0) score += 15;

  return score;
}
```

**Шаг 2 — В каждой пачке из 5 выбрать карточку с max score → она становится featured.**

**Шаг 3 — Паттерн чередования featured-размеров:**
- Пачка 1 (элементы 0–4): featured = **вертикальная** (занимает 2 строки, 1 колонку) — `grid-row: span 2`
- Пачка 2 (элементы 5–9): featured = **горизонтальная** (занимает 2 колонки, 1 строку) — `grid-column: span 2`
- Пачка 3: снова вертикальная
- И т.д. (чередование)

**Шаг 4 — Позиция featured внутри пачки:**
- Featured карточка всегда ставится **первой** в своей пачке (позиция 0)
- Остальные 4 карточки заполняют оставшееся пространство
- CSS Grid сам распределит за счёт `grid-auto-flow: dense`

#### CSS Grid спецификация

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  grid-auto-flow: dense;
}

.card { /* обычная карточка */ }

.card.featured-vertical {
  grid-row: span 2;
}

.card.featured-horizontal {
  grid-column: span 2;
}
```

#### Дизайн featured-карточки vs обычной

**Обычная карточка:**
- Высота: ~280px
- Фото/градиент-заглушка: 60% высоты
- Под ней: название, адрес, рейтинг, расстояние
- Тег «2ГИС» или «Онлайн-запись»
- Hover: `transform: translateY(-4px)`, `box-shadow` усиливается

**Featured вертикальная (2 строки):**
- Высота: ~580px (2 × 280 + gap)
- Фото/градиент: 65% высоты
- Больше места для инфы: название крупнее (20px вместо 16px), показать 2–3 услуги с ценами
- Бейдж «Свободно сейчас» (если availableToday) — glassmorphism: `backdrop-filter: blur(8px)`, полупрозрачный фон с зелёной точкой
- Кнопка «Записаться» внизу карточки (если onlineBooking)

**Featured горизонтальная (2 колонки):**
- Ширина: 2 колонки
- Высота: ~280px
- Layout внутри: фото слева (40% ширины), инфо справа (60% ширины)
- Внутри правой части: название крупнее, рейтинг, 2–3 услуги с ценами, кнопка «Записаться»

---

### Изменение B — Убрать карту, отцентровать контент

**Убрать:** компонент `MapSidebar` из основного лейаута SearchPage.

**Новый лейаут:**
```
[NavBar — полная ширина]
[Hero — компактный, max 35% viewport]
[Категории — по центру]
[Фильтры — по центру]
[Bento Grid — по центру, max-width: 1080px, с отступами по бокам]
```

Контент НЕ на всю ширину — справа и слева остаётся пространство (как у Airbnb на десктопе, когда карта скрыта). Используем `max-width: 1080px` + `margin: 0 auto`.

PromoBanner («Скидка 20%») — переместить **выше** bento grid, между фильтрами и карточками. Или убрать если мешает.

---

### Изменение C — Floating кнопка «На карте»

**Паттерн (референсы):**
- Airbnb: кнопка «Show map» внизу по центру, при клике — карта на весь контент
- CIAN: иконка карты над списком, переключает на полноэкранную карту
- Авито: переключатель «Список / Карта» вверху выдачи
- Booking.com: «Show on map» внизу по центру, pill-shaped

**Наша реализация — Airbnb-style floating pill:**

Компонент: `MapToggleButton`

```tsx
// Позиция: fixed, bottom: 24px, left: 50%, transform: translateX(-50%)
// Выглядит как pill: border-radius: 100px, padding: 12px 24px
// Содержит: иконку карты + текст «На карте»
// При активной карте: иконка списка + текст «Список»
// Z-index: выше карточек, ниже навбара (z-index: 50)
// Стиль: тёмный фон (#1C1C1E), белый текст, subtle shadow
// Hover: scale(1.05), shadow усиливается
// Transition: smooth, 0.2s ease
```

**Поведение при клике:**
1. Состояние `viewMode: 'list' | 'map'` — хранить в локальном state SearchPage (не Redux)
2. При `viewMode === 'map'`:
   - Bento grid **скрывается** (не удаляется из DOM — `display: none` или conditional render)
   - Вместо него рендерится `MapSidebar` на полную ширину контентной области (max-width: 1080px, height: 70vh)
   - Кнопка меняет текст: «На карте» → «Список»
   - Анимация перехода: fade или slide (CSS transition)
3. При возврате в `viewMode === 'list'`:
   - Карта скрывается, bento grid возвращается
   - Scroll position сохраняется (не сбрасывается наверх)

**Важно:** `MapSidebar` уже существует как компонент. Его не надо переписывать — только изменить где и когда он рендерится. Раньше он был всегда справа, теперь — по запросу через toggle, на полную ширину контента.

---

## 2. Файлы, которые нужно изменить

### Основные изменения:

| Файл | Что менять |
|------|-----------|
| `frontend/src/pages/search/ui/SearchPage.tsx` | Убрать MapSidebar из постоянного лейаута, добавить viewMode state, bento grid лейаут, MapToggleButton |
| `frontend/src/entities/search/ui/SearchResultCard.tsx` | Добавить prop `variant: 'normal' \| 'featured-vertical' \| 'featured-horizontal'`, адаптировать рендер |
| `frontend/src/pages/search/ui/MapSidebar.tsx` | Адаптировать для full-width отображения (убрать фиксированную ширину sidebar) |

### Новые файлы:

| Файл | Что создать |
|------|-----------|
| `frontend/src/pages/search/ui/MapToggleButton.tsx` | Floating pill-кнопка |
| `frontend/src/pages/search/lib/calcFeaturedScore.ts` | Функция calcScore + логика пачек по 5 |

### Файлы, которые НЕ трогать:

- Backend — никаких изменений. API `GET /api/v1/search` не меняется
- `searchSlice.ts` — не меняется (всё на уровне компонента)
- `CategoryFilter.tsx`, `FilterRow.tsx`, `SearchBar.tsx` — не меняются
- `NavBar.tsx` — не меняется

---

## 3. Данные, доступные в SearchResultItem

Из `frontend/src/shared/api/searchApi.ts`:

```typescript
interface SearchResultItem {
  externalId: string
  name: string
  address?: string
  lat: number
  lon: number
  photoUrl?: string | null
  rating?: number | null
  reviewCount?: number | null
  rubricNames?: string[]
  distanceKm: number
  category: string
  // enrichment из нашей БД
  salonId?: string
  onlineBooking: boolean
  services?: Array<{ id: string; name: string; durationMinutes: number; priceCents: number }>
}
```

Для score-алгоритма используются: `rating`, `reviewCount`, `onlineBooking`, `photoUrl`, `services`.

---

## 4. Визуальный стиль

Оставляем текущую палитру (кремовый фон `#FAF7F2`, коричневые акценты). НЕ переходим на тёмную тему — это отдельная задача. Фокус сейчас — **лейаут и карточки**.

Ключевые стилевые изменения:
- Карточки: `border-radius: 16px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.06)`, hover: `translateY(-4px)` + усиление тени
- Featured бейдж «Свободно»: `backdrop-filter: blur(8px)`, `background: rgba(143,175,138,0.2)`, `border: 1px solid rgba(143,175,138,0.3)`, пульсирующая зелёная точка (CSS animation)
- MapToggleButton: тёмный pill (`#1A1612`), белый текст, `box-shadow: 0 4px 16px rgba(0,0,0,0.2)`, hover: `scale(1.05)`

---

## 5. Порядок реализации (рекомендуемый)

1. **calcFeaturedScore.ts** — утилита, чистая логика, без UI
2. **SearchResultCard.tsx** — добавить variants (featured-vertical, featured-horizontal)
3. **SearchPage.tsx** — новый grid лейаут, убрать MapSidebar из постоянного рендера, добавить viewMode
4. **MapToggleButton.tsx** — floating pill
5. **MapSidebar.tsx** — адаптировать для full-width режима
6. **Тестирование** — проверить на localhost:5173 с реальными данными 2GIS

---

## 6. Референсы для FAB-кнопки «На карте»

| Сайт | Реализация | Ссылка |
|------|-----------|--------|
| **Airbnb** | Pill-кнопка внизу по центру: «Show map» / «Show list». При клике — карта на весь контент. Чёрный pill, белый текст, иконка карты | airbnb.com |
| **Booking.com** | Кнопка «Show on map» под фильтрами. При клике — full-screen overlay с картой | booking.com |
| **CIAN** | Переключатель «Список / Карта» в верхней панели фильтров. Карта на полный контент | cian.ru |
| **Авито** | Иконка карты в панели над листингом. Переключает view mode | avito.ru |
| **Fresha** | Кнопка «Hide map» / «Show map» рядом с фильтрами. Split-screen toggle | fresha.com |
| **Google Maps** (мобилка) | FAB с иконкой «list view» когда открыта карта | maps.google.com |

**Наш выбор — Airbnb-style:** floating pill внизу по центру. Причины:
- Всегда видна, не теряется при скролле
- Не конфликтует с фильтрами наверху
- Mobile-friendly (в зоне досягаемости большого пальца)
- Визуально чистый, не загромождает интерфейс

---

## 7. Edge cases

- **Менее 5 карточек:** если в пачке < 5 элементов, featured всё равно выбирается (max score среди тех что есть). Если 1 карточка — она featured.
- **Все score одинаковы:** featured = первый элемент в пачке.
- **Infinite scroll:** при загрузке новых карточек, они добавляются к существующим. Новая пачка = следующие 5 непроцессированных. Паттерн чередования (вертикальный/горизонтальный) продолжается.
- **MapSidebar в map-mode:** должен получать те же данные (список SearchResultItem[]) для показа маркеров. Координаты есть в каждом item (lat, lon).
- **Resize / responsive:** на экранах < 768px grid переходит в 1 колонку, featured-horizontal = обычная (нет span 2). Featured-vertical = высокая карточка. MapToggleButton остаётся внизу по центру.

---

## 8. Acceptance criteria

- [ ] Карточки отображаются bento-grid: 3 колонки, featured-карточки чередуются (вертикальная / горизонтальная)
- [ ] Featured определяется score-алгоритмом, не рандомно
- [ ] Карта убрана из постоянного отображения
- [ ] Контент отцентрован с max-width ~1080px
- [ ] Floating pill-кнопка «На карте» внизу по центру
- [ ] Клик по кнопке переключает между bento grid и картой
- [ ] Карта в map-mode занимает полную ширину контента, показывает маркеры салонов
- [ ] Hover-эффекты на карточках (translateY + shadow)
- [ ] Featured-карточки показывают больше информации (услуги, цены, кнопка «Записаться»)
- [ ] Responsive: на мобилке grid → 1 колонка, featured = обычная высокая карточка
