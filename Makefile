.PHONY: up down logs logs-vector ps restart smoke-logs diagnose rebuild

up:
	@docker compose up -d --build

down:
	@docker compose down

# Полная пересборка образов (если подозреваешь устаревший фронт/бэкенд в кэше Docker)
rebuild:
	docker compose build --no-cache frontend backend
	docker compose up -d

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

smoke-logs:
	@curl -fsS "http://localhost:8080/api/v1/search?category=hair&lat=55.7558&lon=37.6176&page_size=5" >/dev/null && \
	echo "Generated backend + 2GIS log chain. Open http://localhost:5080 and filter by component."
