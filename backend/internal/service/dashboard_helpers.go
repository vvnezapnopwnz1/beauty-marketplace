package service

import (
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/beauty-marketplace/backend/internal/infrastructure/persistence/model"
)

var phoneDashRe = regexp.MustCompile(`^\+7\d{10}$`)

func normalizePhoneE164Ptr(phone *string) *string {
	if phone == nil {
		return nil
	}
	p := strings.TrimSpace(*phone)
	if p == "" {
		return nil
	}
	p = strings.ReplaceAll(p, " ", "")
	p = strings.ReplaceAll(p, "-", "")
	if strings.HasPrefix(p, "8") && len(p) == 11 {
		p = "+7" + p[1:]
	}
	if phoneDashRe.MatchString(p) {
		return &p
	}
	return nil
}

func masterProfileLiteFrom(mp *model.MasterProfile) *MasterProfileLite {
	if mp == nil {
		return nil
	}
	specs := make([]string, len(mp.Specializations))
	copy(specs, []string(mp.Specializations))
	return &MasterProfileLite{
		ID:              mp.ID,
		Bio:             mp.Bio,
		Specializations: specs,
		AvatarURL:       mp.AvatarURL,
		YearsExperience: mp.YearsExperience,
		OwnedByUser:     mp.UserID != nil,
	}
}

func normalizeTimeStr(s string) string {
	if len(s) == 5 && s[2] == ':' {
		return s + ":00"
	}
	return s
}

func normalizeBreakPair(a, b *string) (*string, *string) {
	if a == nil || b == nil {
		return nil, nil
	}
	if trimSpace(*a) == "" || trimSpace(*b) == "" {
		return nil, nil
	}
	as := normalizeTimeStr(trimSpace(*a))
	bs := normalizeTimeStr(trimSpace(*b))
	return &as, &bs
}

func dedupeUUIDs(ids []uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{})
	var out []uuid.UUID
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].String() < out[j].String() })
	return out
}

func clockToMinutes(s string) int {
	s = normalizeTimeStr(trimSpace(s))
	t, err := time.Parse("15:04:05", s)
	if err != nil {
		t, _ = time.Parse("15:04", s)
	}
	return t.Hour()*60 + t.Minute()
}

func breakOverlapMinutes(openMin, closeMin int, bStart, bEnd *string) int {
	if bStart == nil || bEnd == nil {
		return 0
	}
	bs := clockToMinutes(*bStart)
	be := clockToMinutes(*bEnd)
	if be <= bs {
		return 0
	}
	start := bs
	if openMin > start {
		start = openMin
	}
	end := be
	if closeMin < end {
		end = closeMin
	}
	if end <= start {
		return 0
	}
	return end - start
}

func mondayStart(loc *time.Location, t time.Time) time.Time {
	t = t.In(loc)
	wd := int(t.Weekday())
	fromMon := (wd + 6) % 7
	return time.Date(t.Year(), t.Month(), t.Day()-fromMon, 0, 0, 0, 0, loc)
}

func dayBoundsInTZ(loc *time.Location, t time.Time) (startUTC, endUTC time.Time) {
	local := t.In(loc)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, loc)
	end := start.Add(24 * time.Hour)
	return start.UTC(), end.UTC()
}
