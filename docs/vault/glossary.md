---
title: Глоссарий (RU / EN)
updated: 2026-04-24
source_of_truth: true
code_pointers: []
---

# Глоссарий

| Термин | Значение |
|--------|----------|
| **salon_master** | Членство мастера в салоне (мост); может быть `pending` / `active` / `inactive`; связь с `master_profiles` и услугами через `salon_master_services`. |
| **master_profile** | Глобальный профиль мастера; `user_id` nullable до OTP claim (**shadow**). |
| **guest booking** | Запись без регистрации: имя + `guest_phone_e164`. |
| **appointment_line_item** | Строка снимка услуги внутри одного визита (мульти-услуга); цена и длительность на момент записи. |
| **salon_client** | CRM-запись клиента внутри салона; теги, история визитов, merge guest→user. |
| **shadow profile** | `master_profiles` без `user_id`, созданный салоном; при входе по OTP с тем же телефоном — claim. |
| **slot_duration_minutes** | Шаг сетки слотов салона (15–240 мин). |
| **salon_external_ids** | Связь нашего `salons.id` с внешним ID (напр. 2GIS) + `meta` JSONB. |
| **PlacesProvider** | Интерфейс гео-каталога; единственная реализация — 2GIS `CatalogAdapter`. |
| **unified search** | `GET /api/v1/search`: матчинг наших салонов с выдачей 2GIS + fallback. |
| **dual-mode salon page** | `/salon/:uuid` (платформа) и `/place/:externalId` (витрина 2GIS + redirect). |
| **DashboardService** | Публичный фасад; реализация разбита на `dashboard_*.go`. |
| **FSD** | Feature-Sliced Design: `app`, `pages`, `features`, `entities`, `shared`. |
| **salon_type** | Тип заведения для фильтра категорий услуг в форме. |
| **service_categories** | Справочник slug услуг (системный + задел под кастом салона). |
| **Fx** | `uber/fx` — DI-контейнер и lifecycle на бэкенде. |
