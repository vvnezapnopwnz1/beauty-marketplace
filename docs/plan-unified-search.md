# Plan: Unified Search — 2GIS как первичный источник

## Context

Сейчас главный экран работает в двух режимах: по умолчанию показывает салоны из нашей БД, после ввода текста — результаты 2GIS. Это неудачно для MVP с почти пустой БД: пользователь видит 1-2 тестовых записи вместо реального контента.

Цель: переключиться на **«2GIS-first» модель** — всегда запрашивать 2GIS для листинга. Наша БД становится **слоем обогащения**: показывает кнопку «Записаться», услуги и цены только для тех салонов, с которыми уже было взаимодействие через платформу (владелец создал аккаунт, есть записи, есть отзывы).

Проблема рубрик: 2GIS возвращает `rubricNames: ["Парикмахерская", "Маникюр"]` вместо наших `CategoryId`. Нужно двустороннее маппирование:
- CategoryId → поисковый запрос к 2GIS (outbound)
- rubricName → CategoryId (inbound, для категоризации результата)

Изменение **средней сложности**: почти вся тяжёлая работа (CatalogAdapter, PlacesService, salon_external_ids, useGeolocation) уже существует.

---

## Backend

### 1. Новый файл `internal/model/search.go`

```go
type SearchResultItem struct {
    // От 2GIS — всегда заполнено
    ExternalID  string   `json:"externalId"`
    Name        string   `json:"name"`
    Address     string   `json:"address,omitempty"`
    Lat         float64  `json:"lat"`
    Lon         float64  `json:"lon"`
    PhotoURL    *string  `json:"photoUrl,omitempty"`
    Rating      *float64 `json:"rating,omitempty"`
    ReviewCount *int     `json:"reviewCount,omitempty"`
    RubricNames []string `json:"rubricNames,omitempty"`
    DistanceKm  float64  `json:"distanceKm"`  // 0 если нет гео-данных
    Category    string   `json:"category"`    // определяется по rubricNames

    // Обогащение из нашей БД — заполняется только при совпадении по externalId
    SalonID       *string      `json:"salonId,omitempty"`
    OnlineBooking bool         `json:"onlineBooking"`
    Services      []ServiceDTO `json:"services,omitempty"`
}

type SearchResult struct {
    Items []SearchResultItem `json:"items"`
    Total int                `json:"total"`
}

type SearchInput struct {
    Lat        *float64
    Lon        *float64
    Category   string  // наш CategoryId; "" или "all" = без фильтра
    OnlineOnly bool    // true = enriched с onlineBooking=true поднимаются наверх (не фильтрует)
    Page       int
    PageSize   int
}
```

### 2. Новый файл `internal/service/search.go`

**Маппинг CategoryId → запрос к 2GIS:**
```go
var categoryQuery = map[string]string{
    "all":          "салон красоты",
    "hair":         "парикмахерская",
    "nails":        "маникюр педикюр",
    "spa":          "спа салон",
    "barber":       "барбершоп",
    "brows":        "брови ресницы",
    "makeup":       "макияж визажист",
    "massage":      "массаж",
    "skin":         "косметология",
    "hair_removal": "эпиляция",
}
```

**Маппинг rubricName → CategoryId** (первое совпадение из rubricNames побеждает):
```go
var rubricCategory = map[string]string{
    "Парикмахерская": "hair",   "Салон красоты": "hair",   "Стрижка": "hair",
    "Барбершоп": "barber",       "Мужская стрижка": "barber",
    "Маникюр": "nails",          "Педикюр": "nails",       "Ногтевой сервис": "nails",
    "СПА": "spa",                "Спа-салон": "spa",        "Баня": "spa",
    "Брови": "brows",            "Оформление бровей": "brows", "Ламинирование ресниц": "brows",
    "Макияж": "makeup",          "Визажист": "makeup",     "Перманентный макияж": "makeup",
    "Массаж": "massage",         "Массажный салон": "massage",
    "Косметология": "skin",      "Уход за лицом": "skin",
    "Эпиляция": "hair_removal",  "Лазерная эпиляция": "hair_removal",
}
```

**Логика `SearchService.Search(ctx, input)`:**
1. Подставить дефолт лат/лон Москвы если не переданы
2. `q = categoryQuery[input.Category]`
3. Вызвать `PlacesService.SearchNearby(q, lat, lon, radius, pageSize)` — **переиспользуем as-is**
4. Собрать `[]string` всех `externalId` из результата
5. Batch-запрос в БД: `SalonRepository.FindByExternalIDs("2gis", ids)` → `map[externalId]Salon`
6. Batch-запрос услуг: `SalonRepository.FindServicesBySalonIDs(salonUUIDs)` → `map[UUID][]ServiceLine`
7. Для каждого `PlaceItem` собрать `SearchResultItem`:
   - Вычислить `distanceKm` через Haversine (переиспользовать функцию из `service/salon.go`)
   - Назначить `Category` через `rubricCategory`
   - Если найден в map[externalId]: заполнить `SalonID`, `OnlineBooking`, `Services`
8. Вернуть `SearchResult{Items, Total}` — сортировка и `onlineOnly` обрабатываются на фронте

### 3. Добавить 2 метода в `internal/repository/salon.go`

```go
FindByExternalIDs(ctx context.Context, source string, ids []string) ([]Salon, error)
FindServicesBySalonIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]ServiceLine, error)
```

### 4. Реализовать в `internal/infrastructure/persistence/salon_repository.go`

```go
// FindByExternalIDs — batch JOIN
func (r *salonRepository) FindByExternalIDs(ctx context.Context, source string, ids []string) ([]appmodel.Salon, error) {
    var rows []dbmodel.Salon
    err := r.db.WithContext(ctx).
        Joins("JOIN salon_external_ids sei ON sei.salon_id = salons.id AND sei.source = ? AND sei.external_id IN ?", source, ids).
        Preload("ExternalIDs").
        Find(&rows).Error
    // ...
}

// FindServicesBySalonIDs — группировать по salon_id
func (r *salonRepository) FindServicesBySalonIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID][]appmodel.ServiceLine, error) {
    var rows []dbmodel.SalonService
    err := r.db.WithContext(ctx).
        Where("salon_id IN ? AND is_active = true", ids).
        Order("sort_order ASC").Find(&rows).Error
    // группировка в map[uuid.UUID][]ServiceLine
}
```

### 5. Новый `internal/controller/search_controller.go`

Тонкий handler `GET /api/v1/search`, парсит query-params (lat, lon, category, page, page_size), вызывает `SearchService.Search`, возвращает JSON. Паттерн идентичен `places_controller.go`.

### 6. Правки в `internal/controller/server.go`

```go
mux.HandleFunc("GET /api/v1/search", sch.Search)
```

Добавить `sch *SearchController` в параметры `NewHTTPServer`.

### 7. Правки в `internal/app/app.go`

```go
service.NewSearchService,
controller.NewSearchController,
```

---

## Frontend

### 1. Новый `src/shared/api/searchApi.ts`

```ts
export interface SearchResultItem {
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
    // обогащение
    salonId?: string
    onlineBooking: boolean
    services?: Array<{ id: string; name: string; durationMinutes: number; priceCents: number }>
}

export interface SearchResult { items: SearchResultItem[]; total: number }

// hook, аналог usePlacesSearch:
// - state: { data: SearchResult | null, isFetching: bool }
// - search(params): вызывает GET /api/v1/search с query-params
// - параметры: lat, lon, category, page_size
export function useSearch() { ... }
```

### 2. Новый `src/entities/search/ui/SearchResultCard.tsx`

Гибридная карточка — единственный компонент для листинга. Принимает `SearchResultItem`.

- **Если `salonId` присутствует** (enriched): кнопка «Записаться онлайн», теги услуг, цена — навигация на `/salon/:salonId`
- **Если нет** (plain 2GIS): бейдж «2ГИС», без кнопки бронирования — навигация на `/place/:externalId`
- В обоих случаях: фото/эмодзи, название, адрес, рейтинг, `distanceKm` (форматируется как «350 м» / «1.2 км», скрыт при 0)
- Переиспользовать `CARD_GRADIENTS` из `@entities/salon` для фолбека

### 3. Правки в `src/pages/search/ui/SearchPage.tsx`

- Убрать `fetchSalons` + его `useEffect`
- Убрать `selectSalons`, `selectSalonsLoading`, `setSalons`, `setSalonsLoading`
- Добавить `const { data: searchResult, isFetching, search } = useSearch()`
- `useEffect([geoReady, category])` → вызывает `search({ lat, lon, category })`
- Перед рендером: если `onlineOnly=true` — сортировать `items` так, чтобы `onlineBooking=true` шли первыми (остальные остаются, не скрываются)
- Рендерить `<SearchResultCard>` вместо двух веток `<SalonCard>` / `<PlaceCard>`
- `showPlaces` ветку (2GIS text search через SearchBar) **оставить как есть** — текстовый поиск остаётся отдельным режимом поверх

### 4. Правки в `src/features/search-salons/model/searchSlice.ts`

Удалить: `salons: Salon[]`, `salonsLoading: boolean`, `setSalons`, `setSalonsLoading` и их селекторы. Остальное (`query`, `category`, `onlyAvailableToday`, `onlineOnly`, `sortBy`) не трогать.

### 5. `MapSidebar` — адаптировать

Сейчас принимает `Salon[]`. После изменения нужно принимать `SearchResultItem[]` (или оставить только первые N с координатами). Изменение минимальное — у `SearchResultItem` есть `lat/lon`.

---

## Что переиспользуется без изменений

| Компонент | Файл |
|---|---|
| `CatalogAdapter` | `infrastructure/twogis/catalog_adapter.go` |
| `PlacesService` | `service/places.go` |
| `haversineKm` | Перенести из `service/salon.go` в `service/geo.go` (shared util) |
| `useGeolocation` | `shared/hooks/useGeolocation.ts` |
| `PlaceCard` | Остаётся для text-search режима |
| `SalonCard` | Остаётся для страницы `/salon/:id` |
| `salon_external_ids` таблица | Ключ join'а |
| `CategoryFilter` + dispatch | Не меняется |
| `FilterRow` + `onlineOnly` chip | Не меняется |

---

## Проверка

1. **Backend unit**: `go build ./...` — нет ошибок компиляции
2. **API вручную**:
   ```bash
   # Без гео — Москва по умолчанию, категория ноготки
   curl "http://localhost:8080/api/v1/search?category=nails&page_size=5"
   # С гео
   curl "http://localhost:8080/api/v1/search?category=hair&lat=55.7558&lon=37.6176&page_size=10"
   ```
   Ожидание: массив `SearchResultItem[]`, у 2GIS-результатов `salonId=null`, у обогащённых — UUID
3. **Frontend**: открыть `localhost:5173`, дать/запретить гео, переключать категории — карточки обновляются
4. **Rubric mapping**: в DevTools проверить, что у карточек поле `category` != "all" (соответствует rubricNames)
5. **Онлайн-запись**: включить фильтр — обогащённые карточки поднимаются наверх
6. **Расстояние**: при разрешённой гео у каждой карточки отображается «X м» / «X.X км»

---

## Открытый вопрос к реализации

Рубрик в 2GIS сотни — таблица выше покрывает основные, но при реальных данных могут появиться неизвестные рубрики. Стратегия: fallback = `"all"`. Со временем таблицу можно пополнять по логам (неизвестные рубрики → log.Warn).
