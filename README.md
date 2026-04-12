# Beauty Marketplace

Монорепозиторий: **Go API** (`net/http`, Uber Fx, GORM, PostgreSQL) и **React** (Vite, MUI).

## Требования

- **Go** 1.24+
- **Node.js** 20+ (для Vite 8)
- **Docker** (только для PostgreSQL в разработке)
- Опционально: [**golang-migrate**](https://github.com/golang-migrate/migrate) CLI для наката SQL-миграций

## 1. База данных

Из корня репозитория:

```bash
docker compose up -d
```

PostgreSQL доступен на **localhost:5433** (в контейнере порт 5432). Учётные данные по умолчанию совпадают с `docker-compose.yml`: пользователь `beauty`, пароль `beauty`, БД `beauty`.

## 2. Миграции

Схема задаётся SQL-файлами в `backend/migrations/`. Накатить все миграции (пример с `migrate`):

```bash
migrate -path backend/migrations -database "postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable" up
```

Без CLI можно выполнить `.up.sql` файлы в порядке номеров через `psql` или другой клиент.

## 3. Переменные окружения (бэкенд)

При запуске загружается `.env` из текущей директории или родительских (`backend/.env`, корень репозитория). Основные переменные:

| Переменная | Описание | Значение по умолчанию |
|------------|----------|------------------------|
| `HTTP_ADDR` | Адрес HTTP-сервера | `:8080` |
| `DATABASE_DSN` | Строка подключения к PostgreSQL | `postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable` |
| `JWT_SECRET` | Секрет для JWT | `dev-secret-change-me-in-production` |
| `LOG_LEVEL` | Уровень логов | `development` |
| `2GIS_API_KEY` | Ключ API 2ГИС (опционально, для поиска мест) | — |

Секреты не дублируйте в `frontend/.env` с префиксом `VITE_*` — они попадут в клиентский бандл.

## 4. Запуск API

```bash
cd backend
go run ./cmd/api
```

API слушает **http://localhost:8080** (если не задан другой `HTTP_ADDR`).

## 5. Запуск фронтенда

```bash
cd frontend
npm install
npm run dev
```

Dev-сервер Vite: **http://localhost:5173**. В `vite.config.ts` настроен прокси: запросы с префиксом `/api` уходят на `http://localhost:8080`. В коде используйте базовый URL из `import.meta.env.VITE_API_BASE` (в `frontend/.env` по умолчанию задано `VITE_API_BASE=/api`).

Опционально для карты 2ГИС на странице поиска: в `frontend/.env` задайте `VITE_2GIS_MAP_KEY` — тот же ключ из Platform Manager, что и для тайлов MapGL (ключ попадает в бандл; ограничьте его по домену в кабинете 2ГИС). Без переменной в сайдбаре остаётся прежняя визуальная заглушка карты.

## Типичный порядок для локальной разработки

1. `docker compose up -d`
2. Накатить миграции (см. выше)
3. В одном терминале: `cd backend && go run ./cmd/api`
4. В другом: `cd frontend && npm run dev`
5. Открыть в браузере **http://localhost:5173**

## Сборка фронтенда

```bash
cd frontend
npm run build
```

Просмотр production-сборки локально: `npm run preview`.
