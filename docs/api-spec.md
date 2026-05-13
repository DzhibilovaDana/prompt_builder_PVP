# API спецификация

## Роли и авторизация
- Гость: не авторизован.
- Пользователь: авторизован, работает со своими/доступными workspace prompt.
- Администратор: пользователь с `is_admin=true`, доступ к конфигурации.
- Роли workspace: `owner`, `admin`, `editor`, `viewer`.

## Основные endpoint'ы

### `GET /api/prompts`
- Назначение: список prompt текущего пользователя.
- Auth: требуется авторизация.
- Query DTO: `workspaceId?`, `q?`, `category?`, `tag?`, `limit?`, `offset?`.
- Response DTO: массив prompt-объектов.
- Ошибки: `500`.

### `POST /api/prompts`
- Назначение: создание prompt.
- Auth: требуется авторизация (`401` при отсутствии).
- Request DTO: `{ title, content|prompt, workspaceId?, category?, tags?, metadata? }`.
- Response DTO: созданный prompt, `201`.
- Ошибки: `400`, `401`, `500`.

### `GET /api/prompts/{id}`
- Назначение: получить prompt по id.
- Auth: требуется авторизация (`401`).
- Доступ: только владелец или участник workspace.
- Response DTO: prompt.
- Ошибки: `400`, `401`, `404`, `500`.

### `PUT /api/prompts/{id}`
- Назначение: изменить prompt.
- Auth: требуется авторизация (`401`).
- Доступ: владелец prompt или `owner/admin/editor` workspace.
- Request DTO: `{ title, content|prompt, category?, tags?, metadata? }`.
- Response DTO: обновлённый prompt.
- Ошибки: `400`, `401`, `403`, `404`, `500`.

### `DELETE /api/prompts/{id}`
- Назначение: удалить prompt.
- Auth: требуется авторизация (`401`).
- Доступ: владелец prompt или `owner/admin/editor` workspace.
- Response DTO: `{ ok: true }`.
- Ошибки: `400`, `401`, `403`, `404`, `500`.

### `GET /api/config`
- Назначение: чтение runtime-конфигурации.
- Auth: без ограничений чтения.

### `PUT /api/config`
- Назначение: обновление runtime-конфигурации.
- Auth: только администратор.
- Ошибки: `401`, `403`, `400`.
