# Задача: Этап 3 — Публичная страница мастера + мастера на SalonPage

## Контекст

Монорепо `beauty-marketplace`. После Этапов 1–2:
- В БД: `master_profiles`, `salon_masters` (с `status`, `master_id`), `salon_master_services`, `salon_master_hours`
- Бэкенд отдаёт `GET /api/v1/dashboard/salon-masters` с вложенным `masterProfile` и `services`
- `SalonPage.tsx` — мастера сейчас статический mock-контент (TODO в коде)

Читай `AGENTS.md` и `CLAUDE.md`. После изменений: `go build ./...` + `go test ./...` + `npm run lint` + `npm run build`.

---

## Цели этапа

1. **Бэкенд**: два новых публичных эндпоинта (без авторизации).
2. **Фронт**: новая страница `/master/:masterId` — публичный профиль мастера.
3. **Фронт**: убрать mock-мастеров из `SalonPage`, заменить на реальные данные.

---

## Бэкенд

### Эндпоинт 1: GET /api/v1/salons/:salonId/masters

Публичный (без JWT). Возвращает список активных мастеров салона.

Запрос: JOIN `salon_masters` → `master_profiles`, только `status = 'active'` и `is_active = true`.

Ответ:
```json
[
  {
    "id": "salon_master UUID",
    "displayName": "Анна",
    "color": "#D8956B",
    "masterProfile": {
      "id": "master_profile UUID",
      "bio": "Колорист с 7-летним стажем",
      "specializations": ["colorist", "haircut"],
      "avatarUrl": null,
      "yearsExperience": 7,
      "cachedRating": 4.8,
      "cachedReviewCount": 23
    },
    "services": [
      {
        "serviceId": "uuid",
        "serviceName": "Окрашивание",
        "durationMinutes": 120,
        "priceCents": 600000,
        "priceOverrideCents": null
      }
    ]
  }
]
```

Эффективная цена = `priceOverrideCents ?? priceCents` (считать на бэкенде, отдавать как `effectivePriceCents`).

Зарегистрировать в `SalonController` (уже есть файл `salon_controller.go`), добавить маршрут в `SalonRoutes`.

### Эндпоинт 2: GET /api/v1/masters/:masterProfileId

Публичный (без JWT). Профиль мастера + все его активные членства.

Ответ:
```json
{
  "id": "master_profile UUID",
  "displayName": "Анна",
  "bio": "...",
  "specializations": ["colorist"],
  "avatarUrl": null,
  "yearsExperience": 7,
  "cachedRating": 4.8,
  "cachedReviewCount": 23,
  "salons": [
    {
      "salonMasterId": "uuid",
      "salonId": "uuid",
      "salonName": "Студия Аврора",
      "salonAddress": "ул. Тверская, 12",
      "displayNameInSalon": "Анна К.",
      "services": ["Окрашивание", "Стрижка"],
      "joinedAt": "2024-03-01T00:00:00Z"
    }
  ]
}
```

Только `status = 'active'` членства. JOIN: `master_profiles` → `salon_masters` → `salons` → `salon_master_services` → `services`.

Добавить новый файл `master_controller.go` (или в `salon_controller.go` если удобнее), зарегистрировать в `server.go`.

---

## Фронтенд

### 1. Новый API-файл или дополнение к salonApi.ts

Добавить в `frontend/src/shared/api/salonApi.ts` (или отдельный `masterApi.ts`):

```ts
// GET /api/v1/salons/:salonId/masters
fetchSalonMasters(salonId: string): Promise<SalonMasterPublic[]>

// GET /api/v1/masters/:masterProfileId
fetchMasterProfile(masterProfileId: string): Promise<MasterProfilePublic>
```

Типы `SalonMasterPublic` и `MasterProfilePublic` — по структуре ответов выше.

### 2. Страница /master/:masterProfileId

Новый файл: `frontend/src/pages/master/ui/MasterPage.tsx`.
Роут добавить в `App.tsx`: `/master/:masterProfileId`.

**Структура страницы** (без излишеств, читаемо):

**Шапка:**
- Аватар (круглый, инициалы если нет фото) с цветом из `salon_masters.color` первого активного салона
- Имя мастера (крупно)
- Chips специализаций
- Рейтинг (звёзды + число отзывов) — если `cachedReviewCount > 0`
- Bio (если заполнен)
- Стаж («X лет опыта» если `yearsExperience` не null)

**Секция «Работает в»:**
Карточки салонов где активен (из `salons[]`). Каждая карточка: название, адрес, список услуг которые он там выполняет (из `services[]`). Кнопка «Записаться» → `/salon/:salonId` (пока просто редирект на страницу салона, без предзаполнения).

**Loading/error state:** скелетон и сообщение об ошибке.

Стилизация: использовать `useDashboardPalette()` не нужно — это публичная страница, использовать стандартную тему MUI как на `SalonPage`.

### 3. Убрать mock-мастеров из SalonPage

Файл: `frontend/src/pages/salon/ui/SalonPage.tsx`.

Найти секцию с mock-мастерами (помечена комментарием `Static mock content` или аналогичным). Заменить:

1. При загрузке данных салона — дополнительно вызвать `fetchSalonMasters(salonId)`.
2. Показать список мастеров: аватар (инициалы + цвет), имя, специализации chips, услуги в этом салоне.
3. Клик на карточку мастера → `/master/:masterProfileId` (если `masterProfile.id` есть; иначе карточка не кликабельна — теневой мастер без публичного профиля).
4. Если список мастеров пустой — не показывать секцию совсем (не показывать заглушку «мастеров нет»).
5. Если `salonId` не UUID (place из 2GIS без нашей записи) — `fetchSalonMasters` не вызывать, секцию мастеров не показывать.

Определить UUID: `const isOurSalon = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(salonId)`.

---

## Stop-list

- ❌ Не делать кабинет мастера (авторизованные эндпоинты для самого мастера) — Этап 4
- ❌ Не делать claiming профиля (matching по телефону при регистрации) — Этап 4
- ❌ Не делать принятие/отклонение инвайтов — Этап 4
- ❌ Не трогать mock-отзывы и mock-фото в SalonPage — только секция мастеров
- ❌ Не добавлять страницу `/master/:id` в NavBar — пока только прямая ссылка с SalonPage

---

## Результат

- `GET /api/v1/salons/:id/masters` — работает публично, возвращает реальных мастеров.
- `GET /api/v1/masters/:id` — работает публично, возвращает профиль + салоны.
- `/master/:masterProfileId` — страница открывается, показывает профиль и салоны мастера.
- `SalonPage` — секция мастеров показывает реальные данные; клик → `/master/:id`.
- `go build ./...` OK, `go test ./...` OK, `npm run build` OK.
