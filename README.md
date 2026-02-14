# Prompt Builder PVP

Веб-приложение на Next.js для сборки «золотых промптов» через визуальный конструктор: пользователь выбирает роль, формат, индустрию, параметры и получает готовый структурированный prompt для LLM.

## Vision и Mission

- **Vision:** сделать качественные промпты повторяемыми и доступными для любой роли в команде, чтобы снизить зависимость от индивидуальной экспертизы.
- **Mission:** дать быстрый и понятный конструктор, который помогает собрать рабочий промпт за минуты, сохранить удачные варианты и стандартизировать практики внутри команды.

## Scope по User Story Map: MVP vs MUP

### MVP (в текущем репозитории)

- Конструктор промптов на главной странице.
- Выбор формата и индустрии из API-конфигов.
- Динамические поля (основные, дополнительные, подопции) для настройки prompt.
- Генерация итогового текста prompt и копирование.
- Локальное избранное для сохранения удачных prompt-вариантов.
- Простая админ-страница для редактирования конфигурации.

### MUP (следующий продуктовый этап)

- Авторизация и командные workspace.
- Хранение prompt-шаблонов и избранного в БД (вместо только localStorage).
- Версионирование шаблонов и аудит изменений.
- Интеграции с LLM API (в т.ч. прямой запуск prompt из UI).
- Метрики качества prompt (оценка, сравнение, A/B).

## Структура репозитория

- `src/app/` — страницы и роутинг Next.js App Router.
- `src/app/api/` — API endpoints (`config`, `formats`, `industries`).
- `src/components/` — UI-компоненты и рендереры полей конструктора.
- `src/hooks/` — клиентская логика состояния и генерации prompt.
- `src/lib/` — типы, константы, утилиты и шаблоны prompt.
- `src/data/` — JSON-конфигурации форматов/настроек.
- `public/` — статические ассеты.
- `.github/workflows/` — CI workflow.
- `db/` *(планируется)* — миграции/инициализация БД.
- `diagrams/` — архитектурные схемы.
- `scripts/` *(планируется)* — вспомогательные скрипты.


## Требования к окружению

- Node.js **20.x** (рекомендовано для локального запуска и CI).
- npm **10+**.
- Docker (опционально, для контейнерного запуска).

## Быстрый старт

### 1) Установка зависимостей

```bash
npm ci
```

### 2) Запуск локальной разработки

```bash
npm run dev
```

- Приложение доступно на `http://localhost:3000`.
- API роуты доступны по префиксу `http://localhost:3000/api/*`.

### 3) Инициализация локальной SQLite БД

В текущей версии используется локальная SQLite БД `data/db.sqlite` и скрипт инициализации:

```bash
npm run db:init
```

Для следующего этапа (MUP) можно мигрировать на Prisma + PostgreSQL:

```bash
npx prisma migrate dev
```

### 4) Основные команды

```bash
npm run lint   # eslint
npm run build  # production build
npm start      # запуск production-сервера
```


## Backend API (Phase 2)


Добавлены API-эндпоинты для хранения промптов и генерации ответа:

- `GET /api/prompts` — список сохранённых промптов.
- `POST /api/prompts` — создать промпт (`title`, `content`).
- `GET /api/prompts/:id` — получить промпт по id.
- `DELETE /api/prompts/:id` — удалить промпт.
- `POST /api/generate` — генерация ответа по prompt.
  - Если задан `OPENAI_API_KEY`, выполняется запрос к OpenAI Responses API.
  - Если ключа нет, возвращается mock-ответ для офлайн-демо.

Примеры:

```bash
# Инициализация локального хранилища
npm run db:init

# Создание промпта
curl -X POST http://localhost:3000/api/prompts \
  -H "Content-Type: application/json" \
  -d '{"title":"Demo","content":"Сформируй план MVP"}'

# Список промптов
curl http://localhost:3000/api/prompts

# Генерация (mock или OpenAI)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Составь краткий roadmap релиза"}'
```

## Переменные окружения

Для локального запуска обязательных переменных окружения нет (кроме случаев, когда нужен реальный вызов OpenAI API).

Рекомендуемые переменные:

- `OPENAI_API_KEY` — ключ API модели (если не задан, `/api/generate` работает в mock-режиме).
- `DATABASE_URL` — путь/URL к БД для следующего этапа (Prisma + PostgreSQL migration).


## Архитектура

Архитектурные диаграммы добавлены в каталог `diagrams/`:

- C4 L1 (Context): `diagrams/c4-context.mmd`
- C4 L2 (Container): `diagrams/c4-container.mmd`
- C4 L3 (Component, API): `diagrams/c4-component.mmd`
- Deployment (инфраструктурный вид): `diagrams/deployment.mmd`

Также добавлен чеклист соответствия критериям: `docs/compliance-checklist.md`.

## Docker

Сборка образа:

```bash
docker build -t prompt-builder .
```

Запуск контейнера:

```bash
docker run --rm -p 3000:3000 prompt-builder
```

Либо через docker compose (с volume для сохранения `data/db.sqlite`):

```bash
docker compose up --build
```

После запуска приложение будет доступно на `http://localhost:3000`.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`.

Pipeline выполняет:

1. `npm ci`
2. `npm run lint`
3. `npm run build`

Цель — гарантировать, что линтер и production-сборка остаются зелёными на каждом push/PR.


## Изменения, внесенные для MVP
### UI / Frontend
#### 1) Избранное (Favorites)
**Что сделано:** офлайн-режим + синхронизация с сервером + нормализация id.  
**Где:**
- `src/hooks/useFavorites.ts` — основная логика:
  - загрузка с `/api/prompts`, fallback на `localStorage`;
  - автосинк локальных промптов на сервер при восстановлении связи;
  - удаление на сервере только для серверных id.

#### 2) Веса экспертов
**Что сделано:** веса сохраняются и корректно попадают в итоговый промпт (с краткой инструкцией для LLM).  
**Где:**
- `src/hooks/usePromptBuilder.ts`
  - добавлены `expertWeights`, `setExpertWeight`;
  - обновлены `setExperts`, `buildRolePrompt` (подстановка `{{weight}}`, сортировка по весу, аккуратная формулировка роли).

#### 3) Поделиться (Share)
**Что сделано:** кнопка «Поделиться» всегда даёт валидную ссылку:
- если промпт локальный → сначала сохраняется на сервер → потом копируется ссылка;
- если серверный → сразу копируется ссылка.  
**Где:**
- `src/components/FavoritesList.tsx` — добавлена пропса `onShareFavorite`.
- `src/components/PromptBuilderClient.tsx` — реализован `handleShareFavorite`.

#### 4) Регистрация / Авторизация
**Что сделано:** добавлены пользователи и сессии (cookie `pb_session`), привязка промптов к пользователю.  
**Где:**
- `src/lib/userStore.ts` — логика пользователей/сессий (scrypt + salt).
- API:
  - `src/app/api/auth/register/route.ts`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/auth/me/route.ts`
- UI:
  - `src/app/auth/register/page.tsx`
  - `src/app/auth/login/page.tsx`

#### 5) Промпты на сервере + привязка к user
**Что сделано:** `GET /api/prompts` возвращает промпты текущего пользователя, `POST` сохраняет с `user_id`.  
**Где:**
- `src/lib/promptStore.ts` — таблицы `users`, `sessions`, поле `user_id` у `prompts`.
- `src/app/api/prompts/route.ts` — учёт user при `GET/POST`.
- `src/app/api/prompts/[id]/route.ts` — проверка прав при удалении приватных промптов.

#### 6) Header: переходы к регистрации/входу
**Что сделано:** на главной появляются ссылки **Войти** / **Регистрация** или имя + **Выйти**.  
**Где:**
- `src/components/Header.tsx` — клиентский, запрашивает `/api/auth/me`, logout через `/api/auth/logout`.
.

### API / Backend / CI
- `src/app/api/generate/route.ts`  
  — POST `/api/generate`: поддержка `providers: []` (мульти-провайдерный режим) и старого `model`-flow; режим деградации.

- `src/lib/inference.ts`  
  — mock-адаптеры провайдеров (openai/claude/local) для демонстрации.

- `src/app/api/prompts/route.ts` и `src/app/api/prompts/[id]/route.ts`  
  — GET/POST/DELETE для избранного; API возвращает объекты в форме `{ id, title, prompt, createdAt }`.

### Прочее
- `src/app/page.tsx` — теперь server component: `readConfig()` на сервере и передача `config` в `PromptBuilderClient`.
- Мелкие исправления доступности, disabled-атрибутов, keyboard-ux.
