Надо создать страницу пользователя после того как он входит в приложение. Создай
там базовые данные и форму: имя, username, телефон и так далее. Нужен базовый crud
на изменение данных. Учитывай что нужны будут роли:

1. гость (вход не нужен, может просматривать публичную сторону салонов и мастеров и записываться онлайн)
2. зарегестрированный пользователь, не владелец салона (то же что и гость но при записи видно данные профиля: имя, фото, телефон и так далее), может просматривать свой профиль
3. Владелец салона (роль: владелец), может менять данные о салоне и все остальное
4. Сотрудник салона (роль: администратор), данные о салоне в профиле менять не может. Управляет записями, мастерами, услугами, календарем и так далее
   Остальные роли и типы профилей продумай сам, наверняка я что то упустил

---

Прогресс по спекам `2026-04-24-user-profile-design.md`:

- [x] Шаг 1: миграция `000018_user_profile`, soft-delete в users, обновление auth `findOrCreateUser`
- [x] Шаг 2: SQL-триггеры пересчета `users.global_role` + backfill + integration test
- [x] Шаг 3: backend `/api/v1/me` GET/PUT + `UserRolesService` + `UserProfileService`
- [x] Шаг 4: backend `/api/v1/me/sessions` (`GET`, `DELETE :id`, `POST revoke-all`) + `user.sessionId` в `VerifyOTP`
- [x] Шаг 5: `DELETE /api/v1/me` (soft-delete + revoke refresh tokens + `has_owned_salons`)
- [x] Шаг 6: frontend `meApi` + `profileSlice` + `/me` route (guard) + `GeneralSection` + `UserMenu`
- [x] Шаг 7: `SecuritySection` (sessions list + revoke + revoke-all)
- [x] Шаг 8: `DangerSection` + `DeleteAccountDialog` + обработка `has_owned_salons`
- [x] Шаг 9: `authSlice.user` переведен на `/api/v1/me`, гейты dashboard/master-dashboard на `effectiveRoles`
- [x] Шаг 10: docs/vault (`entities/user-roles.md`, `product/status.md`, `README.md`) и финализация
