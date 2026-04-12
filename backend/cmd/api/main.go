package main

import (
	"github.com/joho/godotenv"
	"github.com/yourusername/beauty-marketplace/internal/app"
)

func main() {
	// Load repo-root .env when running from backend/ or backend/cmd/api.
	_ = godotenv.Load(".env", "../.env", "../../.env")
	app.New().Run()
}
