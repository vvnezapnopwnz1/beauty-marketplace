# E2E Flow Testing — Beauty Marketplace

Инфраструктура для автоматизированного тестирования пользовательских сценариев через web-интерфейс.

## Архитектура

```
e2e/
├── scenarios/
│   └── flows.yaml          # Все сценарии в декларативном YAML
├── actions/                 # Action-функции (по доменам)
│   ├── index.ts             # Реестр: "namespace.action" → функция
│   ├── auth.actions.ts      # Авторизация
│   ├── staff.actions.ts     # Мастера
│   ├── services.actions.ts  # Услуги
│   ├── booking.actions.ts   # Гостевая запись
│   ├── appointments.actions.ts
│   ├── clients.actions.ts   # CRM
│   ├── calendar.actions.ts  # DnD, режимы
│   ├── claim.actions.ts     # Claim flow
│   ├── onboarding.actions.ts
│   ├── assert.actions.ts    # Все проверки
│   └── ...                  # Остальные домены
├── helpers/
│   ├── flow-loader.ts       # Парсинг YAML → типизированные объекты
│   ├── test-context.ts      # Shared state между шагами
│   └── api-helpers.ts       # Прямые API-вызовы (seed, shortcuts)
├── tests/
│   └── flow-runner.spec.ts  # Генератор тестов из YAML
├── playwright.config.ts
├── .env.example
└── mcp-playwright.json      # Конфиг Playwright MCP для AI-агентов
```

## Быстрый старт

```bash
# 1. Установить зависимости
cd frontend
npm install
npx playwright install chromium

# 2. Запустить backend + frontend (в отдельных терминалах, из корня репо)
# Playwright config сам поднимает backend в dev-e2e режиме:
# DEV_OTP_BYPASS_ANY=1 + DEV_ENDPOINTS=1
make backend-local
cd frontend && npm run dev

# 3. Запустить все тесты
npx playwright test --config=e2e/playwright.config.ts

# 4. Запустить только smoke-тесты
E2E_TAG=smoke npx playwright test --config=e2e/playwright.config.ts

# 5. Запустить конкретный сценарий по имени
npx playwright test --config=e2e/playwright.config.ts -g "Claim салона"

# 6. Видеть выполнение в окне браузера (headed mode)
E2E_HEADED=1 npx playwright test --config=e2e/playwright.config.ts
```

## Фильтрация сценариев

```bash
# По тегу
E2E_TAG=smoke npx playwright test --config=e2e/playwright.config.ts
E2E_TAG=critical-path npx playwright test --config=e2e/playwright.config.ts
E2E_TAG=regression npx playwright test --config=e2e/playwright.config.ts
E2E_TAG=auth npx playwright test --config=e2e/playwright.config.ts
E2E_TAG=full-e2e npx playwright test --config=e2e/playwright.config.ts

# По имени
npx playwright test --config=e2e/playwright.config.ts -g "Гостевая мульти-услуга"

# Свой файл сценариев
E2E_SCENARIOS=scenarios/my-custom.yaml npx playwright test --config=e2e/playwright.config.ts
```

## Dev setup helpers

Backend в режиме `DEV_ENDPOINTS=1` даёт dev endpoint'ы для подготовки тестовых данных:

- `POST /api/dev/claim/by-external` — привязать любой `externalId` (2GIS) к платформе и сделать пользователя owner салона.
- `POST /api/dev/e2e/seed-salon` — alias с тем же поведением, удобный для e2e setup.

Пример:

```bash
curl -sS -X POST "http://localhost:8080/api/dev/e2e/seed-salon" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+79001112233",
    "source": "2gis",
    "externalId": "141373143068690",
    "snapshotName": "Салон E2E"
  }'
```

Ответ содержит `salonId`, `dashboardUrl` и `tokenPair`.

`ApiHelpers` автоматически вызывает `/api/dev/e2e/seed-salon` при `beforeAll`,
поэтому перед запуском e2e не нужно делать ручной `curl` для подготовки салона.
В сид передаётся `E2E_SEED_EXTERNAL_ID` (по умолчанию `141373143068690`), поэтому
в тестах используется реальный путь `2gis externalId -> claim -> platform salonId`.
Fallback `E2E_SALON_ID` оставлен только как ручной override (не обязателен).

## Добавление нового сценария

### 1. Описать в YAML

Добавь новый flow в `scenarios/flows.yaml`:

```yaml
- name: 'Мой новый сценарий'
  tags: [regression]
  roles: [salon_owner]
  steps:
    - action: auth.loginAsSalonOwner
    - action: dashboard.navigate
      data: { section: 'services' }
    - action: services.create
      data: { name: 'Новая услуга', priceCents: 100000 }
    - action: assert.serviceInList
      data: { name: 'Новая услуга' }
```

### 2. Если нужен новый action

Создай файл `actions/my-domain.actions.ts`:

```typescript
import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const myDomainActions: Record<string, ActionFn> = {
  async doSomething(page: Page, ctx: TestContext, api: ApiHelpers, data?: Record<string, unknown>) {
    // Твоя логика
    await page.click('[data-testid="my-button"]')
  },
}
```

Затем зарегистрируй в `actions/index.ts`:

```typescript
import { myDomainActions } from './my-domain.actions'
// ...
...prefixActions('myDomain', myDomainActions),
```

Теперь `myDomain.doSomething` доступен в YAML.

### 3. Data-testid атрибуты

Для надёжности добавляй `data-testid` в React-компоненты:

```tsx
<Button data-testid="add-service">Добавить услугу</Button>
```

Action-функции используют составные селекторы — сначала ищут по `data-testid`, потом fallback на текст:

```typescript
await page.click('[data-testid="add-service"], button:has-text("Добавить услугу")')
```

## Интеграция с Playwright MCP (Claude Code / Cursor)

### Зачем

Playwright MCP позволяет AI-агенту управлять браузером через естественный язык. Это полезно для:

- **Разведки** — пройти новый сценарий, понять селекторы
- **Генерации** — попросить агента написать action-функцию
- **Отладки** — воспроизвести баг в реальном браузере

### Настройка

1. Скопируй `mcp-playwright.json` в `.claude/mcp.json` или `.cursor/mcp.json` (только секцию `mcpServers`)

2. В Claude Code / Cursor попроси:

   > "Открой http://localhost:5173, залогинься с телефоном +79001112233, перейди в дашборд и создай услугу 'Тестовая стрижка'"

3. Агент выполнит шаги в реальном браузере и может:
   - Сгенерировать YAML-сценарий
   - Написать action-функцию
   - Найти правильные селекторы

### Workflow: от идеи до автотеста

```
1. Описываешь сценарий словами
   ↓
2. Playwright MCP проходит его в браузере (агент видит DOM)
   ↓
3. Агент генерирует YAML-flow + action-функции
   ↓
4. Запускаешь `npx playwright test` — тест зелёный
   ↓
5. Коммитишь в репо
```

## Существующие сценарии (18 штук)

| #   | Сценарий                              | Теги                    | Роли                |
| --- | ------------------------------------- | ----------------------- | ------------------- |
| 1   | Claim салона + онбординг + настройка  | critical-path, p1       | guest, salon_owner  |
| 2   | Мастер → услуга → запись из дашборда  | critical-path, p1       | salon_owner         |
| 3   | Гостевая мульти-услуга запись         | critical-path, p1       | guest               |
| 4   | Жизненный цикл записи (статусы)       | critical-path           | salon_owner         |
| 5   | Отмена записи клиентом                | regression              | salon_owner         |
| 6   | Редактирование записи (перенос)       | regression              | salon_owner         |
| 7   | DnD перенос в календаре               | regression              | salon_owner         |
| 8   | CRUD услуг                            | regression              | salon_owner         |
| 9   | CRM клиенты: CRUD + теги              | regression              | salon_owner         |
| 10  | Инвайт сотрудника → принятие          | regression              | salon_owner, master |
| 11  | Профиль пользователя                  | regression              | client              |
| 12  | Поиск салонов                         | smoke, p0               | guest               |
| 13  | Профиль салона                        | regression              | salon_owner         |
| 14  | Кабинет мастера                       | regression              | master              |
| 15  | Расписание мастера с перерывами       | regression              | salon_owner         |
| 16  | Полный E2E: claim → гостевая запись   | critical-path, full-e2e | salon_owner, guest  |
| 17  | Админ: модерация заявок               | regression              | admin               |
| 18  | Авторизация: логин → refresh → logout | smoke, auth, p0         | client              |

## Приоритеты прогонов

- **P0 / smoke**: авторизация, поиск, claim happy-path, базовая навигация дашборда.
- **P1 / regression**: записи, услуги, CRM, персонал, `/me`, профиль салона, мастер-кабинет.
- **P2 / extended**: full-e2e цепочка, admin moderation, calendar DnD (самые чувствительные к UI-изменениям).

Рекомендуемый порядок запуска:

```bash
npx playwright test --config=e2e/playwright.config.ts -g "Авторизация: логин → refresh → logout"
E2E_TAG=smoke npx playwright test --config=e2e/playwright.config.ts
npx playwright test --config=e2e/playwright.config.ts
```

## TestContext — передача данных между шагами

Шаги в одном flow разделяют `TestContext`:

```typescript
// В action claim.goToDashboard:
ctx.set('salonId', extractedId)

// В action navigation.goto:
const path = ctx.resolve('/salon/{salonId}') // → /salon/abc-123
```

## API Helpers — ускорение тестов

Некоторые шаги можно делать через API вместо UI (быстрее и стабильнее):

```typescript
// Approve claim через API (а не через UI admin-панели)
await api.login(adminPhone)
await api.approveClaim(adminPhone, claimId)
```

Это удобно для preconditions и seed-данных.
