# Telegram OTP — План реализации

> Статус: черновик | Дата: 2026-04-24  
> Цель: пользователь вводит телефон → выбирает «Получить код в Telegram» → бот присылает 4 цифры → вход

---

## Концепция

Это **не** Telegram Login Widget. Это тот же OTP-флоу что уже есть в коде — просто другой канал доставки:

```
Текущий флоу (не работает):
  Телефон → генерируем OTP → ??? SMS ??? → 4 цифры → JWT

Новый флоу:
  Телефон → генерируем OTP → Telegram бот → 4 цифры → JWT
```

На экране авторизации две кнопки выбора:
- 📱 Получить код по SMS *(пока не реализовано, заглушка)*
- ✈️ Получить код в Telegram

---

## Нужен ли запущенный сервер бота?

**Да.** Для отправки сообщений пользователю бот должен знать его `chat_id`.
Telegram не позволяет слать сообщения по номеру телефона напрямую.

**Как получить `chat_id`:** пользователь один раз открывает бота и нажимает `/start` или делится номером.
После этого телефон → chat_id сохранён в нашей БД и OTP летят мгновенно.

Сам бот-сервер простой — 20-30 строк Go, без heavy-lifting. Webhook или long-polling.

---

## Схема работы

### Шаг 0 — Пользователь один раз линкует Telegram (делается один раз)

```
Пользователь открывает @beautica_bot в Telegram
        │
        ▼
Бот: «Привет! Нажмите кнопку чтобы поделиться номером»
        │
        ▼
Пользователь тапает «📱 Поделиться номером» (встроенная Telegram-кнопка)
        │
        ▼
Бот получает contact { phone_number, user_id, chat_id }
        │
        ▼
Сохраняем в telegram_phone_links: phone_e164 → chat_id
        │
        ▼
Бот: «Готово! Теперь вы можете входить через Telegram на beautica.ru»
```

### Шаг 1 — Вход на сайте

```
Пользователь вводит телефон
        │
        ▼
Выбирает «Получить код в Telegram»
        │
        ▼
POST /api/auth/otp/request { phone, channel: "telegram" }
        │
        ├─ chat_id найден → бот отправляет «Ваш код: 4829» → ✅
        │
        └─ chat_id не найден → 422 { error: "telegram_not_linked",
                                      botUsername: "beautica_bot" }
                                → фронт показывает: «Сначала откройте @beautica_bot»
        │
        ▼
Пользователь вводит 4 цифры
        │
        ▼
POST /api/auth/otp/verify { phone, code }  ← без изменений
        │
        ▼
JWT выдан
```

---

## Что создаём / меняем

### 1. Telegram Bot — создать вручную

1. [@BotFather](https://t.me/BotFather) → `/newbot` → получить **BOT_TOKEN**
2. Сохранить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME` в `.env`
3. Никакого setdomain не нужно — мы не используем Login Widget

### 2. База данных — миграция `000017_telegram_phone_links`

```sql
CREATE TABLE telegram_phone_links (
    phone_e164   TEXT        PRIMARY KEY,
    chat_id      BIGINT      NOT NULL,
    telegram_id  BIGINT,                    -- Telegram user id (опционально)
    first_name   TEXT,                      -- для отображения в логах
    linked_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_phone_links_chat_id ON telegram_phone_links(chat_id);
```

### 3. Go-модель

```go
// backend/internal/infrastructure/persistence/model/models.go
type TelegramPhoneLink struct {
    PhoneE164  string    `gorm:"primaryKey"`
    ChatID     int64     `gorm:"not null"`
    TelegramID *int64
    FirstName  *string
    LinkedAt   time.Time `gorm:"not null"`
    UpdatedAt  time.Time `gorm:"not null"`
}
```

### 4. Интерфейс OTPSender (новый)

```go
// backend/internal/service/otp_sender.go

type OTPSender interface {
    Send(ctx context.Context, phone string, code string) error
    Channel() string // "sms" | "telegram"
}

// Заглушка для SMS (уже фактически есть — только логирует)
type StderrOTPSender struct{ logger *zap.Logger }
func (s *StderrOTPSender) Send(_ context.Context, phone, code string) error {
    s.logger.Info("OTP (dev)", zap.String("phone", phone), zap.String("code", code))
    return nil
}
func (s *StderrOTPSender) Channel() string { return "sms" }

// Telegram-отправщик
type TelegramOTPSender struct {
    botToken  string
    linkRepo  repository.TelegramLinkRepository
    logger    *zap.Logger
}
func (s *TelegramOTPSender) Send(ctx context.Context, phone, code string) error {
    link, err := s.linkRepo.FindByPhone(ctx, phone)
    if err != nil {
        return errs.ErrTelegramNotLinked // → 422 на клиент
    }
    msg := fmt.Sprintf("Ваш код для входа на Beautica: *%s*\n\nНе сообщайте его никому.", code)
    return sendTelegramMessage(ctx, s.botToken, link.ChatID, msg)
}
func (s *TelegramOTPSender) Channel() string { return "telegram" }
```

### 5. Изменение AuthService.RequestOTP

```go
// backend/internal/service/auth.go

// Добавить параметр channel в запрос
type OTPRequestParams struct {
    Phone   string `json:"phone"`
    Channel string `json:"channel"` // "sms" | "telegram", default "sms"
}

func (s *AuthService) RequestOTP(ctx context.Context, params OTPRequestParams) (*OTPRequestResult, error) {
    // ... генерация и сохранение OTP без изменений ...

    sender := s.smsSender // default
    if params.Channel == "telegram" {
        sender = s.telegramSender
    }

    if err := sender.Send(ctx, params.Phone, code); err != nil {
        if errors.Is(err, errs.ErrTelegramNotLinked) {
            return nil, err // контроллер вернёт 422 + botUsername
        }
        return nil, fmt.Errorf("send otp: %w", err)
    }

    return &OTPRequestResult{ExpiresAt: expiresAt}, nil
}
```

### 6. Контроллер — изменить `/api/auth/otp/request`

```go
// Текущий body: { phone }
// Новый body:   { phone, channel? }  — channel опциональный, default "sms"

// При ErrTelegramNotLinked вернуть:
// 422 { "error": "telegram_not_linked", "botUsername": "@beautica_bot" }
```

### 7. Бот-сервер (новый микросервис или модуль)

```go
// backend/cmd/bot/main.go  ← отдельный бинарник

// Инициализация:
bot, _ := tgbotapi.NewBotAPI(os.Getenv("TELEGRAM_BOT_TOKEN"))
bot.Debug = false
u := tgbotapi.NewUpdate(0)
u.Timeout = 60
updates := bot.GetUpdatesChan(u) // long-polling

for update := range updates {
    if update.Message == nil { continue }

    if update.Message.Contact != nil {
        // Пользователь поделился номером
        contact := update.Message.Contact
        phone := normalizePhone(contact.PhoneNumber) // → E.164
        chatID := update.Message.Chat.ID

        // Сохранить в telegram_phone_links
        db.Save(&TelegramPhoneLink{
            PhoneE164:  phone,
            ChatID:     chatID,
            TelegramID: &contact.UserID,
            FirstName:  &contact.FirstName,
        })

        reply := tgbotapi.NewMessage(chatID,
            "✅ Готово! Теперь вы можете входить через Telegram на beautica.ru")
        bot.Send(reply)
        continue
    }

    if update.Message.IsCommand() && update.Message.Command() == "start" {
        keyboard := tgbotapi.NewReplyKeyboard(
            tgbotapi.NewKeyboardButtonRow(
                tgbotapi.NewKeyboardButtonContact("📱 Поделиться номером"),
            ),
        )
        msg := tgbotapi.NewMessage(update.Message.Chat.ID,
            "Привет! Поделитесь номером телефона чтобы привязать Telegram к вашему аккаунту на Beautica.")
        msg.ReplyMarkup = keyboard
        bot.Send(msg)
    }
}
```

**Зависимость:** `github.com/go-telegram-bot-api/telegram-bot-api/v5`

**Запуск в docker-compose:**
```yaml
bot:
  build:
    context: ./backend
    dockerfile: Dockerfile.bot
  environment:
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    - DATABASE_URL=${DATABASE_URL}
  depends_on:
    - postgres
```

### 8. Репозиторий для ссылок

```go
// backend/internal/repository/telegram_link.go
type TelegramLinkRepository interface {
    FindByPhone(ctx context.Context, phone string) (*model.TelegramPhoneLink, error)
    Save(ctx context.Context, link *model.TelegramPhoneLink) error
}
```

### 9. Фронтенд — выбор канала

**Изменение `authApi.ts`:**
```ts
export const requestOTP = (phone: string, channel: 'sms' | 'telegram' = 'sms') =>
  api.post('/api/auth/otp/request', { phone, channel });
```

**Изменение LoginPage / `auth-by-phone` feature:**

```tsx
// Шаг 1 — ввод телефона + выбор канала
<PhoneInput value={phone} onChange={setPhone} />

<ToggleButtonGroup value={channel} exclusive onChange={(_, v) => setChannel(v)}>
  <ToggleButton value="sms">📱 SMS</ToggleButton>
  <ToggleButton value="telegram">✈️ Telegram</ToggleButton>
</ToggleButtonGroup>

<Button onClick={handleRequestOTP}>Получить код</Button>

// Если ошибка telegram_not_linked:
<Alert severity="info">
  Сначала откройте <Link href="https://t.me/beautica_bot">@beautica_bot</Link> и нажмите «Поделиться номером»
</Alert>
```

---

## Порядок реализации

| # | Шаг | Сложность |
|---|-----|-----------|
| 1 | Создать бота в @BotFather, добавить токен в `.env` | ручной шаг |
| 2 | Миграция `000017_telegram_phone_links` | низкая |
| 3 | Go-модель `TelegramPhoneLink` в `models.go` | низкая |
| 4 | `TelegramLinkRepository` + GORM-реализация | низкая |
| 5 | Интерфейс `OTPSender` + рефактор `AuthService` | средняя |
| 6 | `TelegramOTPSender.Send` (вызов Telegram Bot API) | низкая |
| 7 | Изменить `/api/auth/otp/request` — принять `channel` | низкая |
| 8 | Бот-сервер `cmd/bot/main.go` (long-polling + /start + contact) | средняя |
| 9 | `docker-compose` — добавить сервис `bot` | низкая |
| 10 | Фронт: `ToggleButtonGroup` SMS/Telegram + обработка `telegram_not_linked` | низкая |

**Итого:** ~1 день работы агента.

---

## Что НЕ нужно

- ❌ Telegram Login Widget (другой паттерн)
- ❌ HTTPS в dev (бот работает через обычный long-polling)
- ❌ ngrok
- ❌ Менять таблицу `users` или `otp_codes`
- ❌ Новая страница — только UI-изменение существующей формы входа

---

## Открытые вопросы

1. **SMS** — оставить заглушку или подключить провайдера (SMSC, МТС Exolve) параллельно?
2. **Webhook vs long-polling** — для prod лучше webhook (нужен HTTPS-эндпоинт на сервере бота).
3. **Отвязка** — нужна ли кнопка «Отвязать Telegram» в профиле пользователя?
4. **Уведомления** — раз бот уже есть, можно через него же слать напоминания о записях.