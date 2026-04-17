# 2GIS Catalog API 3.0: Complete technical reference

The 2GIS Catalog API 3.0 (at `catalog.api.2gis.com`) exposes **42+ query parameters** on its primary `/3.0/items` search endpoint, supports comma-separated multi-rubric filtering, and returns rating/review data only when explicitly requested via the `fields` parameter. This report covers every documented parameter, the rubric hierarchy system, response field mechanics, and pagination/rate limits — with specific attention to beauty-industry use cases in Russia.

## Search parameters: 42 ways to filter before results arrive

The primary endpoint `GET https://catalog.api.2gis.com/3.0/items` accepts a single required parameter (`key`) and dozens of optional filters. Every request needs an API key; beyond that, the engine is flexible.

**Text and type filtering.** The `q` parameter accepts 1–500 characters of free text — company names, categories, phone numbers, even website URLs. It is optional if you supply a `rubric_id`, `building_id`, or `org_id` instead. The `type` parameter restricts results to specific object types (comma-separated): `branch` for company locations, `building`, `street`, `station`, `station.metro`, `attraction`, `parking`, `adm_div` (with subtypes like `adm_div.city`, `adm_div.district`, `adm_div.region`), `road`, `route`, `crossroad`, `gate`, and `coordinates`. For business searches, **`type=branch` is the key value**.

**Six sort modes** are available via the `sort` parameter:

- `relevance` (default) — blends name match, popularity, rating, location, and advertising
- `distance` — ascending distance from `location` or `point`
- `rating` — descending by rating score
- `flamp_rating` — descending by Flamp platform rating specifically
- `creation_time` — descending by branch creation date
- `name` — alphabetical ascending

**Geographic filtering** offers three mutually exclusive spatial methods. **Circle search** uses `point=lon,lat` with `radius` (0–40,000 meters when `q` is present; 0–2,000 meters without). Alternatively, `lon` and `lat` can be passed separately with `radius`. **Bounding box** uses `point1=lon,lat` (upper-left) and `point2=lon,lat` (lower-right), with a 2 km diagonal limit unless `q` is supplied. **Polygon search** accepts WKT format via `polygon=POLYGON((…))`, limited to roughly 6 km² without a text query. The `location=lon,lat` parameter sets the user's position for relevance ranking without restricting results, while `viewpoint1`/`viewpoint2` define a soft viewport bias. The deprecated `sort_point` still functions but should be replaced with `location`.

**Entity ID filters** allow precision targeting. `region_id` (integer, often required as a fallback geographic constraint), `city_id` (up to 50 comma-separated IDs), `district_id` (up to 50, only with `type=branch`), `building_id` (up to 50), `place_id` (up to 50), `subway` (metro station IDs, up to 50), `org_id` (single organization), and `brand_id` (single brand).

**Boolean quality filters** include `has_photos`, `has_rating`, `has_reviews`, `has_site`, `has_itin`, and `has_trade_license` — each accepts `true` or `false`. There is **no dedicated price filter parameter**, though price-adjacent data may appear in response fields like `booking.offers.price`.

**Temporal filters** are powerful: `work_time` accepts values like `now` (currently open), `mon,17:00`, `today,09:00`, or `fri,alltime` (24-hour on Friday). The `opened_after_date` parameter filters by branch opening date in `YYYY-MM-DD` format.

**Dynamic attribute filters** use the pattern `attr[<code>]=<value>`. Available attribute codes are discoverable by adding `fields=filters` to any search request and inspecting `result.filters.attributes`. Flag-type attributes take boolean values (`attr[food_service_business_lunch]=true`); range-type attributes take comma-separated min/max integers (`attr[food_service_capacity]=10,30`). Multiple attribute filters can be combined; results must match all conditions.

**Search behavior tuning** includes `search_type` (default `discovery`; alternatives: `one_branch` for deduplicated results, `indoor` for in-building searches, `ads` for advertising-only results), `search_nearby` (boolean, heavily weights proximity), `search_is_query_text_complete` (disables prefix matching), `search_input_method` (keyboard, voice, etc.), and `search_territory_of_interest` (WKT MULTIPOLYGON for soft geographic penalization). The `locale` parameter controls language (e.g., `ru_RU`, `en_AE`, `kk_KZ`).

## The rubric system is two-tiered and lives in a separate API

There is **no `/3.0/rubrics` endpoint**. Rubric discovery uses the **Categories API v2.0** at `catalog.api.2gis.com/2.0/catalog/rubric/`, with three sub-endpoints: `/search` (text search for categories), `/list` (enumerate categories by parent), and `/get` (retrieve a specific category). Rubric IDs discovered here are then passed to the Places API v3.0 via `rubric_id`.

The hierarchy has exactly **two levels**: parent categories called `general_rubric` (broad business areas) and child categories called `rubric` (specific business types). Each rubric object contains `id`, `name`, `alias`, `parent_id`, `type`, `branch_count`, and `org_count`. To discover the full tree, call `/2.0/catalog/rubric/list?region_id=32&parent_id=0` for top-level parents, then drill down with the parent's ID.

### Beauty and salon rubric IDs for Russia

The parent rubric for all beauty businesses is **ID `110543`** ("Красота" / Beauty). Its confirmed child rubrics, extracted from live 2gis.ru URL patterns and consistent across Russian cities:

| Rubric ID | Russian name | English equivalent |
|-----------|-------------|-------------------|
| **305** | Парикмахерские | Hair salons |
| **652** | Салоны красоты / Косметолог | Beauty salons / Cosmetology |
| **5603** | Ногтевые студии | Nail studios |
| **110998** | Барбершопы | Barbershops |
| **56759** | СПА-салоны | Spa centers |
| **110816** | Эпиляция | Epilation / Hair removal |
| **651** | Солярии / Студии загара | Tanning salons |
| **110355** | Оформление бровей и ресниц | Eyebrow & eyelash services |
| **58858** | Визажисты | Makeup artists |

Rubric 652 is notably broad — it covers both "Салоны красоты" and "Косметолог" searches. Additional beauty-adjacent categories (massage salons, permanent makeup, beauty training) can be discovered via the Categories API with `parent_id=110543`.

**Using `rubric_id` in queries.** The parameter accepts **multiple comma-separated integers**: `rubric_id=305,652,5603,110998`. All rubrics in a single request must belong to the same region. A geographic constraint (`region_id`, `point`+`radius`, `city_id`, etc.) is required when filtering by rubric. Example query for all beauty businesses within 1 km of central Moscow:

```
GET https://catalog.api.2gis.com/3.0/items?rubric_id=305,652,5603,110998,56759&point=37.624186,55.754285&radius=1000&type=branch&fields=items.reviews,items.schedule,items.point,items.rubrics&key=YOUR_KEY
```

## Response fields: minimal by default, rich on request

The API returns only **`id`, `name`, `type`, `address_name`, and `address_comment`** by default. Everything else must be explicitly requested through the `fields` parameter — and this is the same mechanism for both list search (`/3.0/items`) and detail lookup (`/3.0/items/byid`). There is **no inherent difference** in available fields between the two endpoints.

**Rating and reviews** require `fields=items.reviews`. This returns `rating` (overall score, e.g. "4.73"), `review_count` (total reviews), `general_rating`, `org_rating`, `recommendation_count`, `is_reviewable`, and per-tag breakdowns. Only statistical aggregates are available — **review text is not accessible** through the Places API. The `has_rating=true` and `has_reviews=true` query parameters filter upstream; `sort=rating` orders results by score.

**Photos are not returned as URLs.** No `items.photos` field exists. The boolean flag `flags.photos` (via `fields=items.flags`) indicates whether a place has photos, and `has_photos=true` filters for them, but actual photo URLs are not exposed in either list or detail responses. Only promotional/advertising images appear via `external_content[].main_photo_url`.

**Contact information** (`items.contact_groups`) — phone numbers, emails, websites — **requires a paid API key permission** beyond the standard subscription. The field returns structured contact objects with `type` (phone/email/website), `value`, `comment`, and per-contact-group schedules.

Other requestable fields include `items.point` (coordinates), `items.schedule` (working hours by day with `from`/`to` times, `is_24x7` flag), `items.rubrics` (category assignments with `id`, `name`, `parent_id`), `items.org` (parent organization), `items.brand`, `items.full_address_name` (address with city), `items.adm_div` (administrative hierarchy), `items.geometry.*` (centroid, hover, selection geometries), `items.name_ex` (legal name, short name), `items.dates` (creation/update timestamps), `items.description`, `items.flags`, `items.attribute_groups`, `items.booking`, and `items.delivery`.

Several fields require additional paid permissions: `items.contact_groups`, `items.floors`, `items.floor_plans`, `items.employees_org_count`, `items.itin`, `items.trade_license`, `items.structure_info.*`, and government code fields (`items.fias_code`, `items.fns_code`, `items.okato`, `items.oktmo`).

## Pagination caps at 50 per page, rate limits depend on key tier

Pagination is **page-number based**, not cursor-based. Two parameters control it: `page` (integer, range **1–1,000,000**, default 1) and `page_size` (integer, range **1–50**, default 20). Every response includes `result.total` with the full count of matching objects.

**Demo key restrictions are severe.** The free demo key (valid one month, 1,000 total requests per service) limits `page_size` to **10** and `page` to **5** — meaning a maximum of **50 accessible results**. Paid keys unlock the full `page_size=50` and `page` up to 1,000,000.

**Rate limits** are not published as specific per-second thresholds for the cloud API. The on-premise deployment documentation mentions **100 requests per minute** per key as an example. Cloud subscriptions enforce **monthly request quotas** — when exceeded, the API key is suspended until the next billing cycle. Additional quota can be purchased mid-cycle. Subscriptions are available in 1-month, 6-month, or 1-year terms, with pricing in the Platform Manager at `platform.2gis.ru`.

**Lookup endpoints** beyond the main search include `/3.0/items/byid` (up to **100 comma-separated IDs** per request, no geographic constraint needed), `/3.0/items/byphone`, `/3.0/items/bysite`, `/3.0/items/byitin`, `/3.0/items/bytradelicense`, and `/3.0/items/byfias` — the latter five requiring paid add-on permissions.

## Conclusion

The 2GIS Catalog API is more powerful than its documentation initially suggests. The `fields` parameter is the central design choice — it makes every response lean by default but highly customizable. For beauty-industry data collection, the combination of `rubric_id=305,652,5603,110998,56759` with `type=branch`, geographic bounds, and `fields=items.reviews,items.schedule,items.point,items.rubrics` captures the most useful data in a single request. The critical constraint is that **photo URLs and contact details are either unavailable or paywalled**, and the demo key's 50-result ceiling makes it unsuitable for any real data gathering. Dynamic attribute filters (`attr[<code>]`) and the `work_time=now` filter add unexpected depth, while the separate Categories API v2.0 for rubric discovery is an architectural quirk worth noting — plan to call it first to confirm rubric IDs before building item queries.