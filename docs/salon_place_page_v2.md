# Plan: SalonPage — от моков к данным, режимы `salon` + `place`

## Context

Сейчас `SalonPage.tsx` — это экран с очень тонким слоем реальных данных (имя, адрес, услуги, рейтинг, мастера) и толстым слоем захардкоженного контента (расписание, контакты, отзывы, акции, фото, описание, удобства). При этом у страницы уже существуют **два входа** через один и тот же компонент:

- `/salon/:uuid` — есть наш салон в БД (владелец подключил/создал профиль).
- `/place/:externalId` — салон найден только в 2GIS, в БД его у нас нет.

Связка «наш или не наш» уже работает: `SearchService` на бэке джойнит результаты 2GIS по `salon_external_ids` и проставляет `salonId` в `SearchResultItem`, [`SearchResultCard`](frontend/src/entities/search/ui/SearchResultCard.tsx#L184-L185) маршрутизирует между `/salon/:id` и `/place/:externalId`.

**Цель** — сделать один экран с двумя режимами, где:

- `place`-режим — полноценная витрина на данных 2GIS (расписание, контакты, фото, описание — всё это уже лежит в `PlaceDetail`, просто не маппится), без нашей функциональности: вместо кнопки записи — телефон и баннер «Вы владелец?».
- `salon`-режим — то же самое + наш слой: `working_hours`, услуги с id (запись), мастера, описание/контакты салона, онлайн-бронь.
- Данные, которых у нас ещё нет (отзывы, акции, фотогалерея) — явные заглушки за фичефлагом, не литералы в коде.

Дополнительно закрываем слепое пятно: если пользователь пришёл на `/place/:externalId`, а салон у нас уже подключён, страница должна это увидеть и показать salon-режим (редирект на `/salon/:uuid`).

## Архитектура: один view-model, два источника

На фронте вводится единый `SalonView` с полями, которые рендер знает одинаково:

```ts
type WorkingHourRow = {
  dayOfWeek: number        // 0=пн..6=вс
  opensAt: string          // 'HH:MM'
  closesAt: string         // 'HH:MM'
  isClosed: boolean
  breakStartsAt?: string   // 'HH:MM'
  breakEndsAt?: string     // 'HH:MM'
}

type SalonContactRow = {
  type: 'phone' | 'email' | 'website' | 'vk' | 'instagram'
  value: string
  label?: string
}

type SalonView = {
  mode: 'salon' | 'place'
  salonId?: string             // наш UUID (только в salon)
  externalId?: string
  // base
  name: string
  address: string
  district?: string
  rating?: number
  reviewCount?: number
  photos: string[]
  description?: string
  badge?: string
  cardGradient?: string
  emoji?: string
  // structured
  services: Service[]          // в place-режиме []
  workingHours?: WorkingHourRow[]
  schedule247?: boolean
  scheduleComment?: string
  contactRows: SalonContactRow[]
  // capabilities
  canBookOnline: boolean        // salon.onlineBooking && services.length > 0
  hasOwner: boolean             // true в salon-режиме
}
```

Заполнение:

- `salon`-режим: `fetchSalonById` → `ApiSalon` + `workingHours[]` (новое поле DTO). В будущем можно мержить с 2GIS-фото/описанием если в БД пусто, но это вне скоупа этого плана.
- `place`-режим: `fetchPlaceByExternalId` → `PlaceDetail`, маппер достаёт `weeklySchedule → workingHours`, `contacts → contactRows`, `photoUrls → photos[]`, `description`.

Выбор режима делает `SalonPage` по URL + lookup: при входе по `/place/:externalId` параллельно с детальным запросом проверяем, не подключён ли этот external_id к нашему салону; если подключён — переключаемся в `salon`-режим (`navigate('/salon/:uuid', { replace: true })`).

## Скоуп

### Backend

1. **Расширить `SalonDTO`** ([backend/internal/model/salon.go](backend/internal/model/salon.go), маппер — [backend/internal/service/salon.go:36-105](backend/internal/service/salon.go)).
   - Добавить поля: `Description string`, `PhonePublic string`, `Timezone string`, `WorkingHours []WorkingHourDTO`, `Photos []string`.
   - Добавить тип `WorkingHourDTO` в `backend/internal/model/salon.go`:
     ```go
     type WorkingHourDTO struct {
         DayOfWeek    int     `json:"dayOfWeek"`
         OpensAt      string  `json:"opensAt"`
         ClosesAt     string  `json:"closesAt"`
         IsClosed     bool    `json:"isClosed"`
         BreakStartsAt *string `json:"breakStartsAt,omitempty"`
         BreakEndsAt   *string `json:"breakEndsAt,omitempty"`
     }
     ```
   - **Важно:** JSON shape `WorkingHourDTO` должен совпадать с тем, что дашборд уже отдаёт для working hours — переиспользуем тип, не создаём новый.

2. **Добавить `GetWorkingHours` в `SalonRepository`** — **только этот вариант, не инжектировать `DashboardRepository` в `SalonService`**:
   - Интерфейс: добавить `GetWorkingHours(ctx context.Context, salonID uuid.UUID) ([]model.WorkingHourDTO, error)` в `backend/internal/repository/salon.go`.
   - Реализация: в `backend/internal/infrastructure/persistence/salon_repository.go` — SQL-запрос к таблице `working_hours` по `salon_id`, маппинг в `WorkingHourDTO`. Переиспользовать логику из `DashboardRepository.ListWorkingHours` ([dashboard_repository.go:289-293](backend/internal/infrastructure/persistence/dashboard_repository.go#L289-L293)), но реализовать самостоятельно в `salon_repository.go`, не вызывать методы `DashboardRepository`.
   - Вызвать `GetWorkingHours` в `SalonService.GetByID` после загрузки салона, добавить результат в `SalonDTO`.

3. **Lookup салона по `(source, external_id)`** — новый публичный эндпоинт:
   - `GET /api/v1/salons/by-external?source=2gis&id=<externalId>` → `{salonId, onlineBooking}` или 404.
   - Регистрация: в `SalonController.SalonRoutes` ([backend/internal/controller/salon_controller.go](backend/internal/controller/salon_controller.go)).
   - Новый репо-метод `FindByExternalID(ctx context.Context, source, externalID string) (*Salon, error)` в интерфейсе `backend/internal/repository/salon.go`. Реализация в `backend/internal/infrastructure/persistence/salon_repository.go` рядом с `FindByExternalIDs` — реализовать через `SELECT ... FROM salon_external_ids WHERE source=$1 AND external_id=$2 LIMIT 1` с join на `salons`. **Не вызывать `FindByExternalIDs` с массивом из одного элемента** — написать отдельный метод с `LIMIT 1` для чистоты интерфейса.
   - Сервисный метод `SalonService.FindIDByExternal(ctx, source, externalID string) (*FindByExternalResult, error)` в `backend/internal/service/salon.go`, где `FindByExternalResult` — `{SalonID uuid.UUID, OnlineBooking bool}`.

### Frontend

4. **Фичефлаги — создать файл** `frontend/src/shared/config/featureFlags.ts`:
   ```ts
   export const FEATURE_FLAGS = {
     reviews: false,
     promos: false,
     photos: false,
   } as const
   ```
   Все условия видимости вкладок `ReviewsTab`, `PromosTab`, `PhotosTab` — через этот объект. Не хардкодить `false` напрямую в `SalonPage.tsx`.

5. **Переписать `placeDetailToSalon`** ([frontend/src/entities/place/lib/placeDetailToSalon.ts](frontend/src/entities/place/lib/placeDetailToSalon.ts)) — возвращать `SalonView` вместо текущего типа:
   - `weeklySchedule → workingHours`: 7 дней по `PlaceScheduleDay`. Для каждого дня: первый интервал из `WorkingHours[]` → `{opensAt, closesAt}`; если интервалов нет → `isClosed: true`. `Is247 === true` → `schedule247: true`, дни не раскладываем.
   - `photoUrls → photos[]`, первый элемент также в `photoUrl` как fallback.
   - `description`, `scheduleComment`, `schedule247` — пробросить напрямую.
   - `contacts → contactRows`: маппинг по `type` (phone, email, website), сохранить `label` если есть.
   - Убрать хардкод `category: 'hair'`, `businessType: 'venue'` — заменить на `undefined`, обработать на уровне рендера.
   - Установить `mode: 'place'`, `canBookOnline: false`, `hasOwner: false`, `services: []`.

6. **SalonPage.tsx** — добавить `mode` в стейт, разветвить `load()`:
   - При входе через `/place/:externalId`: запускать `Promise.all([fetchPlaceByExternalId(externalId), fetchSalonByExternal('2gis', externalId)])`. Если `fetchSalonByExternal` вернул `salonId` — `navigate('/salon/' + salonId, { replace: true })` **до** рендера данных. Если 404 (rejected или null) — продолжать с `place`-режимом.
   - Рендер: видимость вкладки «Мастера», блока `BookingSidebar`, мобильной кнопки записи и CTA в карточках услуг — через `view.mode === 'salon' && view.canBookOnline`.
   - В `place`-режиме: вместо `BookingSidebar` рендерить `SalonCallSidebar`, передавая первый `phone`-контакт из `view.contactRows`. Если phone-контакта нет — sidebar не рендерить вовсе. Мобильная кнопка внизу экрана — тоже «Позвонить» (`<a href="tel:...">`).

7. **OverviewTab** — убрать хардкод:
   - Расписание и контакты-литералы заменить на рендер из `view.workingHours` и `view.contactRows`.
   - Рендер расписания: каждая строка — день недели + часы или «Выходной» для `isClosed: true`. Если `schedule247 === true` — показать бейдж «Круглосуточно» вместо таблицы.
   - `isOpenNow`-вычисление перенести в утилиту `isOpenNow(workingHours: WorkingHourRow[], tz: string): boolean` — новый файл `frontend/src/entities/salon/lib/isOpenNow.ts`. Использовать `Intl.DateTimeFormat` для перевода текущего времени в нужную таймзону, не подключать сторонних библиотек.

8. **Моки-секции — удалить из кода**:
   - `ReviewsTab`, `PromosTab`, `PhotosTab` — скрыть из `TABS` через `FEATURE_FLAGS`. Сам код компонентов + литералы `REVIEWS`, `RATING_BREAKDOWN`, `PROMOS`, `PHOTO_GRADIENTS`, `PHOTO_LABELS` — удалить целиком из [SalonPage.tsx](frontend/src/pages/salon/ui/SalonPage.tsx).
   - Блок `AMENITIES` ([SalonPage.tsx:69](frontend/src/pages/salon/ui/SalonPage.tsx#L69)) — удалить из `OverviewTab` и из модуля (нет данных ни в `salon`, ни в `place`).

9. **Экстракт компонентов** — разместить в `frontend/src/entities/salon/ui/`:
   - `SalonScheduleList.tsx` — принимает `workingHours: WorkingHourRow[]`, `schedule247?: boolean`, `tz: string`. Рендерит список дней + статус «Открыто/Закрыто» через `isOpenNow`.
   - `SalonContactList.tsx` — принимает `contactRows: SalonContactRow[]`, рендерит иконку + ссылку для каждого типа.
   - `SalonCallSidebar.tsx` — принимает `phone?: string`. Кнопка «Позвонить» как `<a href="tel:${phone}">`. Если `phone` не передан — не рендерить ничего.
   - `StarRow` из [MasterPage.tsx:32-47](frontend/src/pages/master/ui/MasterPage.tsx#L32-L47) — вынести в `frontend/src/shared/ui/StarRow.tsx` и переиспользовать в `SalonPage` и `MasterPage`.

10. **`salonApi.ts`** — добавить:
    - Поля `description`, `phonePublic`, `timezone`, `workingHours: WorkingHourDTO[]`, `photos: string[]` в тип `ApiSalon`.
    - Новую функцию `fetchSalonByExternal(source: string, externalId: string): Promise<{ salonId: string; onlineBooking: boolean } | null>` — вызывает `GET /api/v1/salons/by-external?source=...&id=...`, возвращает `null` при 404, бросает ошибку при других статусах.

## Что сознательно оставляем на потом

- Отзывы (`reviews`): схема есть, эндпоинта нет — отдельный план. Вкладка скрыта через `FEATURE_FLAGS.reviews`.
- Акции/промо и фотогалерея: нет моделей, отдельный план. Вкладки скрыты через `FEATURE_FLAGS`.
- Удобства (`amenities`): нет таблицы, блок удалён.
- Микс «наши данные + 2GIS-фото/описание как fallback» для `/salon/:uuid` — отдельный тикет после этого.
- Баннер «Вы владелец? Подключите салон» для `place`-режима — отдельный тикет в связке с онбордингом владельца.

## Критические файлы

- `backend/internal/model/salon.go` — расширить `SalonDTO` + добавить `WorkingHourDTO`.
- `backend/internal/repository/salon.go` — добавить `GetWorkingHours` и `FindByExternalID` в интерфейс.
- `backend/internal/infrastructure/persistence/salon_repository.go` — реализации `GetWorkingHours` и `FindByExternalID`.
- `backend/internal/service/salon.go` — маппер + вызов `GetWorkingHours` + `FindIDByExternal`.
- `backend/internal/controller/salon_controller.go` — роут `GET /v1/salons/by-external`.
- `frontend/src/shared/config/featureFlags.ts` — **новый файл**.
- `frontend/src/entities/salon/model/types.ts` — типы `WorkingHourRow`, `SalonContactRow`, `SalonView`.
- `frontend/src/entities/place/lib/placeDetailToSalon.ts` — маппинг на `SalonView`.
- `frontend/src/shared/api/salonApi.ts` — расширить `ApiSalon` + `fetchSalonByExternal`.
- `frontend/src/pages/salon/ui/SalonPage.tsx` — режимы, источники, удаление моков.
- Новые файлы:
  - `frontend/src/entities/salon/ui/SalonScheduleList.tsx`
  - `frontend/src/entities/salon/ui/SalonContactList.tsx`
  - `frontend/src/entities/salon/ui/SalonCallSidebar.tsx`
  - `frontend/src/entities/salon/lib/isOpenNow.ts`
  - `frontend/src/shared/ui/StarRow.tsx`

## Verification

1. `cd backend && go build ./... && go vet ./...` — бэкенд компилируется без ошибок.
2. `cd frontend && npm run lint && npx tsc --noEmit` — типы и линт чистые.
3. **Проверить наличие тестовых данных перед ручной проверкой**: убедиться что в БД есть хотя бы одна запись в `working_hours` для тестового салона. Если нет — вставить через `seed-dashboard-access.sql` или вручную через `psql`. Без этого сценарий «расписание из БД» непроверяем.
4. Ручная проверка в браузере (`make up`, `http://localhost:5173`):
   - `/salon/:uuid` для существующего салона: режим `salon`, вкладки только «Обзор/Услуги/Мастера», расписание из БД (рабочие часы, перерыв, выходные), кнопка записи активна, гостевая запись проходит.
   - `/place/:externalId` для 2GIS-объекта, которого **нет** в БД: режим `place`, вкладки без «Мастера», расписание из `weeklySchedule`, контакты из `contacts`, фото из `photoUrls`, описание из `description`, sidebar — `SalonCallSidebar` с кнопкой «Позвонить», кнопок записи нет нигде на экране.
   - `/place/:externalId` для 2GIS-объекта, который **привязан** через `salon_external_ids`: автопереход на `/salon/:uuid` (через `replace: true`, кнопка «назад» в браузере работает корректно, не зацикливается).
   - `isOpenNow` — визуально «Открыто/Закрыто» согласуется с текущим временем в `Europe/Moscow`.
5. Sanity-проверка API:
   - `curl :8080/api/v1/salons/<uuid>` — в JSON видим `workingHours`, `description`, `phonePublic`, `timezone`, `photos`.
   - `curl ':8080/api/v1/salons/by-external?source=2gis&id=<привязанный_external>'` → `{"salonId":"...","onlineBooking":true/false}`.
   - `curl ':8080/api/v1/salons/by-external?source=2gis&id=<непривязанный_external>'` → HTTP 404.
