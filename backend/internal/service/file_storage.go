package service

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type FileStorage interface {
	StoreFile(ctx context.Context, filename string, content []byte, mimeType string) (string, error)
	StoreFileFromReader(ctx context.Context, filename string, reader io.Reader, mimeType string) (string, error)
	DeleteFile(ctx context.Context, filename string) error
	GetFileURL(filename string) string
}

type LocalFileStorage struct {
	basePath string
	baseURL  string
}

func NewLocalFileStorage(basePath, baseURL string) *LocalFileStorage {
	return &LocalFileStorage{
		basePath: basePath,
		baseURL:  baseURL,
	}
}

func (s *LocalFileStorage) BasePath() string {
	return s.basePath
}

func (s *LocalFileStorage) StoreFile(ctx context.Context, filename string, content []byte, mimeType string) (string, error) {
	// Create directory structure by date: /uploads/chat/2026/05/08/
	now := time.Now()
	datePath := fmt.Sprintf("chat/%d/%02d/%02d", now.Year(), now.Month(), now.Day())
	fullDir := filepath.Join(s.basePath, datePath)

	if err := os.MkdirAll(fullDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(filename)
	uniqueFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	fullPath := filepath.Join(fullDir, uniqueFilename)

	// Write file
	if err := os.WriteFile(fullPath, content, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	// Return relative path for storage in database
	return filepath.Join(datePath, uniqueFilename), nil
}

func (s *LocalFileStorage) StoreFileFromReader(ctx context.Context, filename string, reader io.Reader, mimeType string) (string, error) {
	// Create directory structure by date: /uploads/chat/2026/05/08/
	now := time.Now()
	datePath := fmt.Sprintf("chat/%d/%02d/%02d", now.Year(), now.Month(), now.Day())
	fullDir := filepath.Join(s.basePath, datePath)

	if err := os.MkdirAll(fullDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(filename)
	uniqueFilename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	fullPath := filepath.Join(fullDir, uniqueFilename)

	// Create file
	file, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	// Copy content
	if _, err := io.Copy(file, reader); err != nil {
		os.Remove(fullPath) // Clean up on error
		return "", fmt.Errorf("failed to copy file content: %w", err)
	}

	// Return relative path for storage in database
	return filepath.Join(datePath, uniqueFilename), nil
}

func (s *LocalFileStorage) DeleteFile(ctx context.Context, filename string) error {
	fullPath := filepath.Join(s.basePath, filename)
	return os.Remove(fullPath)
}

func (s *LocalFileStorage) GetFileURL(filename string) string {
	return fmt.Sprintf("%s/%s", strings.TrimSuffix(s.baseURL, "/"), filename)
}

// ValidateUploadedFile validates uploaded file for chat attachments
func ValidateUploadedFile(header *multipart.FileHeader) error {
	// Check file size (max 5MB)
	const maxSize = 5 * 1024 * 1024
	if header.Size > maxSize {
		return fmt.Errorf("file too large: max 5MB allowed")
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}

	if !allowedExts[ext] {
		return fmt.Errorf("file type not allowed: %s", ext)
	}

	return nil
}
