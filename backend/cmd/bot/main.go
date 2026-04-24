package main

import (
	"context"
	"log"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/joho/godotenv"
	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence"
	"github.com/yourusername/beauty-marketplace/internal/infrastructure/persistence/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

func main() {
	_ = godotenv.Load(".env", "../.env", "../../.env")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if cfg.TelegramBotToken == "" {
		log.Fatal("TELEGRAM_BOT_TOKEN is required for bot")
	}

	db, err := gorm.Open(postgres.Open(cfg.DSN), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	})
	if err != nil {
		log.Fatalf("open db: %v", err)
	}

	repo := persistence.NewTelegramLinkRepository(db)
	bot, err := tgbotapi.NewBotAPI(cfg.TelegramBotToken)
	if err != nil {
		log.Fatalf("init telegram bot: %v", err)
	}

	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60
	updates := bot.GetUpdatesChan(u)

	log.Printf("telegram bot started: @%s", bot.Self.UserName)
	for update := range updates {
		if update.Message == nil {
			continue
		}

		if update.Message.Contact != nil {
			phone := normalizePhone(update.Message.Contact.PhoneNumber)
			if phone != "" {
				contact := update.Message.Contact
				var tgID *int64
				if contact.UserID != 0 {
					v := int64(contact.UserID)
					tgID = &v
				}
				var firstName *string
				if strings.TrimSpace(contact.FirstName) != "" {
					v := strings.TrimSpace(contact.FirstName)
					firstName = &v
				}
				if err := repo.Save(context.Background(), &model.TelegramPhoneLink{
					PhoneE164:  phone,
					ChatID:     update.Message.Chat.ID,
					TelegramID: tgID,
					FirstName:  firstName,
					LinkedAt:   time.Now(),
					UpdatedAt:  time.Now(),
				}); err != nil {
					log.Printf("save telegram link failed: %v", err)
				}
			}

			reply := tgbotapi.NewMessage(update.Message.Chat.ID, "✅ Готово! Теперь вы можете входить через Telegram на Beautica.")
			_, _ = bot.Send(reply)
			continue
		}

		if update.Message.IsCommand() && update.Message.Command() == "start" {
			keyboard := tgbotapi.NewReplyKeyboard(
				tgbotapi.NewKeyboardButtonRow(
					tgbotapi.NewKeyboardButtonContact("📱 Поделиться номером"),
				),
			)
			msg := tgbotapi.NewMessage(
				update.Message.Chat.ID,
				"Привет! Поделитесь номером телефона, чтобы привязать Telegram к вашему аккаунту на Beautica.",
			)
			msg.ReplyMarkup = keyboard
			_, _ = bot.Send(msg)
		}
	}
}

func normalizePhone(raw string) string {
	cleaned := ""
	for _, ch := range raw {
		if ch >= '0' && ch <= '9' || ch == '+' {
			cleaned += string(ch)
		}
	}
	if len(cleaned) == 11 && cleaned[0] == '8' {
		cleaned = "+7" + cleaned[1:]
	}
	if len(cleaned) > 0 && cleaned[0] != '+' {
		cleaned = "+" + cleaned
	}
	return cleaned
}
