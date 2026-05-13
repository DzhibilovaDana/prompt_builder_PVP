# Схема БД (PostgreSQL)

Ключевые сущности:
- `users`: учётные записи, флаги `is_admin`, `must_change_password`.
- `sessions`: сессии авторизации (`pb_session`).
- `workspaces`: рабочие пространства.
- `workspace_members`: связь many-to-many user/workspace с ролями `owner|admin|editor|viewer`.
- `prompts`: основная сущность prompt, ссылки на `user_id`, `workspace_id`, `tags_json`, `metadata_json`.
- `prompt_versions`: история версий prompt.
- `audit_log`: журнал операций.

Связи и ограничения:
- `prompts.user_id -> users.id` (nullable).
- `prompts.workspace_id -> workspaces.id` (nullable).
- `workspace_members(workspace_id,user_id)` уникален.
- Индексы по `prompts.created_at`, `prompts.user_id`, `prompts.workspace_id`, полнотекстовым полям поиска.
