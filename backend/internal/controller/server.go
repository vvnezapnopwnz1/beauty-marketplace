package controller

import (
	"bytes"
	"context"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/beauty-marketplace/internal/auth"
	"github.com/yourusername/beauty-marketplace/internal/config"
	"github.com/yourusername/beauty-marketplace/internal/requestid"
	"go.uber.org/fx"
	"go.uber.org/zap"
)

// NewHTTPServer wires routes and manages the HTTP server lifecycle.
func NewHTTPServer(
	lc fx.Lifecycle,
	cfg *config.Config,
	log *zap.Logger,
	jwtMgr *auth.JWTManager,
	hh *HealthController,
	sh *SalonController,
	ph *PlacesController,
	sch *SearchController,
	gh *GeoController,
	ac *AuthController,
	dh *DashboardController,
	mh *MasterController,
	md *MasterDashboardController,
	uh *UserController,
) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", hh.Health)

	// Public API
	mux.HandleFunc("/api/v1/salons", sh.ListSalons)
	mux.HandleFunc("/api/v1/salons/", sh.SalonRoutes)
	mux.HandleFunc("/api/v1/masters/", mh.MasterRoutes)
	mux.HandleFunc("/api/v1/places/search", ph.SearchPlaces)
	mux.HandleFunc("GET /api/v1/places/item/{id}", ph.GetPlaceByID)
	mux.HandleFunc("GET /api/v1/search", sch.Search)
	mux.HandleFunc("GET /api/v1/geo/region", gh.ResolveRegion)
	mux.HandleFunc("GET /api/v1/geo/cities", gh.SearchCities)
	mux.HandleFunc("GET /api/v1/geo/reverse", gh.ReverseGeocode)

	// Auth (public)
	mux.HandleFunc("/api/auth/otp/request", withCORS(ac.RequestOTP))
	mux.HandleFunc("/api/auth/otp/verify", withCORS(ac.VerifyOTP))
	mux.HandleFunc("/api/auth/refresh", withCORS(ac.Refresh))

	// Auth (protected)
	mux.HandleFunc("/api/auth/me", withCORS(auth.RequireAuth(jwtMgr, ac.Me)))
	mux.HandleFunc("/api/auth/logout", withCORS(auth.RequireAuth(jwtMgr, ac.Logout)))

	mux.HandleFunc("/api/v1/dashboard/", withCORS(auth.RequireAuth(jwtMgr, dh.DashboardRoutes)))
	mux.HandleFunc("/api/v1/master-dashboard/", withCORS(auth.RequireAuth(jwtMgr, md.MasterDashboardRoutes)))
	mux.HandleFunc("/api/v1/me", withCORS(auth.RequireAuth(jwtMgr, uh.MeRoutes)))
	mux.HandleFunc("/api/v1/me/", withCORS(auth.RequireAuth(jwtMgr, uh.MeRoutes)))

	// Admin-only example
	// mux.HandleFunc("/api/admin/...", withCORS(auth.RequireRole(jwtMgr, adminHandler, "admin")))

	srv := &http.Server{
		Addr:    cfg.HTTPAddr,
		Handler: corsMiddleware(withRequestID(withAccessLog(log, mux))),
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			go func() {
				log.Info("http listening", zap.String("addr", cfg.HTTPAddr))
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					log.Error("http server stopped", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return srv.Shutdown(ctx)
		},
	})

	return srv
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimSpace(r.Header.Get(requestid.HeaderName()))
		if id == "" {
			id = uuid.NewString()
		}
		clientID := strings.TrimSpace(r.Header.Get(requestid.ClientHeaderName()))
		clientAction := strings.TrimSpace(r.Header.Get(requestid.ClientActionHeaderName()))
		w.Header().Set(requestid.HeaderName(), id)
		ctx := requestid.WithContext(r.Context(), id)
		if clientID != "" {
			ctx = requestid.WithClientContext(ctx, clientID)
		}
		if clientAction != "" {
			ctx = requestid.WithClientActionContext(ctx, clientAction)
		}
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

const maxHTTPRequestBodyLogBytes = 8192

// httpBodySnap buffers the first maxHTTPRequestBodyLogBytes of the request body for access logs
// while io.TeeReader passes the full stream to the handler.
type httpBodySnap struct {
	buf bytes.Buffer
}

func (s *httpBodySnap) Write(p []byte) (int, error) {
	if s.buf.Len() >= maxHTTPRequestBodyLogBytes {
		return len(p), nil
	}
	space := maxHTTPRequestBodyLogBytes - s.buf.Len()
	if len(p) > space {
		_, _ = s.buf.Write(p[:space])
	} else {
		_, _ = s.buf.Write(p)
	}
	return len(p), nil
}

type teeReadCloser struct {
	io.Reader
	io.Closer
}

func methodMayHaveBody(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func absoluteRequestURL(r *http.Request) string {
	proto := "http"
	if r.TLS != nil {
		proto = "https"
	}
	if x := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); x != "" {
		parts := strings.Split(x, ",")
		proto = strings.TrimSpace(strings.ToLower(parts[0]))
	}
	host := r.Host
	if x := strings.TrimSpace(r.Header.Get("X-Forwarded-Host")); x != "" {
		parts := strings.Split(x, ",")
		host = strings.TrimSpace(parts[0])
	}
	return proto + "://" + host + r.URL.RequestURI()
}

func withAccessLog(log *zap.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		var bodySnap httpBodySnap
		if r.Body != nil && methodMayHaveBody(r.Method) {
			under := r.Body
			r.Body = teeReadCloser{
				Reader: io.TeeReader(under, &bodySnap),
				Closer: under,
			}
		}

		next.ServeHTTP(rec, r)

		requestID := requestid.FromContext(r.Context())
		clientRequestID := requestid.ClientFromContext(r.Context())
		clientAction := requestid.ClientActionFromContext(r.Context())
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			host = r.RemoteAddr
		}
		clientReqURL := strings.TrimSpace(r.Header.Get("X-Client-Request-URL"))
		fields := []zap.Field{
			zap.String("component", "http_access"),
			zap.String("request_id", requestID),
			zap.String("client_request_id", clientRequestID),
			zap.String("client_action", clientAction),
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.String("query", r.URL.RawQuery),
			zap.String("request_uri", r.URL.RequestURI()),
			zap.String("http_request_url", absoluteRequestURL(r)),
			zap.Int("status", rec.status),
			zap.Int64("duration_ms", time.Since(started).Milliseconds()),
			zap.String("remote_addr", host),
			zap.String("user_agent", r.UserAgent()),
		}
		if clientReqURL != "" {
			fields = append(fields, zap.String("client_request_url", clientReqURL))
		}
		if bodySnap.buf.Len() > 0 {
			fields = append(fields, zap.String("request_body", bodySnap.buf.String()))
		}
		if rec.status >= 500 {
			log.Warn("http request failed", fields...)
			return
		}
		log.Info("http request handled", fields...)
	})
}

func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization, X-Request-ID, X-Client-Request-ID, X-Client-Action, X-Client-Request-URL",
		)
		w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
