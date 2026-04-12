package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

type contextKey string

const (
	ctxUserID   contextKey = "user_id"
	ctxUserRole contextKey = "user_role"
)

func UserIDFromCtx(ctx context.Context) (uuid.UUID, bool) {
	v, ok := ctx.Value(ctxUserID).(uuid.UUID)
	return v, ok
}

func UserRoleFromCtx(ctx context.Context) string {
	v, _ := ctx.Value(ctxUserRole).(string)
	return v
}

// RequireAuth rejects requests without a valid Bearer token.
func RequireAuth(jwtMgr *JWTManager, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := extractClaims(jwtMgr, r)
		if !ok {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		uid, err := uuid.Parse(claims.Subject)
		if err != nil {
			http.Error(w, `{"error":"invalid token subject"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), ctxUserID, uid)
		ctx = context.WithValue(ctx, ctxUserRole, claims.Role)
		next(w, r.WithContext(ctx))
	}
}

// OptionalAuth populates context if a valid token is present but does not reject.
func OptionalAuth(jwtMgr *JWTManager, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := extractClaims(jwtMgr, r)
		if ok {
			if uid, err := uuid.Parse(claims.Subject); err == nil {
				ctx := context.WithValue(r.Context(), ctxUserID, uid)
				ctx = context.WithValue(ctx, ctxUserRole, claims.Role)
				r = r.WithContext(ctx)
			}
		}
		next(w, r)
	}
}

// RequireRole wraps RequireAuth and additionally checks the global role.
func RequireRole(jwtMgr *JWTManager, next http.HandlerFunc, roles ...string) http.HandlerFunc {
	return RequireAuth(jwtMgr, func(w http.ResponseWriter, r *http.Request) {
		role := UserRoleFromCtx(r.Context())
		for _, allowed := range roles {
			if role == allowed {
				next(w, r)
				return
			}
		}
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
	})
}

func extractClaims(jwtMgr *JWTManager, r *http.Request) (*Claims, bool) {
	header := r.Header.Get("Authorization")
	if header == "" {
		return nil, false
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return nil, false
	}
	claims, err := jwtMgr.ValidateToken(parts[1])
	if err != nil {
		return nil, false
	}
	return claims, true
}
