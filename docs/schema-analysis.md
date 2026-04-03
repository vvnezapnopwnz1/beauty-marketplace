# Анализ схемы PostgreSQL

> Контекст: [postgresql_schema_entities plan](../postgresql_schema_entities_ca34e703.plan.md)  
> Обновлено: апрель 2026

---

## Что сделано правильно

- **`external_source + external_id` вместо хранения данных 2GIS** — единственно верный подход, соответствует лицензии API
- **`uuid` везде** — нет проблем при будущем шардировании или внешних интеграциях
- **`price_cents bigint`** — float для денег нельзя, это правильно
- **`staff_id` nullable в `appointments`** — MVP-friendly, не ломает продукт до появления мультимастерного UI
- **`user_telegram_identities` отдельной таблицей** — не ломает `users`, гибко на будущее
- **`salon_subscriptions` отдельно** — правильно вынесено, а не флаг на `salons`

---

## Решения по открытым вопросам

### `day_of_week` — конвенция

**Решение:** ISO 8601 — `1=Пн, 2=Вт, ... 7=Вс`

Go-функция `time.Weekday()` даёт `0=Sun`, поэтому нужна явная конверсия:
```go
// isoWeekday: 1=Mon ... 7=Sun
func isoWeekday(t time.Time) int {
    wd := int(t.Weekday()) // 0=Sun
    if wd == 0 {
        return 7
    }
    return wd
}
```

Зафиксировать в комментарии к таблице и в коде — не переизобретать каждый раз.

### Защита от двойного бронирования

**Решение для MVP:** транзакция + `SELECT FOR UPDATE`

```sql
BEGIN;
SELECT id FROM appointments
WHERE salon_id = $1
  AND staff_id = $2
  AND status NOT IN ('cancelled_by_client', 'cancelled_by_salon')
  AND tstzrange(starts_at, ends_at) && tstzrange($3, $4)
FOR UPDATE;
-- если есть строки — откатить, вернуть 409
-- иначе — INSERT
COMMIT;
```

`EXCLUDE USING gist` — оставить на пост-MVP: требует расширения `btree_gist`, сложнее тестировать.

### Самозанятые мастера

**Решение:** расширить `salons` полем `business_type`, не плодить отдельную таблицу.

```sql
ALTER TABLE salons ADD COLUMN business_type text NOT NULL DEFAULT 'venue'
  CHECK (business_type IN ('venue', 'individual'));

-- external_id теперь nullable
ALTER TABLE salons ALTER COLUMN external_id DROP NOT NULL;

-- Ограничение: у venue внешний ID обязателен
ALTER TABLE salons ADD CONSTRAINT salons_external_id_required
  CHECK (business_type = 'individual' OR external_id IS NOT NULL);
```

---

## Чего не хватает в схеме

### `otp_codes` — необходима для Auth

```sql
CREATE TABLE otp_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL,
  used       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_lookup ON otp_codes (phone_e164, used, expires_at);
```

Очистка: удалять строки старше 1 часа при каждом запросе или крон-задачей.

### `notification_log` — идемпотентность Telegram

```sql
CREATE TABLE notification_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id),
  channel        text NOT NULL,   -- 'telegram'
  template       text NOT NULL,   -- 'booking_confirmed', 'reminder_24h'
  sent_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_notification_log_dedup
  ON notification_log (appointment_id, channel, template);
```

Без этой таблицы при рестарте сервиса легко отправить напоминание дважды.

---

## Итоговый порядок миграций

| Файл | Содержимое |
|------|-----------|
| `001_core.sql` | `users`, `salons` (с `business_type`), `salon_members`, `staff`, `services`, `working_hours` |
| `002_bookings.sql` | `appointments`, `otp_codes`, `notification_log` |
| `003_subscriptions.sql` | `salon_subscriptions`, `user_telegram_identities` |
| `004_reviews.sql` | `reviews` — после MVP |
| `005_waitlist.sql` | `waitlist_entries` — после MVP |

---

## Что намеренно не кладём в БД

- Данные из 2GIS API (нарушение лицензии) — только `external_source + external_id`
- OTP-коды старше 1 часа — чистить, не накапливать
- Координаты салонов — всегда из 2GIS реалтайм
