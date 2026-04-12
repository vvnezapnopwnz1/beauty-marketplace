---
name: Search quality improvements
overview: "Улучшаем качество поиска в текущем стеке 2GIS-first: точнее геолокация, фильтрация нерелевантных рубрик/объектов, дедупликация выдачи и бесконечная пагинация на скролле."
todos:
  - id: define-location-source-contract
    content: Зафиксировать единый контракт источника локации и прокинуть в client_action/headers
    status: pending
  - id: implement-search-filtering
    content: Добавить post-filter нерелевантных рубрик и логирование drop_reason на backend
    status: pending
  - id: implement-dedup
    content: Внедрить hard/soft dedup в backend и cross-page dedup в frontend
    status: pending
  - id: implement-infinite-scroll
    content: Добавить пагинацию с append режимом и IntersectionObserver на SearchPage
    status: pending
  - id: add-observability-queries
    content: Обновить docs/search.md готовыми фильтрами качества выдачи и debug-запросами
    status: pending
isProject: false
---

# План улучшения поиска (OpenObserve + 2GIS-first)

## Цели

- Стабильно определять локацию для релевантной выдачи.
- Убрать нерелевантные объекты (например, ТЦ как верхний объект вместо салона).
- Убрать технические дубли в одной странице и между страницами.
- Добавить infinite scroll: `10 + 10 + 10...` по мере скролла.
- Сохранить наблюдаемость цепочки `frontend -> backend -> 2GIS` в логах.

## Принятые дефолты (можно поменять позже)

- **Локация:** manual city -> GPS -> центр города (если GPS недоступен).
- **Дедуп:** удаляем только технические дубли (по `externalId`), филиалы сети оставляем отдельными карточками.

## 1) Локация и контекст поиска

- Вынести и формализовать резолв локации в frontend для единого поведения везде:
  - если выбран город в сторе — использовать его (`regionId`, `lat`, `lon`);
  - иначе использовать `useGeolocation()`;
  - иначе использовать серверные дефолты.
- Добавить явный маркер источника локации в client headers (`client_action` suffix), чтобы видеть в OpenObserve, откуда пришли координаты.

Файлы:

- [frontend/src/pages/search/ui/SearchPage.tsx](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx)
- [frontend/src/features/location/model/locationSlice.ts](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/features/location/model/locationSlice.ts)
- [frontend/src/shared/api/searchApi.ts](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/shared/api/searchApi.ts)

## 2) Анти-мусор по рубрикам (ТЦ/бизнес-центры)

- Усилить фильтрацию на backend после получения 2GIS items:
  - добавляем deny-list рубрик/паттернов (ТЦ, бизнес-центр, торгово-развлекательный центр и т.п.);
  - разрешаем объекты, где есть beauty-рубрики из `rubricCategory`.
- Логировать причины отбрасывания (`component=search_filter`, `drop_reason`) для калибровки правил.

Файлы:

- [backend/internal/service/search.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go)
- [backend/internal/infrastructure/twogis/catalog_adapter.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/infrastructure/twogis/catalog_adapter.go)

## 3) Дедупликация выдачи

- Добавить 2 уровня дедупа в backend:
  - **hard dedup:** по `externalId` (всегда);
  - **soft dedup:** по `normalized(name)+normalized(address)` только внутри одной страницы, с безопасным merge полей.
- Для cross-page дедупа хранить на frontend set уже показанных `externalId`, чтобы при `page+1` не рендерить повтор.

Файлы:

- [backend/internal/service/search.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go)
- [frontend/src/pages/search/ui/SearchPage.tsx](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx)

## 4) Infinite scroll (пагинация 10 -> +10)

- Расширить API-хук поиска поддержкой append-режима и накопления страниц:
  - `search({ page, page_size, ... }, { append: true })`;
  - хранить `hasMore`, `nextPage`, `loadingMore`.
- На странице поиска добавить `IntersectionObserver` sentinel внизу списка:
  - при пересечении и `hasMore=true` грузить следующую страницу;
  - защита от двойных запросов (`inFlight` guard).
- Сохранять текущие фильтры/категорию как ключ запроса; при изменении ключа сбрасывать список и начинать с page=1.

Файлы:

- [frontend/src/shared/api/searchApi.ts](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/shared/api/searchApi.ts)
- [frontend/src/pages/search/ui/SearchPage.tsx](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx)

## 5) Наблюдаемость (OpenObserve)

- Добавить поля в логи поиска:
  - `page`, `page_size`, `items_before_filter`, `items_after_filter`, `dedup_removed`, `drop_reason`.
- Документировать готовые запросы для контроля качества:
  - мусорные объекты по `drop_reason`;
  - доля дубликатов по `dedup_removed`;
  - latency per page (`duration_ms`, `page`).

Файлы:

- [backend/internal/controller/server.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/controller/server.go)
- [docs/search.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/search.md)

## 6) Проверка и критерии готовности

- Backend: `cd backend && go test ./...`
- Frontend: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`
- Ручная проверка:
  - в выдаче нет ТЦ как самостоятельных результатов;
  - отсутствуют повторы `externalId`;
  - скролл догружает новые карточки без скачков и дублей;
  - в OpenObserve видны `http_access` + `twogis_adapter` + метрики фильтрации/дедупа.

## Риски и смягчение

- Риск агрессивной фильтрации (можно скрыть валидные салоны в ТЦ): начать с мягкого deny-list + логирование, затем тюнинг по данным.
- Риск дрожания ранжирования при догрузке страниц: фиксировать сортировку на backend по ответу 2GIS, не пересортировывать между страницами на frontend.
