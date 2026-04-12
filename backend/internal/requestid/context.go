package requestid

import "context"

type ctxKey string

const (
	headerName             = "X-Request-ID"
	clientHeaderName       = "X-Client-Request-ID"
	clientActionHeaderName = "X-Client-Action"
	contextKeyID           = ctxKey("request_id")
	contextClientID        = ctxKey("client_request_id")
	contextClientAction    = ctxKey("client_action")
)

// HeaderName returns canonical request id header.
func HeaderName() string             { return headerName }
func ClientHeaderName() string       { return clientHeaderName }
func ClientActionHeaderName() string { return clientActionHeaderName }

// WithContext stores request id in context.
func WithContext(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, contextKeyID, id)
}
func WithClientContext(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, contextClientID, id)
}
func WithClientActionContext(ctx context.Context, action string) context.Context {
	return context.WithValue(ctx, contextClientAction, action)
}

// FromContext retrieves request id from context.
func FromContext(ctx context.Context) string {
	v, _ := ctx.Value(contextKeyID).(string)
	return v
}
func ClientFromContext(ctx context.Context) string {
	v, _ := ctx.Value(contextClientID).(string)
	return v
}
func ClientActionFromContext(ctx context.Context) string {
	v, _ := ctx.Value(contextClientAction).(string)
	return v
}
