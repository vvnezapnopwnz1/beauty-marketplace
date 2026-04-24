package errs

import "errors"

var (
	ErrOTPNotFound          = errors.New("otp code not found or expired")
	ErrOTPInvalid           = errors.New("invalid otp code")
	ErrOTPTooMany           = errors.New("too many otp requests, try later")
	ErrTelegramNotLinked    = errors.New("telegram_not_linked")
	ErrRefreshTokenInvalid  = errors.New("refresh token invalid or expired")
	ErrUserNotFound         = errors.New("user not found")
	ErrAccountDeleted       = errors.New("account_deleted")
	ErrPhoneRequired        = errors.New("phone number is required")
	ErrCodeRequired         = errors.New("otp code is required")
	ErrRefreshTokenRequired = errors.New("refresh token is required")
)
