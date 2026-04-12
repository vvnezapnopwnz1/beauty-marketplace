---
name: 2GIS search optimization
overview: План фокусируется на улучшении релевантности выдачи за счет возможностей 2GIS API (рубрики, фильтры, режимы поиска, гео-сигналы, пагинация), без слома текущего запроса и с верификацией через логи.
todos:
  - id: finalize-query-profiles
    content: Зафиксировать профили запроса 2GIS и набор fields/search_type без изменения базового каркаса
    status: pending
  - id: stabilize-rubrics
    content: Сформировать core/optional beauty rubric registry и правила исключения нерелевантных объектов
    status: pending
  - id: build-infinite-scroll
    content: Спроектировать page-based infinite scroll с reset/query-key и защитой от дублей
    status: pending
  - id: add-dedup-pipeline
    content: Определить backend+frontend dedup-поток по externalId и межстраничному состоянию
    status: pending
  - id: define-observability-kpis
    content: Зафиксировать KPI качества выдачи и готовые запросы в OpenObserve для контроля
    status: pending
isProject: false
---

# План: углубленная оптимизация выдачи через 2GIS API

## База и ограничения из документов

- Архитектурно оставляем модель `2GIS-first + DB enrichment`, без долгосрочного хранения каталожных данных 2GIS ([/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/discovery-catalog-strategy.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/discovery-catalog-strategy.md), [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/status.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/status.md)).
- Не ломаем текущий каркас запроса (`type=branch`, `point+radius`, `region_id`, `rubric_id`, `fields`) и расширяем его управляемо ([/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/intergration_verify_report.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/intergration_verify_report.md), [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/context-search-requirements.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/context-search-requirements.md)).
- Принимаем ограничения API: демо-ключ, page/page_size, часть полей платные/недоступные ([/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/2gis-api-reference-ru.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/2gis-api-reference-ru.md), [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/compass_artifact_wf-ab3d3264-ff37-4613-b3da-287a4c6af676_text_markdown.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/compass_artifact_wf-ab3d3264-ff37-4613-b3da-287a4c6af676_text_markdown.md)).

## Этап 1 — Контракт "качественного" запроса к 2GIS

- Зафиксировать 3 профиля запроса (без рефакторинга UI):
  - **nearby_default**: `type=branch`, `point+radius`, `region_id`, `rubric_id`, `sort=relevance`.
  - **nearby_strict**: + `search_nearby=true`, `has_rating=true`, `has_reviews=true`.
  - **open_now**: + `work_time=now` для режима «прямо сейчас».
- Явно закрепить `search_type` стратегию:
  - базово `discovery`;
  - экспериментально `one_branch` для снижения дублей.
- Расширить `fields` только полезными для ранжирования/фильтрации (без лишнего шума): `items.point,items.reviews,items.rubrics,items.schedule,items.flags,items.full_address_name`.

Файлы для последующей реализации:

- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/infrastructure/twogis/catalog_adapter.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/infrastructure/twogis/catalog_adapter.go)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go)

## Этап 2 — Рубрики: управляемое сужение выдачи

- Перейти от «термы -> rubric lookup» к управляемому реестру beauty-рубрик:
  - core-набор (hair/nails/spa/barber/brows/makeup/epilation);
  - optional-набор (широкие рубрики, включаются по фиче/категории).
- Добавить периодическую валидацию рубрик через Categories API (`/2.0/catalog/rubric/list|search`) и лог изменений (чтобы не терять актуальность ID по регионам).
- Ввести deny-list нерелевантных рубрик/паттернов (ТЦ/БЦ) на пост-обработке, если 2GIS возвращает смешанный шум.

Файлы:

- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/infrastructure/twogis/catalog_adapter.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/infrastructure/twogis/catalog_adapter.go)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/search.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/search.md)

## Этап 3 — Контроль дублей без потери филиалов

- В backend: hard-dedup по `externalId` в рамках ответа страницы.
- В frontend: cross-page dedup для infinite-scroll (set уже показанных `externalId`), чтобы один и тот же объект не повторялся при догрузке.
- Сетевые филиалы (разные адреса) не скрывать автоматически; вынести в отдельную задачу только если продуктово захотите «группировать сеть».

Файлы:

- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/shared/api/searchApi.ts](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/shared/api/searchApi.ts)

## Этап 4 — Пагинация и infinite scroll (10 + 10 + 10)

- API-контракт: page-based пагинация уже есть, закрепить одинаковый query-key между страницами (категория, гео, region, filters).
- Frontend:
  - `page=1, page_size=10` initial;
  - `IntersectionObserver` sentinel -> `page+1`;
  - `hasMore = renderedCount < total`;
  - блокировка параллельных догрузок и сброс при смене фильтров/локации.
- Учитывать лимиты ключа 2GIS (если демо): graceful stop после доступных страниц.

Файлы:

- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/shared/api/searchApi.ts](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/shared/api/searchApi.ts)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx)

## Этап 5 — Геолокация и ранжирование

- Стратегия источника локации:
  - manual city (если выбрана) -> geolocation -> серверный дефолт.
- Для «лучших рядом» сделать двухступенчатое ранжирование:
  - upstream sort (`relevance` или `distance` по режиму);
  - легкий post-rank в backend (distance/rating/review_count/open_now), без агрессивной перестановки выдачи.
- Добавить режимы сортировки в UI явно: «Рядом», «По рейтингу», «Открыто сейчас».

Файлы:

- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/frontend/src/pages/search/ui/SearchPage.tsx)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/backend/internal/service/search.go)

## Этап 6 — Наблюдаемость и валидация качества

- Для каждого запроса логировать: `query_profile`, `search_type`, `rubric_id`, `page`, `page_size`, `items_before_filter`, `items_after_filter`, `dedup_removed`, `duration_ms`.
- В OpenObserve закрепить быстрые срезы:
  - `component=http_access`;
  - `component=twogis_adapter`;
  - ошибки/latency по page и профилям запроса.
- Добавить в docs чек-лист ручной QA (20 контрольных кейсов по категориям и 3 городским зонам).

Файлы:

- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/search.md](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/search.md)
- [/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/observability/vector/vector.yaml](/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/observability/vector/vector.yaml)

## Порядок внедрения

1. Этап 1+2 (качество входного запроса и рубрики) — максимальный прирост релевантности с минимальным риском.
2. Этап 4 (infinite scroll) — UX улучшение без изменения доменной логики.
3. Этап 3 (dedup) — донастройка после накопления реальных кейсов.
4. Этап 5+6 (ранжирование и observability) — стабилизация и измеримость.

## Критерии готовности

- Снижение нерелевантных объектов (ТЦ/БЦ) в топ-20 по ручной валидации.
- Отсутствие повторов `externalId` в одной сессии скролла.
- Догрузка страниц без рывков и дублей.
- В OpenObserve видно полный трейс `frontend -> backend -> 2GIS` и метрики фильтрации/дедупа.
