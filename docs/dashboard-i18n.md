# Dashboard i18n and service category labels

## App strings

- Shared i18n: [`frontend/src/shared/i18n/index.ts`](../frontend/src/shared/i18n/index.ts) — `ru` and `en` resources, `fallbackLng: ru`.
- Browser language is detected via `i18next-browser-languagedetector`; missing keys in `en` fall back to Russian.
- Dashboard copy is being moved under `dashboard.*` (e.g. `dashboard.services` for the services list). Extend the same pattern for other dashboard screens.

## Preset service categories (hair_cuts, nails_manicure, …)

- **Source of truth in DB:** `service_categories.slug` + `name_ru` (see migration `000010_service_categories.up.sql`).
- **List UI:** [`ServicesView`](../frontend/src/pages/dashboard/ui/views/ServicesView.tsx) resolves `category_slug` → display label using `GET /dashboard/service-categories?full=1` (Russian names from the API). Legacy rows without a slug still show the stored `category` text.

### Multilingual category names (future)

| Approach | Pros | Cons |
|----------|------|------|
| **A — DB columns** (`name_en`, …) | One place to edit; API returns the right field by `Accept-Language` or returns all names and the client picks. | Requires migration and API changes. |
| **B — i18n keys** `dashboard.serviceCategories.<slug>` in `en.json` / `ru.json` | No DB change; translators work in JSON. | Duplicates catalog; must stay in sync with migrations. |

Recommendation: **A** for a long-lived product catalog; **B** for a short list or prototypes.

Until one of these is implemented, switching the UI to English changes chrome strings (`dashboard.services.*`) but **category chips and tabs still use Russian names** from the API (`nameRu`).
