### Следующие приоритеты по порядку

1. OTP через Telegram (Трек 3, ~1 день)
   Минимальная реализация: интерфейс OTPSender в service/auth.go, реализация TelegramOTPSender в infrastructure/telegram/, env TELEGRAM_BOT_TOKEN. Юзер при регистрации получает сообщение от бота.
2. Seed реальных московских салонов (~0.5 дня)
   Скрипт cmd/seed/main.go — читает JSON из Apify-скрейпа (или прямой запрос к 2GIS Catalog API), вставляет в salons + salon_external_ids. Makefile-команда make seed-moscow. После этого поиск начинает возвращать платформенные салоны.
3. Production деплой (Трек 3)
   VPS + Docker Compose (уже есть Dockerfile-ы), NGINX reverse proxy, Let's Encrypt, env через .env.production. Без деплоя нельзя показать продукт первым потенциальным клиентам-салонам.
4. Оставшиеся задачи трека 4 (после деплоя)
   Zoom + Resize + Конфликты — полезные UX-улучшения, но не блокеры для первого онбординга.
