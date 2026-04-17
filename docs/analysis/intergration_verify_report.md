---
name: 2GIS integration verify report
overview: Поднять Postgres и бэкенд при необходимости, вызвать `/api/v1/places/search` с параметрами для Москвы и салонов красоты, зафиксировать HTTP-статус и краткие результаты в `docs/*.md` без утечки API-ключа.
todos:
  - id: infra-up
    content: Поднять Postgres (docker compose) и бэкенд go run ./cmd/api при необходимости
    status: completed
  - id: curl-places
    content: Вызвать GET /api/v1/places/search с q=салон красоты и точкой Москвы, зафиксировать код и тело
    status: in_progress
  - id: write-report
    content: Создать docs/2gis-integration-report.md с результатами без секретов
    status: pending
isProject: false
---

# Проверка 2ГИС через бэкенд и отчёт в docs

## Как устроен запрос (ваш сервис → 2ГИС)

Адаптер [`catalog_adapter.go`](backend/internal/infrastructure/twogis/catalog_adapter.go) делает **GET** на:

`https://catalog.api.2gis.com/3.0/items`

Параметры (уже зашиты в коде, кроме пользовательских):

| Параметр            | Значение в коде                                                          |
| ------------------- | ------------------------------------------------------------------------ |
| `key`               | из `2GIS_API_KEY` в окружении                                            |
| `q`                 | строка поиска из запроса к API                                           |
| `type`              | `branch` (филиалы организаций)                                           |
| `locale`            | по умолчанию `ru_RU` ([`places.go`](backend/internal/service/places.go)) |
| `point`             | `lon,lat` (важно: **сначала долгота, потом широта**)                     |
| `radius`            | метры (по умолчанию 2000, если не передан)                               |
| `page`, `page_size` | пагинация                                                                |

**Пример для «салоны красоты в Москве» через ваш бэкенд** (после `go run`, порт по умолчанию `:8080` из [`config.go`](backend/internal/config/config.go)):

```bash
curl -sS -w "\nHTTP_CODE:%{http_code}\n" \
  "http://localhost:8080/api/v1/places/search?q=%D1%81%D0%B0%D0%BB%D0%BE%D0%BD%20%D0%BA%D1%80%D0%B0%D1%81%D0%BE%D1%82%D1%8B&lat=55.7558&lon=37.6176&radius=15000&page_size=5"
```

(в URL `q` — это «салон красоты»; центр Москвы ~ `lat=55.7558`, `lon=37.6176`; `radius=15000` — разумный радиус по городу, при необходимости увеличить.)

Прямой вызов 2ГИС без бэкенда (только для справки в отчёте, ключ подставлять вручную и **не коммитить**):

`GET https://catalog.api.2gis.com/3.0/items?key=...&q=...&type=branch&locale=ru_RU&point=37.6176,55.7558&radius=15000&page=1&page_size=5`

## Предусловия

- В **корне репозитория** файл `.env` с `2GIS_API_KEY=...` (загрузка через [`cmd/api/main.go`](backend/cmd/api/main.go)).
- PostgreSQL доступен по DSN по умолчанию из конфига: `postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable` — совпадает с [`docker-compose.yml`](docker-compose.yml) (порт **5433** на хосте).

Без работающего Postgres [`NewDB`](backend/internal/infrastructure/persistence/postgres.go) не откроется и приложение на fx не поднимется.

## Шаги выполнения (после подтверждения плана)

1. Проверить, запущен ли контейнер `beauty_db` / порт 5433; при необходимости: `docker compose up -d` из корня репо.
2. Проверить, не слушает ли уже кто-то `:8080`; при необходимости запустить бэкенд: `cd backend && go run ./cmd/api` (в фоне при длительной проверке).
3. Вызвать `curl` к `/api/v1/places/search` с параметрами выше (и при желании второй запрос с другим `q`, например `маникюр`).
4. Интерпретация:
   - **200** + JSON с `items` и `total` — интеграция с 2ГИС с ключом работает; в отчёте указать число элементов и пример одного `externalId`/`name` (без полного дампа ответа).
   - **503** — ключ не подхвачен (`2GIS_API_KEY` пустой или `.env` не найден относительно cwd).
   - **502** — апстрим вернул ошибку; в отчёте кратко тело/код, без ключа.

## Файл отчёта

Создать **[`docs/2gis-integration-report.md`](docs/2gis-integration-report.md)** со структурой:

- Дата/время проверки (локальная).
- Версия Go / команда запуска бэкенда.
- Использованный **пример запроса** к **вашему** API (URL без секретов).
- HTTP-код, `total` из JSON, число разобранных `items`, 1–2 поля из первого элемента (имя, id).
- Краткий вывод: ключ и Catalog API 3.0 работают / не работают и почему.
- Явная оговорка: **не вставлять** значение `2GIS_API_KEY` в файл.

При неудаче подключения к БД или отсутствии миграций — зафиксировать текст ошибки и отметить, что проверка 2ГИС не дошла до HTTP-вызова.
