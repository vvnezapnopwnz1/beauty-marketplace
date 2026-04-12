---
name: Search V2 (Merged 2GIS Optimization)
overview: "Объединенный план: Улучшение релевантности выдачи за счет глубокого использования 2GIS API (рубрики, булевые фильтры, режимы поиска), точной геолокации, дедупликации и внедрения бесконечной пагинации."
todos:
  - id: finalize-2gis-api-query
    content: Внедрить расширенные параметры 2GIS API (search_type=one_branch, has_rating, search_nearby) и нужные fields в catalog_adapter.go
    status: completed
  - id: stabilize-rubrics
    content: Сформировать core-реестр beauty-рубрик и использовать их явно в rubric_id через Categories API
    status: completed
  - id: define-location-source-contract
    content: Зафиксировать единый контракт источника локации на frontend (manual -> GPS -> default)
    status: completed
  - id: implement-search-filtering
    content: Добавить post-filter нерелевантных рубрик/объектов (ТЦ, БЦ) и логирование drop_reason на backend
    status: completed
  - id: implement-dedup
    content: Внедрить hard dedup (externalId) в backend и cross-page dedup в frontend
    status: completed
  - id: implement-infinite-scroll
    content: Спроектировать page-based infinite scroll с reset/query-key защитой от дублей
    status: completed
  - id: add-observability-queries
    content: Настроить логирование параметров поиска и отбракованных объектов в OpenObserve
    status: completed
isProject: false
---

# План: V2 Search (Глубокая интеграция 2GIS + Оптимизация выдачи)

Этот план объединяет предыдущие задачи по качеству поиска с результатами глубокого исследования API 2ГИС. Основная цель — чтобы пользователь видел максимально релевантную выдачу "прямо сейчас", без шума (ТЦ, бизнес-центры) и без необходимости в сложной платформенной персонализации на этапе MVP.

## 1. Максимальное использование 2GIS API (Запрос)

Основано на глубоком анализе документации `catalog.api.2gis.com/3.0/items`:

- **Тип и режим поиска**:
  - `type=branch` (искать только филиалы компаний).
  - `search_type=one_branch` — запрашиваем дедупликацию филиалов одной сети прямо на уровне движка 2GIS (если не нужно показывать каждый филиал сети).
  - `search_is_query_text_complete=true` — отключаем префиксный поиск по тексту, чтобы избежать ложных срабатываний.
- **Локация и ранжирование**:
  - При явном поиске вокруг себя использовать `search_nearby=true` + `sort=distance` или `sort=relevance`.
  - Передавать `location=lon,lat` для правильного учета контекста пользователя.
- **Булевые фильтры качества**:
  - Использовать `has_rating=true`, `has_reviews=true` и `has_photos=true` для режимов "Строгий/Премиум", если потребуется сужать выдачу только до качественных салонов.
- **Режим "Открыто сейчас"**:
  - Использовать нативную поддержку API через параметр `work_time=now`.
- **Запрос только нужных полей (`fields`)**:
  - `items.point,items.reviews,items.rubrics,items.schedule,items.flags,items.attribute_groups,items.full_address_name`. (Учтено, что `contact_groups` и `photos` — платные/недоступные по умолчанию фичи, полагаемся на `flags.photos`).

_Файлы: `backend/internal/infrastructure/twogis/catalog_adapter.go`, `backend/internal/service/search.go`_

## 2. Управляемые рубрики (Categories API)

Поскольку 2ГИС возвращает много шума, если просто искать текстом "салон", мы переходим к жесткому ограничению по `rubric_id`.

- Использовать реестр Core Beauty рубрик:
  - Парикмахерские (305), Салоны красоты/Косметология (652), Ногтевые студии (5603), Барбершопы (110998), СПА (56759), Эпиляция (110816), Брови/Ресницы (110355) и т.д.
- В запрос передавать сразу несколько рубрик: `rubric_id=305,652,5603...`.
- Отбрасывать любые объекты, у которых нет пересечений с нашими `core` рубриками (исключает ТЦ, магазины косметики, БЦ).

_Файлы: `backend/internal/infrastructure/twogis/catalog_adapter.go`, `backend/internal/service/search.go`_

## 3. Локация и контекст на Frontend

- Строгий fallback:
  1. Если выбран конкретный город в UI -> `region_id`, центр города `lat/lon`.
  2. Иначе -> `useGeolocation()` -> GPS координаты.
  3. Иначе -> серверный дефолт.
- Прокидывать источник локации в Headers (`client_action` suffix), чтобы анализировать успешность поисков.

_Файлы: `frontend/src/pages/search/ui/SearchPage.tsx`, `frontend/src/features/location/model/locationSlice.ts`_

## 4. Post-filter (Анти-мусор) и Дедупликация на Backend

Несмотря на фильтры API, 2ГИС может возвращать "гибридные" объекты.

- **Post-filter**: Если в выдаче попадается ТЦ как бизнес, отбрасываем (смотрим на `items.rubrics` и `drop_reason="non_beauty_rubric"`).
- **Hard dedup**: Обязательная проверка по `externalId`, чтобы не отдавать дубли в рамках одного или нескольких запросов.
- **Soft dedup**: Слияние карточек с одинаковым нормализованным `именем + адресом` (опционально, если `search_type=one_branch` не справляется идеально).

_Файлы: `backend/internal/service/search.go`_

## 5. Infinite Scroll (Пагинация)

- API: Поддержка `page` (от 1) и `page_size` (10-20).
- UI: Использовать `IntersectionObserver` на странице поиска.
- Cross-page dedup: Хранить `Set<string>` из уже отрендеренных `externalId`, чтобы не отрисовывать дубли при сдвиге выдачи на стороне 2GIS.
- Сброс пагинации: При любом изменении фильтров (гео, рубрики) — обнулять список и начинать с `page=1`.

_Файлы: `frontend/src/pages/search/ui/SearchPage.tsx`, `frontend/src/shared/api/searchApi.ts`_

## 6. Observability (OpenObserve)

- Логировать каждый шаг цепочки: параметры поиска (включая флаги `search_nearby`, `work_time`), `items_before_filter`, `items_after_filter`, `dedup_removed`, `drop_reason`.
- Вывести метрики в OpenObserve для анализа реального качества выдачи (отсутствия мусора) перед тем, как инвестировать в свою базу данных.

_Файлы: `docs/search.md`, `observability/vector/vector.yaml`_
