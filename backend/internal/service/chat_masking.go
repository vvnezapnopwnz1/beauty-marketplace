package service

import "regexp"

const maskedPlaceholder = "[контакт скрыт]"

var (
	phoneRe = regexp.MustCompile(`(?i)(?:\+?7|8)[\s\-\(\)]*\d{3}[\s\-\(\)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}`)

	messengerURLRe = regexp.MustCompile(`(?i)(https?://)?(t\.me|wa\.me|telegram\.me|api\.whatsapp\.com|instagram\.com|vk\.com|viber\.com)/?[\w\-/.@]*`)
	messengerKwRe  = regexp.MustCompile(`(?i)\b(telegram|whatsapp|вотсап|вацап|viber|вайбер|instagram|инстаграм|инстаграмм|вконтакте)\b`)
	atHandleRe     = regexp.MustCompile(`@[A-Za-z0-9_]{3,}`)
)

// MaskContacts replaces RU phone numbers and messenger references with a placeholder.
// Storage-time masking: original text is never persisted.
func MaskContacts(s string) string {
	if s == "" {
		return s
	}
	s = phoneRe.ReplaceAllString(s, maskedPlaceholder)
	s = messengerURLRe.ReplaceAllString(s, maskedPlaceholder)
	s = messengerKwRe.ReplaceAllString(s, maskedPlaceholder)
	s = atHandleRe.ReplaceAllString(s, maskedPlaceholder)
	return s
}
