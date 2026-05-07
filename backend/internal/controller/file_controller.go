package controller

import (
	"fmt"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/beauty-marketplace/backend/internal/service"
	"go.uber.org/zap"
)

type FileController struct {
	storage service.FileStorage
	log     *zap.Logger
}

func NewFileController(storage service.FileStorage, log *zap.Logger) *FileController {
	return &FileController{storage: storage, log: log}
}

type uploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	Type     string `json:"type"`
}

// UploadFile handles file uploads for chat attachments
func (h *FileController) UploadFile(w http.ResponseWriter, r *http.Request) {
	// Limit request size to 10MB
	r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)

	// Parse multipart form (max 32MB memory)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "no file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file
	if err := service.ValidateUploadedFile(header); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Detect MIME type
	buffer := make([]byte, 512)
	if _, err := file.Read(buffer); err != nil {
		http.Error(w, "failed to read file", http.StatusInternalServerError)
		return
	}
	if _, err := file.Seek(0, 0); err != nil {
		http.Error(w, "failed to seek file", http.StatusInternalServerError)
		return
	}

	mimeType := http.DetectContentType(buffer)
	if !strings.HasPrefix(mimeType, "image/") {
		http.Error(w, "only image files are allowed", http.StatusBadRequest)
		return
	}

	// Store file
	filename, err := h.storage.StoreFileFromReader(r.Context(), header.Filename, file, mimeType)
	if err != nil {
		h.log.Error("failed to store file", zap.Error(err))
		http.Error(w, "failed to store file", http.StatusInternalServerError)
		return
	}

	response := uploadResponse{
		URL:      h.storage.GetFileURL(filename),
		Filename: filename,
		Size:     header.Size,
		Type:     mimeType,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, `{"url":"%s","filename":"%s","size":%d,"type":"%s"}`,
		response.URL, response.Filename, response.Size, response.Type)
}

// ServeFile serves uploaded files
func (h *FileController) ServeFile(w http.ResponseWriter, r *http.Request) {
	filename := r.PathValue("filename")
	if filename == "" {
		http.Error(w, "filename required", http.StatusBadRequest)
		return
	}

	// Security: prevent directory traversal
	if strings.Contains(filename, "..") || strings.HasPrefix(filename, "/") {
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}

	// For local storage, we need to serve from the filesystem
	// This is a simplified implementation - in production you'd use a proper file server
	if localStorage, ok := h.storage.(*service.LocalFileStorage); ok {
		fullPath := filepath.Join(localStorage.BasePath(), filename)

		// Detect MIME type
		mimeType := mime.TypeByExtension(filepath.Ext(filename))
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		w.Header().Set("Content-Type", mimeType)
		w.Header().Set("Cache-Control", "public, max-age=31536000") // 1 year cache

		http.ServeFile(w, r, fullPath)
		return
	}

	// For other storage types, redirect to the stored URL
	url := h.storage.GetFileURL(filename)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// DeleteFile handles file deletion (auth required)
func (h *FileController) DeleteFile(w http.ResponseWriter, r *http.Request) {
	filename := r.PathValue("filename")
	if filename == "" {
		http.Error(w, "filename required", http.StatusBadRequest)
		return
	}

	// Security: prevent directory traversal
	if strings.Contains(filename, "..") || strings.HasPrefix(filename, "/") {
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}

	if err := h.storage.DeleteFile(r.Context(), filename); err != nil {
		h.log.Error("failed to delete file", zap.String("filename", filename), zap.Error(err))
		http.Error(w, "failed to delete file", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
