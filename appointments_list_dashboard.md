Страница записей (MUI DataGrid)
2.1 Проблема
Текущая страница записей (DashboardAppointments.tsx) — это кастомный список карточек с минимальной фильтрацией (4 чипа по периоду: Сегодня/Завтра/Эта неделя/Все + текстовый поиск). На 322 записях уже неудобно:

Нет серверной пагинации — при выборе «Все» грузятся все записи.
Нет сортировки по столбцам.
Нет фильтрации по конкретному мастеру, услуге, статусу прямо в заголовке столбца.
Нет возможности кастомизировать отображаемые колонки.

2.2 Цели

Заменить кастомный список на MUI DataGrid Pro/Premium с серверным режимом (paginationMode="server", filterMode="server", sortingMode="server").
Добавить серверные фильтры по: дате/периоду, статусу, мастеру, услуге, клиенту (имя/телефон).
Добавить серверную сортировку по любому столбцу.
Серверная пагинация (page + page_size, default 25).
Сохранить существующий UX: клик по строке → AppointmentDrawer, кнопки действий в строке.

2.3 User Stories
US-APT-01. Как владелец салона, я хочу видеть записи в табличном формате с заголовками столбцов, чтобы быстро ориентироваться в данных.
US-APT-02. Как владелец салона, я хочу кликнуть по заголовку «Время» и отсортировать записи по времени (по возрастанию/убыванию), чтобы найти ближайшие или последние.
US-APT-03. Как владелец салона, я хочу отфильтровать записи по мастеру через dropdown в столбце, чтобы видеть загрузку конкретного человека.
US-APT-04. Как владелец салона, я хочу отфильтровать записи по статусу (подтверждена, ожидает, завершена, отменена), чтобы быстро найти записи, требующие действий.
US-APT-05. Как владелец салона, я хочу искать записи по имени или телефону клиента, чтобы найти историю конкретного человека.
US-APT-06. Как владелец салона, я хочу переключать страницы и менять количество записей на странице (25/50/100), чтобы контролировать объём данных.
US-APT-07. Как владелец салона, я хочу кликнуть по строке записи и увидеть полные детали в боковом drawer, как сейчас.

2.4 Требования
P0 — Must Have
IDТребованиеAcceptance CriteriaAPT-P0-01MUI DataGrid — замена кастомного спискаDataGrid с columns: Дата/Время, Клиент (имя + телефон), Услуга, Мастер, Статус, Действия; density="comfortable"APT-P0-02Серверная пагинацияpaginationMode="server", rowCount из API; page*size default 25; контролы внизу таблицы; API: GET /appointments?page=1&page_size=25APT-P0-03Серверная сортировкаsortingMode="server"; при клике по заголовку → query param sort_by=starts_at&sort_dir=desc; default: starts_at descAPT-P0-04Фильтр по датеDate range picker (MUI DatePicker × 2) над таблицей; query params from=YYYY-MM-DD&to=YYYY-MM-DD; пресеты: Сегодня, Завтра, Эта неделя, Этот месяц, ВсеAPT-P0-05Фильтр по статусуMulti-select chips или column header filter; query param status=confirmed,pending (через запятую)APT-P0-06Фильтр по мастеруDropdown с salon_masters (из GET /dashboard/salon-masters); query param salon_master_id=<uuid>APT-P0-07Фильтр по услугеDropdown с services (из GET /dashboard/services); query param service_id=<uuid>APT-P0-08Row click → AppointmentDraweronRowClick открывает существующий AppointmentDrawer с данными записи
P1 — Should Have
IDТребованиеAcceptance CriteriaAPT-P1-01Поиск по клиентуInput field; query param search=<text>; бэкенд ищет по guest_name ILIKE и guest_phone_e164 LIKE и users.display_name ILIKEAPT-P1-02Column visibilityКнопка «Столбцы» — MUI DataGrid встроенный column visibility panelAPT-P1-03Toolbar с экспортомGridToolbar — CSV-экспорт текущей страницы (client-side)APT-P1-04Быстрые действия в строкеКолонка «Действия»: иконки Подтвердить / Завершить / Отменить по статусу; PATCH /appointments/:id/statusAPT-P1-05Цветовое кодирование статусаChip в ячейке статуса: confirmed = зелёный, pending = жёлтый, completed = серый, cancelled*\* = красный, no_show = оранжевый
P2 — Future
IDТребованиеAPT-P2-01Сохраняемые пресеты фильтров (наборы фильтров с именем)APT-P2-02Bulk-операции (массовое подтверждение/отмена через чекбоксы)APT-P2-03Server-side CSV/Excel-экспорт всех записейAPT-P2-04Inline-edit ячеек (быстрое изменение мастера/времени прямо в таблице)

2.5 Design Handoff — DataGrid
Columns
СтолбецFieldWidthSortableFilterableRenderДата и времяstartsAt160pxYes (default desc)DateRangePicker (отдельно, над таблицей)DD.MM.YYYY HH:mmКлиентclientLabelflex 1, min 180pxYesText search (над таблицей)Имя + телефон (подстрока)УслугаserviceName200pxYesSelect из servicesТекст, при мульти — tooltip с полным спискомМастерmasterName160pxYesSelect из salon_mastersАватар (инициалы + цвет) + имяСтатусstatus140pxYesMulti-select chipsChip с цветом (см. P1-05)Действия—120pxNoNoИконки-кнопки по статусу
Стилизация

Palette: useDashboardPalette() — фон таблицы, разделители, заголовки
Header: palette.dashboard.surfaceAlt, font-weight 600, uppercase
Row hover: palette.dashboard.hover
Row selected: palette.dashboard.accent alpha 0.08
Alternating rows: subtle difference (surfaceAlt alpha 0.03)
Density: comfortable (52px row height)
Border: palette.dashboard.border

Responsive
BreakpointПоведение> 1200pxВсе столбцы видны768–1200pxСкрыть «Действия» (доступны через drawer), уменьшить ширины< 768pxCard layout вместо таблицы (MUI DataGrid не подходит → fallback на текущий список)

2.6 Backend — Расширение API
GET /api/v1/dashboard/appointments — текущие params: from, to, status, salon_master_id, service_id, page, page_size.
Нужно добавить:
ParamТипОписаниеsort_bystringПоле сортировки: starts_at (default), service_name, master_name, status, client_namesort_dirstringasc или desc (default desc)searchstringПоиск по guest_name, guest_phone_e164, users.display_name (ILIKE %search%)statusstringЧерез запятую: confirmed,pending (расширить от одного значения к нескольким)
Ответ — добавить total (общее число записей для пагинации):
json{
"appointments": [...],
"total": 322,
"page": 1,
"pageSize": 25
}
Файлы для изменений (бэкенд):

backend/internal/infrastructure/persistence/dashboard_repository.go — ListAppointments: добавить ORDER BY dynamic, search ILIKE, multi-status, COUNT(\*) OVER() для total
backend/internal/controller/dashboard_controller.go — парсинг sort_by, sort_dir, search
backend/internal/service/dashboard.go — прокидывание новых params

Безопасность: sort_by — allowlist (starts_at, service_name, status, created_at); не принимать произвольные имена колонок.

2.7 Технические заметки для агента
Файлы для изменений (фронтенд):

frontend/src/pages/dashboard/ui/DashboardAppointments.tsx — полная переработка: MUI DataGrid вместо списка
frontend/src/shared/api/dashboardApi.ts — fetchDashboardAppointments: добавить sort_by, sort_dir, search, multi-status; парсить total из ответа
frontend/src/pages/dashboard/ui/drawers/AppointmentDrawer.tsx — без изменений, переиспользовать as-is

npm:

@mui/x-data-grid
@mui/x-data-grid-premium
@mui/x-date-pickers — для DateRangePicker (проверить наличие)

Стоп-лист:

НЕ менять AppointmentDrawer — только вызывать из DataGrid onRowClick
НЕ менять сигнатуру PUT/PATCH /appointments/:id
Сохранить кнопку «+ Создать запись» — она должна остаться в тулбаре
