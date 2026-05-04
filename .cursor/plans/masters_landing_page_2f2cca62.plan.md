---
name: Masters landing page
overview: Добавить публичную страницу-лендинг «для мастеров» с единым нарративом про Кабинет мастера, мягким визуалом без фото людей (иллюстративные карточки с абстрактным UI), новым маршрутом и точкой входа из шапки.
todos:
  - id: routes-app
    content: Добавить ROUTES.FOR_MASTERS, маршрут в App.tsx, опционально document.title
    status: pending
  - id: page-ui
    content: "Создать pages/for-masters: ForMastersPage + секции + mock-компоненты (мягкие карточки UI)"
    status: pending
  - id: nav-i18n
    content: Пункт NavBar + ключи ru/en для forMasters и nav.forMasters
    status: pending
  - id: vault-status
    content: Обновить docs/vault/product/status.md после готовности
    status: pending
  - id: verify
    content: npm run lint && npm run build в frontend
    status: pending
isProject: false
---

# Лендинг для мастеров (структура и имплементация)

## Продуктовые рамки

- **Один сценарий:** везде говорим только о **Кабинете мастера** на платформе; приглашения в салоны и личная практика — как части одного кабинета, без отдельных веток hero/контента.
- **Визуал:** пастельный фон страницы, крупные скругления ([`createAppTheme.ts`](frontend/src/shared/theme/createAppTheme.ts) уже задаёт `shape.borderRadius: 14`; для лендинга локально усилить до **20–24px** на карточках), лёгкие тени или только border (`useBrandColors` из [`NavBar.tsx`](frontend/src/shared/ui/Navbar/NavBar.tsx) / [`palettes.ts`](frontend/src/shared/theme/palettes.ts)). **Без фотографий людей** — только **стилизованные «мини-макеты» интерфейса**: блок «сайдбар + контент», фальш-таблица, полоска календаря, чипы статусов — на `Box`/`Stack`/`Typography`, без подключения реальных виджетов [`MasterDashboardPage.tsx`](frontend/src/pages/master-dashboard/ui/MasterDashboardPage.tsx) (чтобы не тянуть RTK, `X-Salon-Id`, авторизацию).

## Информационная структура страницы (сверху вниз)

1. **Hero** — заголовок + 1–2 строки ценности (записи, клиенты, услуги, уведомления, публичный профиль, приглашения — одним потоком); primary CTA **«Войти»** → [`ROUTES.LOGIN`](frontend/src/shared/config/routes.ts), secondary **«Узнать возможности»** → якорь `#features`.
2. **Якорное меню (опционально, sticky на desktop)** — Features / Как начать / Вопросы — для длинной прокрутки.
3. **#features — сетка карточек (6–8)** — каждая: заголовок, 1 строка пользы, **вложенный UI-mock** (фиксированная высота превью ~160–220px). Тематики, согласованные с реальным продуктом ([`product/status.md`](docs/vault/product/status.md)): записи и календарь, личные и салонные визиты в одном списке, клиенты, услуги, профиль, приглашения в салоны, уведомления, публичная страница мастера, вход по OTP/Telegram (кратко, без перегруза юридикой).
4. **Как начать (3 шага)** — войти по телефону → открыть кабинет → (при появлении) принять приглашение или вести клиентов самостоятельно; без ветвления «соло/салон».
5. **FAQ (4–6)** — про один кабинет, приглашения, видимость для клиентов маркетплейса, данные.
6. **Финальный CTA** — повтор кнопки входа; при желании вторичная ссылка на [`ROUTES.JOIN`](frontend/src/shared/config/routes.ts) только как «У вас салон? Добавьте заведение» (одна строка, не конкурирует с основным сообщением).

**Честность по фичам:** только то, что уже есть или формулировки уровня «уведомления в приложении»; roadmap-обещания — отдельный короткий блок только если продукт явно захочет публичный roadmap (можно отложить post-v1).

## Техническая имплементация

| Шаг                | Действие                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Константа маршрута | В [`routes.ts`](frontend/src/shared/config/routes.ts) добавить, например, `FOR_MASTERS: '/for-masters'` (не конфликтует с [`ROUTES.MASTER`](frontend/src/shared/config/routes.ts) `/master/:id`).                                                                                                                                                                                                  |
| Страница FSD       | Новый слайс страницы: `frontend/src/pages/for-masters/ui/ForMastersPage.tsx` + декомпозиция в той же папке: `HeroSection.tsx`, `FeaturesSection.tsx`, `HowItWorksSection.tsx`, `FaqSection.tsx`, `CtaFooterSection.tsx`, подпапка `mocks/` с презентационными компонентами вроде `MockAppointmentList.tsx`, `MockCalendarStrip.tsx` (только верстка). При необходимости `index.ts` для реэкспорта. |
| Роут               | В [`App.tsx`](frontend/src/app/App.tsx): `<Route path={ROUTES.FOR_MASTERS} element={<ForMastersPage />} />` (публичный маршрут, без `RequireAuth`).                                                                                                                                                                                                                                                |
| Оболочка страницы  | Как у [`JoinPage.tsx`](frontend/src/pages/join/ui/JoinPage.tsx): `<Box minHeight="100vh" bgcolor="background.default">` + [`NavBar`](frontend/src/shared/ui/Navbar/NavBar.tsx); контент в `Container maxWidth="lg"` с вертикальными отступами.                                                                                                                                                     |
| Навигация          | В [`NavBar.tsx`](frontend/src/shared/ui/Navbar/NavBar.tsx) добавить пункт в массив ссылок (рядом с «Для бизнеса»): переход на `ROUTES.FOR_MASTERS`; подписи вынести в i18n.                                                                                                                                                                                                                        |
| i18n               | Ключи в [`ru.json`](frontend/src/shared/i18n/locales/ru.json) / [`en.json`](frontend/src/shared/i18n/locales/en.json) под префикс `forMasters.*` (hero, feature titles/bodies, faq, cta) + `nav.forMasters` для шапки.                                                                                                                                                                             |
| Типографика        | Hero: согласовать с брендом — как на Join, `Fraunces` для H1 через `sx` или `theme`.                                                                                                                                                                                                                                                                                                               |
| a11y               | Иерархия `h1` → `h2`; декоративные mock-контейнеры с `aria-hidden` где внутри нет смысла для скринридеров.                                                                                                                                                                                                                                                                                         |
| SEO (минимум)      | В `ForMastersPage` в `useEffect` выставить `document.title` и при необходимости meta description через простой `querySelector` или отложить до появления react-helmet-async в проекте.                                                                                                                                                                                                             |

## Визуальные детали mock-карточек (чтобы было «как интерфейс», но мягко)

- Внешняя **Card/Paper**: `bgcolor: background.paper`, `border: 1px solid` на базе `colors.border`, `borderRadius: 24`, лёгкий `boxShadow` или без тени.
- Внутри: двухколоночный макет 72px «сайдбар» + контент с нейтральными `grey.200`/`action.hover` полосками как строки таблицы; **плейсхолдер-текст** латиницей или нейтральные подписи («Услуга», «14:00») — не копировать реальные копирайты из дашборда.
- Акцентные акценты — `colors.accent` точечно (чип «Новая запись», активный пункт меню).

## Документация и проверки

- После мержа: блок «Последние изменения» в [`docs/vault/product/status.md`](docs/vault/product/status.md) (новый публичный URL и цель страницы).
- Проверки: `cd frontend && npm run lint` и `npm run build` ([`AGENTS.md`](AGENTS.md)).

## Зависимости

- Новых npm-пакетов не требуется.
