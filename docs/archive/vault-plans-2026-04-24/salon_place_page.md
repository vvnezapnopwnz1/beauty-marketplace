---
title: salon place page
updated: 2026-04-24
source_of_truth: mirror
code_pointers: []
---

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

Дополнительно закрываем слепое пятно: если пользователь пришёл на `/place/:externalId`, а салон у нас уже подключён, страница должна это увидеть и показать salon-режим (либо редирект на `/salon/:uuid`).

## Архитектура: один view-model, два источника

На фронте вводится единый `SalonView` с полями, которые рендер знает одинаково:

```ts
type SalonView = {
  mode: 'salon' | 'place'
  salonId?: string            // наш UUID (только в salon)
  externalId?: string
  // base
  name, address, district, rating, reviewCount, photos[], description
  badge, cardGradient, emoji
  // structured
  services: Service[]         // в place-режиме пусто или []
  workingHours?: WorkingHourRow[]   // 0..7 записей (из БД или из 2GIS weeklySchedule)
  schedule247?: boolean
  scheduleComment?: string
  contactRows: SalonContactRow[]
  // capabilities
  canBookOnline: boolean      // salon.onlineBooking && есть service.id
  hasOwner: boolean           // true в salon-режиме
}
```

Заполнение:

- `salon`-режим: `fetchSalonById` → `ApiSalon` + `workingHours[]` (новое поле DTO). В будущем можно мержить с 2GIS-фото/описанием, если в БД пусто, но это вне скоупа этого плана.
- `place`-режим: `fetchPlaceByExternalId` → `PlaceDetail`, маппер достаёт `weeklySchedule → workingHours`, `contacts → contactRows`, `photoUrls → photos[]`, `description`.

Выбор режима делает `SalonPage` по URL + lookup: при входе по `/place/:externalId` параллельно с детальным запросом проверяем, не подключён ли этот external_id к нашему салону; если подключён — переключаемся в `salon`-режим (редирект на `/salon/:uuid` через `navigate(..., { replace: true })`).

## Скоуп

### Backend

1. **Расширить `SalonDTO`** ([backend/internal/model/salon.go](backend/internal/model/salon.go), маппер — [backend/internal/service/salon.go:36-105](backend/internal/service/salon.go)).
   - Добавить: `description`, `phonePublic`, `timezone`, `workingHours[]`, `photos[]` (ровно тот же JSON shape, что дашборд отдаёт для working hours — переиспользуем тип).
   - `workingHours` — массив `{dayOfWeek, opensAt, closesAt, isClosed, breakStartsAt?, breakEndsAt?}` в `HH:MM`.
2. **Прокинуть чтение `working_hours`** в `SalonService.GetByID` — переиспользовать существующий `DashboardRepository.ListWorkingHours` ([dashboard_repository.go:289-293](backend/internal/infrastructure/persistence/dashboard_repository.go#L289-L293)). Либо вытащить метод в общий `SalonRepository`, либо инжектировать `DashboardRepository` в `SalonService` (предпочтительно первое — чище слои).
3. **Lookup салона по `(source, external_id)`** — новый публичный эндпоинт:
   - `GET /api/v1/salons/by-external?source=2gis&id=<externalId>` → `{salonId, onlineBooking}` или 404.
   - Регистрация: в `SalonController.SalonRoutes` ([backend/internal/controller/salon_controller.go](backend/internal/controller/salon_controller.go)).
   - Новый репо-метод `FindByExternalID(ctx, source, externalID)` ([backend/internal/repository/salon.go](backend/internal/repository/salon.go) + реализация в [salon_repository.go:61-78](backend/internal/infrastructure/persistence/salon_repository.go#L61-L78) рядом с `FindByExternalIDs`).
   - Сервисный метод `SalonService.FindIDByExternal(ctx, source, externalID)` ([backend/internal/service/salon.go](backend/internal/service/salon.go)).

### Frontend

4. **Переписать `placeDetailToSalon`** ([frontend/src/entities/place/lib/placeDetailToSalon.ts](frontend/src/entities/place/lib/placeDetailToSalon.ts)) на новый `SalonView` (или поменять Salon type + расширить):
   - `weeklySchedule → workingHours` (7 дней по `PlaceScheduleDay`, первый интервал → opens/closes; пустой → `isClosed: true`).
   - `photoUrls → photos[]`, с fallback на первый как `photoUrl`.
   - `description`, `scheduleComment`, `schedule247` — пробросить.
   - убрать хардкод `category: 'hair'`, `businessType: 'venue'` — пометить как `undefined`/`unknown` и обработать на рендере.

5. **SalonPage.tsx**: добавить `mode` в стейт, source selector:
   - `load()` ветка `/place/...`: параллельно с `fetchPlaceByExternalId` дёргаем новый `fetchSalonByExternal('2gis', externalId)`. Если вернулся `salonId` — `navigate('/salon/:uuid', { replace: true })` до рендера. Если 404 — продолжаем с `place`-режимом.
   - Рендер: видимость вкладок, блока `BookingSidebar`, мобильной кнопки записи и CTA в карточках услуг — через `mode === 'salon' && canBookOnline`.
   - В `place`-режиме: вместо sidebar — карточка `SalonCallSidebar` с телефоном (кнопка «Позвонить», `<a href="tel:...">`) из первого phone-контакта в `contactRows`. Если телефона нет — просто скрываем sidebar. Мобильная кнопка — тоже «Позвонить».

6. **OverviewTab**: убрать хардкод-расписание и контакты-литералы, рендерить `workingHours` из view-model (с «Закрыто» для `isClosed`). `isOpen`-вычисление перенести в утилиту `isOpenNow(workingHours, tz)` — новая утилита в `frontend/src/entities/salon/lib/`. В `place`-режиме при отсутствии `workingHours` и `schedule247 === true` — показать бейдж «Круглосуточно».

7. **Моки-секции — убираем из UI за фичефлагом**:
   - `ReviewsTab`, `PromosTab`, `PhotosTab` — полностью скрыть из `TABS`. `visibleTabs` уже знает этот паттерн ([SalonPage.tsx:690-695](frontend/src/pages/salon/ui/SalonPage.tsx#L690-L695)); расширяем фильтр условиями `hasReviews && reviewCount > 0`, `hasPromos`, `hasPhotos` — все пока константы `false` в конфиге.
   - Сам код компонентов `ReviewsTab`/`PromosTab`/`PhotosTab` + литералы `REVIEWS`, `RATING_BREAKDOWN`, `PROMOS`, `PHOTO_GRADIENTS`, `PHOTO_LABELS` — удалить целиком из [SalonPage.tsx](frontend/src/pages/salon/ui/SalonPage.tsx) (вернутся с реальными данными в отдельных тикетах).
   - Блок `AMENITIES` ([SalonPage.tsx:69](frontend/src/pages/salon/ui/SalonPage.tsx#L69)) — удалить из `OverviewTab` и из модуля (нет данных ни в `salon`, ни в `place`).

8. **Экстракт компонентов** (чтобы не тащить всё в `SalonPage`):
   - `SalonScheduleList` — рендер `workingHours[]` + статус «Открыто/Закрыто» / «Круглосуточно».
   - `SalonContactList` — рендер `contactRows[]`.
   - `SalonCallSidebar` — sidebar для `place`-режима с кнопкой «Позвонить» (tel-ссылкой).
   - Разместить в `frontend/src/entities/salon/ui/`. `StarRow` из [MasterPage.tsx:32-47](frontend/src/pages/master/ui/MasterPage.tsx#L32-L47) переехать в `shared/ui/StarRow` и переиспользовать в обоих местах.

## Что сознательно оставляем на потом

- Отзывы (`reviews`): схема есть, эндпоинта нет — отдельный план. Пока вкладка скрыта.
- Акции/промо и фотогалерея: нет моделей, отдельный план. Вкладки скрыты.
- Удобства (`amenities`): нет таблицы, блок удалён.
- Микс «наши данные + 2GIS-фото/описание как fallback» для `/salon/:uuid` — отдельный тикет после этого.
- Баннер «Вы владелец? Подключите салон» для `place`-режима — отдельный тикет в связке с онбордингом владельца.

## Критические файлы

- `backend/internal/model/salon.go` — расширить `SalonDTO` (description, phonePublic, timezone, workingHours, photos).
- `backend/internal/service/salon.go` — мапер + загрузка `working_hours` + `FindIDByExternal`.
- `backend/internal/repository/salon.go` + `backend/internal/infrastructure/persistence/salon_repository.go` — добавить `FindByExternalID` (single) рядом с существующим `FindByExternalIDs`.
- `backend/internal/controller/salon_controller.go` — новый роут `GET /v1/salons/by-external`.
- `frontend/src/entities/salon/model/types.ts` — расширение `Salon` новыми полями (`description`, `workingHours[]`, `photos[]`, `mode?`).
- `frontend/src/entities/place/lib/placeDetailToSalon.ts` — маппинг `weeklySchedule`, `photoUrls`, `description`.
- `frontend/src/shared/api/salonApi.ts` — `ApiSalon` добавить поля + новая функция `fetchSalonByExternal(source, externalId)`.
- `frontend/src/pages/salon/ui/SalonPage.tsx` — режимы, источники, удаление `REVIEWS` / `RATING_BREAKDOWN` / `PROMOS` / `PHOTO_*` / `AMENITIES` и соответствующих табов.
- Новые: `frontend/src/entities/salon/ui/SalonScheduleList.tsx`, `SalonContactList.tsx`, `SalonCallSidebar.tsx`, `frontend/src/entities/salon/lib/isOpenNow.ts`, `frontend/src/shared/ui/StarRow.tsx`.

## Verification

1. `cd backend && go build ./... && go vet ./...` — бэкенд компилится.
2. `cd frontend && npm run lint && npx tsc --noEmit` — типы и линт.
3. Ручная проверка в браузере (`make up`, `http://localhost:5173`):
   - `/salon/:uuid` для существующего салона из сидов: режим `salon`, видны только вкладки «Обзор/Услуги/Мастера», расписание из БД (рабочие часы, перерыв, выходные), кнопка записи активна, гостевая запись проходит.
   - `/place/:externalId` для 2GIS-объекта, которого **нет** в БД: режим `place`, вкладки без «Мастера», расписание из `weeklySchedule`, контакты из `contacts`, фото из `photoUrls`, описание из `description`, sidebar — `SalonCallSidebar` с кнопкой «Позвонить», кнопки записи нет нигде на экране.
   - `/place/:externalId` для 2GIS-объекта, который **привязан** к нашему салону через `salon_external_ids`: автопереход на `/salon/:uuid` (через `replace: true`, кнопка «назад» работает корректно).
   - `isOpenNow` — визуально «Открыто/Закрыто» согласуется с текущим временем в `Europe/Moscow`.
4. Быстрая sanity-проверка API:
   - `curl :8080/api/v1/salons/<uuid>` — в JSON видим `workingHours`, `description`, `phonePublic`, `timezone`, `photos`.
   - `curl ':8080/api/v1/salons/by-external?source=2gis&id=<external>'` — для привязанного external: `{salonId, onlineBooking}`; для непривязанного: 404.
