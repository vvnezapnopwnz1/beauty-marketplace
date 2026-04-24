.PHONY: up down logs logs-vector ps restart smoke-logs diagnose rebuild backend-local backend-local-no-seed db-migrate seed-salon-page-dev vault-update docs-check

up:
	@docker compose up -d --build

down:
	@docker compose down

# Полная пересборка образов (если подозреваешь устаревший фронт/бэкенд в кэше Docker)
rebuild:
	docker compose build --no-cache frontend backend
	docker compose up -d

# Накат SQL-миграций (нужен CLI: https://github.com/golang-migrate/migrate).
# После git pull или свежей БД выполни один раз перед `make backend-local`.
# DSN как у бэкенда: `DATABASE_DSN='...' make db-migrate`
db-migrate:
	@migrate -path backend/migrations -database "$${DATABASE_DSN:-postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable}" up

# Точечный seed для проверки SalonPage dual-mode сценариев:
# - /salon/11111111-1111-1111-1111-111111111111
# - /place/141373143068690 (redirect -> /salon/22222222-2222-2222-2222-222222222222)
seed-salon-page-dev:
	@if command -v psql >/dev/null 2>&1; then \
		psql "$${DATABASE_DSN:-postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable}" -f backend/migrations/dev_seed_salon_place.sql; \
	else \
		echo "psql not found locally, using docker compose exec postgres..."; \
		docker compose exec -T postgres psql -U beauty -d beauty < backend/migrations/dev_seed_salon_place.sql; \
	fi

# Бэкенд на хосте (без Docker). Важно: cwd = backend/, иначе godotenv не найдёт ../.env с ключами.
# БД: подними postgres отдельно, напр. `docker compose up -d postgres` → localhost:5433.
# Сначала накатываются миграции (те же DSN), иначе seed упадёт на отсутствующих колонках.
# В корневом `.env` задай TWO_GIS_API_KEY (имена вида 2GIS_* в shell экспортировать нельзя — см. config.go).
# Переопределить DSN: `DATABASE_DSN='...' make backend-local`
backend-local: db-migrate
	@cd backend && \
	HTTP_ADDR=:8080 \
	LOG_LEVEL=development \
	DEV_DEMO_SEED=1 \
	DEV_OTP_BYPASS=1 \
	DATABASE_DSN="$${DATABASE_DSN:-postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable}" \
	go run ./cmd/api

# Бэкенд на хосте без автосида devseed (для проверки точечного SQL seed-а).
backend-local-no-seed: db-migrate
	@cd backend && \
	HTTP_ADDR=:8080 \
	LOG_LEVEL=development \
	DEV_DEMO_SEED=0 \
	DEV_OTP_BYPASS=1 \
	DATABASE_DSN="$${DATABASE_DSN:-postgres://beauty:beauty@127.0.0.1:5433/beauty?sslmode=disable}" \
	go run ./cmd/api

# Проверка, что бэкенд отвечает (в т.ч. reverse geocode)
diagnose:
	@echo "GET /api/v1/geo/reverse (первые 300 байт ответа):"
	@curl -sS "http://localhost:8080/api/v1/geo/reverse?lat=55.7558&lon=37.6176" | head -c 300 || echo "(curl failed — backend не слушает :8080?)"
	@echo ""

logs:
	@docker compose logs -f backend

logs-vector:
	@docker compose logs -f vector

ps:
	@docker compose ps

restart:
	@docker compose restart backend frontend

# Обновить Mermaid-диаграммы в docs/vault/ после крупных изменений.
# Запускай после: рефакторинга моделей, новых роутов, изменений DI-графа.
# Требует Claude Code CLI (claude).
# Проверка: нет ссылок на старые пути docs/architecture.md, docs/plans/, docs/entities/ вне archive.
docs-check:
	@stale=$$(grep -rE 'docs/(architecture|context|status)\.md' --include='*.md' --include='*.go' --include='*.ts' --include='*.tsx' . 2>/dev/null | grep -v './docs/archive/' | grep -v './noble-wiggling-barto.md' | grep -v './.cursor/plans/archive/' || true); \
	if [ -n "$$stale" ]; then echo "$$stale"; echo "docs-check: FAIL (stale monolith paths)"; exit 1; fi
	@stale2=$$(grep -rE 'docs/plans/|docs/entities/' --include='*.md' --include='*.go' --include='*.ts' --include='*.tsx' . 2>/dev/null | grep -v './docs/archive/' | grep -v './noble-wiggling-barto.md' | grep -v './.cursor/plans/archive/' || true); \
	if [ -n "$$stale2" ]; then echo "$$stale2"; echo "docs-check: FAIL (use docs/vault/entities and docs/archive for old plans)"; exit 1; fi
	@echo "docs-check OK"

vault-update:
	@echo "Обновляю vault-диаграммы..."
	@claude --print "Прочитай docs/vault/architecture/ и сравни с текущим кодом. \
	Обнови только те диаграммы которые устарели: \
	backend/internal/infrastructure/persistence/model/models.go → db-schema.md, \
	backend/internal/app/app.go → backend.md (DI-граф), \
	backend/internal/controller/server.go → api-flows.md и backend.md (роуты). \
	Не трогай frontend.md если не менялся frontend/src/."
	@echo "Готово. Открой Obsidian и обнови граф (Ctrl+R)."

smoke-logs:
	@curl -fsS "http://localhost:8080/api/v1/search?category=hair&lat=55.7558&lon=37.6176&page_size=5" >/dev/null && \
	echo "Generated backend + 2GIS log chain. Open http://localhost:5080 and filter by component."
