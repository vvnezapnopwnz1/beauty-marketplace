# План: привести Obsidian-vault в оптимальную форму для связки Claude + Obsidian

## Context

Сейчас в проекте два параллельных слоя документации, которые мешают Claude Code работать предсказуемо:

1. **Монолиты** `docs/architecture.md` (818 строк), `docs/context.md` (277), `docs/status.md` (487) — старые, полные, ими пользовались до vault'а.
2. **Vault** `docs/vault/` — новый, разбит по темам (`architecture/overview|backend|db-schema|api-flows|frontend`, `product-context`, `dev-status`), есть Mermaid-диаграммы, wikilinks, собственный CLAUDE.md с Session Protocol.

**Почему это плохо для Claude:**

- Root `CLAUDE.md` → `AGENTS.md`, ни один из них не знает про vault. При старте сессии Claude Code не увидит vault автоматически.
- Два источника правды → при обновлении Claude не знает что трогать, возникают рассинхроны.
- Wikilinks `[[architecture/backend]]` не разрешаются Claude'ом в пути (работают только в Obsidian runtime).
- Vault-файлы краткие («summary»), а полные данные — в монолитах. Claude читает vault и теряет контекст.
- Нет code-map (указателей в реальный код), ADR, runbooks, glossary — всё то, что экономит Claude токены и прогулы.
- Мусор: `docs/vault/frontend/src/` пустой, `.excalidraw` и `.html` диаграммы болтаются в `docs/` без линков из vault.
- `docs/plans/` и `docs/entities/` не интегрированы в vault — Claude в них не придёт сам.

**Цель:** сделать vault единственной точкой входа, синхронной с кодом, с явными указателями «где что лежит», чтобы при любой сессии Claude знал: прочитал `docs/vault/README.md` — получил карту проекта.

## Решения (согласованы с пользователем)

- **Vault — основа**, монолиты архивируем в `docs/archive/` с пометкой «устарел, см. vault».
- **Скоуп:** в vault переезжают только `plans/` и `entities/`. `analysis/` и `design/` остаются снаружи как маркетинг/резерч-архив.
- **Новые слои:** code-map, runbooks, ADR, glossary.

## Итоговая структура vault

```
docs/vault/
├── README.md                          ← MOC (Map of Content), точка входа
├── CLAUDE.md                          ← Session Protocol (остаётся)
├── architecture/
│   ├── overview.md
│   ├── backend.md
│   ├── db-schema.md
│   ├── api-flows.md
│   ├── frontend.md
│   └── code-map.md                    ← НОВОЕ: таблица концепция → файл в коде
├── product/
│   ├── context.md                     ← расширенный (перенос из docs/context.md)
│   └── status.md                      ← расширенный (перенос из docs/status.md)
├── entities/                          ← перенос из docs/entities/
│   ├── appointment-statuses.md
│   ├── dashboard-i18n.md
│   ├── entity-prototype.md
│   ├── master-profiles-salon-masters.md
│   ├── plan-unified-search.md
│   └── service-categories.md
├── plans/                             ← перенос из docs/plans/
│   └── ...
├── adr/                               ← НОВОЕ
│   ├── 0001-no-2gis-db-cache.md
│   ├── 0002-fsd-architecture-frontend.md
│   ├── 0003-uber-fx-for-di.md
│   ├── 0004-jwt-auth-with-otp.md
│   └── 0005-salon-master-vs-master-profile.md
├── runbooks/                          ← НОВОЕ
│   ├── add-db-migration.md
│   ├── add-dashboard-endpoint.md
│   ├── add-frontend-feature-fsd.md
│   └── session-end-update-status.md
└── glossary.md                        ← НОВОЕ: RU/EN терминология
```

## План работ (по фазам)

### Фаза 1. Entry-point и автозагрузка

**Критично:** Claude Code автоматически читает только `CLAUDE.md` в корне и в директориях, в которые заходит. Сейчас vault невидим.

1. Обновить **root** `CLAUDE.md` — добавить жирный блок: «Перед любой задачей прочитай `docs/vault/README.md` (MOC) и `docs/vault/dev-status.md` (текущие приоритеты)».
2. Обновить **`AGENTS.md`** — добавить секцию «7) Documentation Contract»: vault — единственный источник правды, монолиты архивированы.
3. Создать **`docs/vault/README.md`** — MOC со всеми заметками + one-liner к каждой + fresh-date.

**Критичные файлы:**
- [CLAUDE.md](CLAUDE.md) — корневой
- [AGENTS.md](AGENTS.md)
- `docs/vault/README.md` — новый

### Фаза 2. Перенос и архивация монолитов

4. Создать `docs/archive/` и переместить:
   - `docs/architecture.md` → `docs/archive/architecture-monolith-2026-04-21.md`
   - `docs/context.md` → `docs/archive/context-monolith-2026-04-21.md`
   - `docs/status.md` → `docs/archive/status-monolith-2026-04-21.md`
   - В каждом сверху добавить баннер: `> **УСТАРЕЛО.** Актуальная версия: docs/vault/...` 
5. Расширить vault-файлы, слив недостающие детали из монолитов:
   - `docs/vault/product/context.md` ← тело из `docs/context.md` (рынок, монетизация, стратегия запуска)
   - `docs/vault/product/status.md` ← тело из `docs/status.md` (детальная история изменений, полный список эндпоинтов)
   - `docs/vault/architecture/backend.md` — сверить, добавить недостающее из `docs/architecture.md` секций 1–4 (дерево проекта, сущности)
6. Переименовать текущие `docs/vault/product-context.md` и `docs/vault/dev-status.md` в `docs/vault/product/context.md` и `docs/vault/product/status.md` (или оставить на месте и удалить product/ — выбрать консистентно; план — переносим в `product/`).
7. Удалить пустой `docs/vault/frontend/src/`.

### Фаза 3. Перенос plans и entities

8. `git mv docs/plans docs/vault/plans` (сохраняем историю git).
9. `git mv docs/entities docs/vault/entities` — переименовать файлы в kebab-case.
10. Из MOC (`README.md`) добавить ссылки на каждый plan и entity.
11. Найти все внутренние ссылки на `docs/plans/` и `docs/entities/` в коде/документации (grep `docs/plans`, `docs/entities`) — обновить. В `docs/status.md`/`context.md` не трогать, они уже в archive.

### Фаза 4. Новые слои

12. **Code-map** `docs/vault/architecture/code-map.md` — таблица «концепция → путь в коде»:
    ```
    | Концепция         | Источник правды (backend)                          | Источник правды (frontend) |
    |-------------------|----------------------------------------------------|-----------------------------|
    | OTP-аутентификация | backend/internal/service/auth.go                  | frontend/src/features/auth-by-phone/ |
    | Расчёт слотов     | backend/internal/service/booking.go (GetAvailableSlots) | frontend/src/features/guest-booking/ui/PublicSlotPicker.tsx |
    | State machine appointment | backend/internal/service/dashboard_appointment.go | frontend/src/entities/appointment/ |
    | Палитра дашборда  | —                                                  | frontend/src/shared/theme/dashboardPalette.ts |
    | 2GIS адаптер      | backend/internal/infrastructure/twogis/            | — |
    | DI-граф           | backend/internal/app/app.go                        | — |
    | Redux store       | —                                                  | frontend/src/app/store.ts |
    | Роуты бэкенда     | backend/internal/controller/server.go              | — |
    | Роуты фронта      | —                                                  | frontend/src/app/App.tsx |
    ```
    Источник для заполнения: `docs/vault/architecture/backend.md`, `frontend.md`, реальный `backend/internal/app/app.go`, `frontend/src/app/App.tsx`.

13. **Glossary** `docs/vault/glossary.md`:
    - `salon_master` — bridge-запись между салоном и мастером (shadow, может быть без `master_id`)
    - `master_profile` — глобальный профиль мастера с user_id
    - `guest booking` — запись без регистрации, через telephone
    - `appointment_line_item` — снапшот услуг на момент бронирования (мультисервис)
    - `salon_client` — CRM-запись клиента внутри салона
    - `shadow profile` — профиль мастера без user_id, создан салоном; при OTP claim-ится
    - `slot_duration_minutes` — шаг сетки слотов в салоне
    - и т.д. (~15–20 терминов)

14. **ADR** — вытащить из монолитов и AGENTS.md неявные решения:
    - `adr/0001-no-2gis-db-cache.md` (лицензия 2GIS)
    - `adr/0002-fsd-architecture-frontend.md`
    - `adr/0003-uber-fx-for-di.md`
    - `adr/0004-jwt-plus-otp-for-auth.md`
    - `adr/0005-salon-master-bridge-entity.md`
    - Формат ADR: контекст / решение / последствия / альтернативы.

15. **Runbooks:**
    - `runbooks/add-db-migration.md` — как завести новую миграцию (именование `000017_...`, структура up/down, обязательный seed если enum)
    - `runbooks/add-dashboard-endpoint.md` — repo → service → controller → fx-регистрация → frontend api-client
    - `runbooks/add-frontend-feature-fsd.md` — где класть feature/entity/widget по FSD
    - `runbooks/session-end-update-status.md` — как обновить `product/status.md` при завершении сессии (обязательный чеклист)

### Фаза 5. Линки и фронтматтер

16. Во всех файлах vault к wikilinks `[[x]]` добавить параллельный markdown-линк `[x](x.md)` — чтобы Claude мог следовать за ссылкой без Obsidian runtime. Пример: `[[architecture/backend]] ([backend.md](architecture/backend.md))`.
17. Добавить в каждый vault-файл фронтматтер:
    ```yaml
    ---
    title: ...
    updated: 2026-04-24
    source_of_truth: true | mirror
    code_pointers:
      - backend/internal/service/auth.go
    ---
    ```
    `code_pointers` — критичная фишка: Claude сразу видит, где код. Obsidian рендерит фронтматтер корректно.

18. В `docs/vault/CLAUDE.md` обновить Session Protocol:
    ```
    At start: read README.md (MOC) + product/status.md
    When implementing: check architecture/code-map.md → открыть нужный code pointer
    When changing behavior: найти/обновить связанный ADR, если решение изменилось
    At end: обновить product/status.md раздел "Последние изменения" с датой
    ```

### Фаза 6. Проверка

19. `grep -r "docs/architecture.md\|docs/context.md\|docs/status.md\|docs/plans/\|docs/entities/"` — обновить все ссылки (в коде, в оставшихся docs).
20. Открыть `docs/vault/` в Obsidian как vault — убедиться что граф связный, нет сирот.
21. Симуляция свежей Claude-сессии: прочитать только `CLAUDE.md` корень → перейти по ссылкам. Проверить что за 3 перехода можно добраться до любой заметки и до исходного кода через code-map.

## Критичные файлы для модификации

- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/CLAUDE.md` — корневой, добавить указание на vault
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/AGENTS.md` — добавить Documentation Contract
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/vault/CLAUDE.md` — Session Protocol v2
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/vault/README.md` — НОВЫЙ MOC
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/vault/architecture/code-map.md` — НОВЫЙ
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/vault/glossary.md` — НОВЫЙ
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/vault/adr/*` — НОВЫЙ каталог
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/vault/runbooks/*` — НОВЫЙ каталог
- `/Users/vvnezapnopwnz/Documents/Files/beauty-marketplace/docs/vault/product/context.md`, `product/status.md` — расширение из монолитов

## Существующее, что переиспользуем

- `docs/vault/CLAUDE.md` — хорошая структура Session Protocol, расширяем
- `docs/vault/architecture/*.md` — отличные Mermaid-диаграммы, оставляем как есть, только фронтматтер добавляем
- `docs/architecture.md` §1–4 — сущности с таблицами полей, переливаем в `entities/`
- `docs/status.md` — детальная история изменений, переливаем в `product/status.md`
- `docs/plans/*`, `docs/entities/*` — перемещаем целиком

## Верификация

1. **Сценарий «новая Claude-сессия»:**
   - Открыть свежий чат в проекте, дать задачу: «Добавь endpoint `/api/v1/dashboard/analytics`».
   - Ожидание: Claude прочитает root `CLAUDE.md` → `docs/vault/README.md` → `runbooks/add-dashboard-endpoint.md` → `architecture/code-map.md` (найдёт `backend/internal/app/app.go`, `controller/dashboard_controller.go`). Не должен лезть в архив.

2. **Сценарий «Obsidian navigation»:**
   - Открыть `docs/vault/` в Obsidian.
   - На Graph View — все узлы связаны, нет orphan'ов (кроме archive/).
   - Backlinks на любом entity-файле показывают, где он упомянут.

3. **Сценарий «обновление статуса»:**
   - Перед commit-ом закрыть цикл: `product/status.md` обновлён датой `2026-04-24`, со ссылкой на новую ADR если решение неочевидное.

4. **Smoke-проверки:**
   - `grep -r "docs/architecture.md" --exclude-dir=archive .` → 0 попаданий в актуальном коде
   - `find docs/vault -name "*.md" | xargs grep -L "^---"` → 0 (все файлы с frontmatter)
   - Все `code_pointers` во фронтматтере указывают на существующие файлы: автоматический скрипт-чекер (можно добавить в Makefile: `make docs-check`).

## Что НЕ делаем в этом заходе

- Не переписываем `docs/analysis/` и `docs/design/` — они остаются вне vault как research/marketing-архив.
- Не трогаем `docs/vault/frontend/src/` если решим удалить vault-копию кода — просто удаляем пустую папку.
- Не автоматизируем генерацию Mermaid из кода (отдельная задача).
- Не меняем `.cursor/rules/*` — Cursor-специфика, отдельный контур.

## Оценка объёма

- Фаза 1 (entry-point): 15 минут — 3 файла
- Фаза 2 (архивация + слияние): 45 минут — перенос + merge
- Фаза 3 (plans/entities): 10 минут — git mv + README updates
- Фаза 4 (новые слои): 1.5–2 часа — code-map, 5 ADR, 4 runbook, glossary. Это содержательная работа.
- Фаза 5 (линки/frontmatter): 30 минут — скриптом/поштучно
- Фаза 6 (проверка): 15 минут

**Итого:** ~3.5–4 часа чистой работы.
