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

- Авторизация и командные workspace. ✅
- Хранение prompt-шаблонов и избранного в БД (вместо только localStorage). ✅
- Версионирование шаблонов и аудит изменений. ✅
- Интеграции с LLM API (в т.ч. прямой запуск prompt из UI). ✅
- Метрики качества prompt (оценка, сравнение, A/B). ✅

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
- PostgreSQL **14+** (рекомендуемый основной режим БД).
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

### 3) Инициализация БД (PostgreSQL по умолчанию)

Приложение работает только с PostgreSQL. Перед запуском задайте `DATABASE_URL` и выполните инициализацию схемы:

```bash
export DATABASE_URL=postgresql://prompt_builder:prompt_builder@localhost:5432/prompt_builder
npm run db:init
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
- `PUT /api/prompts/:id` — обновить промпт (создаёт новую версию).
- `DELETE /api/prompts/:id` — удалить промпт.
- `GET /api/prompts/:id/versions` — история версий.
- `POST /api/prompts/:id/versions` — откат к конкретной версии (`versionNo`).
- `GET /api/prompts/:id/metrics` — метрики качества и последние запуски.
- `POST /api/metrics/prompts/:id/score` — ручная оценка качества (`score` 1..5).
- `GET /api/workspaces` — список рабочих пространств пользователя.
- `POST /api/workspaces` — создать workspace.
- `POST /api/workspaces/:id/members` — добавить/обновить участника (role: owner/admin/editor/viewer).
- `GET /api/ab-tests` — список A/B тестов.
- `POST /api/ab-tests` — создать A/B тест с вариантами.
- `POST /api/ab-tests/:id/result` — зафиксировать outcome варианта.
- `POST /api/generate` — генерация ответа по prompt.
  - Поддерживает мульти-провайдерный режим через `providers: []`.
  - Поддерживает внешние ключи через `providerKeys` в JSON body (без сохранения на сервере).
- `GET /api/providers/health` — проверка, какие провайдеры сконфигурированы.
- `POST /api/providers/health` — проверка провайдеров с ключами, переданными в `providerKeys`.

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
  -H "x-api-token: ${PB_API_TOKEN}" \
  -d '{"prompt":"Составь краткий roadmap релиза"}'

# Мульти-провайдерная генерация с внешними ключами (JSON)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"Сделай 5 идей для маркетинга",
    "providers":["chatgpt","deepseek","yandexgpt"],
    "providerKeys":{
      "openaiApiKey":"sk-...",
      "deepseekApiKey":"sk-...",
      "yandexApiKey":"AQVN...",
      "yandexFolderId":"b1g..."
    }
  }'

# Health-check подключений провайдеров
curl http://localhost:3000/api/providers/health
```

## Переменные окружения

Для локального запуска обязательно задать `DATABASE_URL` на PostgreSQL.

Рекомендуемые переменные:

- `OPENAI_API_KEY` — ключ API OpenAI/ChatGPT.
- `DEEPSEEK_API_KEY` — ключ DeepSeek API.
- `YANDEX_API_KEY` — API-ключ Yandex Cloud для Foundation Models.
- `YANDEX_FOLDER_ID` — Folder ID в Yandex Cloud (если не передан `YANDEX_MODEL_URI`).
- `YANDEX_MODEL_URI` — полный modelUri для YandexGPT (опционально).
- `ANTHROPIC_API_KEY` — ключ Anthropic Claude API.
- `DATABASE_URL` — URL подключения к PostgreSQL (обязателен).
- `PB_API_TOKEN` — токен защиты для `/api/generate`. Эндпоинт допускает запрос только при одном из условий: валидный `x-api-token` **или** валидная сессия пользователя (`pb_session`).

Также можно хранить ключи в локальном JSON-файле `config/llm-keys.local.json` (файл добавлен в `.gitignore`).
Шаблон: `config/llm-keys.local.example.json`.


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
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://prompt_builder:prompt_builder@host.docker.internal:5432/prompt_builder \
  prompt-builder
```

После старта контейнера и доступности PostgreSQL выполните инициализацию схемы:

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://prompt_builder:prompt_builder@host.docker.internal:5432/prompt_builder \
  prompt-builder npm run db:init
```

Либо через docker compose:

```bash
docker compose up --build
```

После запуска приложение будет доступно на `http://localhost:3000`.


## Базовая защита от ботов и сканеров

В проект добавлен middleware-фильтр для API (`src/middleware.ts`), который:

- режет типовые сканерные User-Agent и path-сигнатуры (`/.env`, `wp-admin`, `phpmyadmin` и т.д.);
- ограничивает размер тела запроса (`413 Payload Too Large` при body > 64 KB);
- включает rate limit по IP (90 req/мин для `/api/*` и 30 req/мин для `/api/generate`);
- может включать токен-доступ для чувствительных эндпоинтов через `PB_API_TOKEN` + header `x-api-token`;
- для `/api/generate` требует `x-api-token` **или** валидную cookie-сессию `pb_session` (hex-64);
- пишет структурированные security-события (403/413/429/401) с `ip`, `userAgent`, `path` в stdout/stderr контейнера;
- базовые сигнатурные блокировки (UA/path/query/header) применяются ко всем маршрутам, а лимиты body/rate/token-check — к `/api/*`.

### Рекомендации для reverse proxy / WAF

Минимальная защита на Nginx (перед контейнером):

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

server {
  location /api/ {
    limit_req zone=api_limit burst=40 nodelay;

    if ($request_uri ~* "(base64\s+-d\|bash|/dev/tcp/|curl\s+.*\|\s*sh)") {
      return 403;
    }

    proxy_pass http://127.0.0.1:3000;
  }
}
```

Для автобана по логам можно использовать fail2ban/CrowdSec (фильтры на `blocked_user_agent`, `blocked_path_signature`, `missing_generate_access_credentials`).

### Алерты и наблюдаемость

Рекомендуется настроить оповещения в вашей системе логов/мониторинга (Loki/ELK/Datadog/CloudWatch):

- всплеск `status=400` с причиной `suspicious_payload_blocked`;
- всплеск `status=403` и `status=429`;
- топ IP/UA за последние 5–15 минут по security-событиям;
- алерт при повторяющихся событиях от одного IP (например, >30 блокировок за 10 минут).

Рекомендуемый прод-профиль:

1. Не публиковать контейнер напрямую в интернет, а оставлять порт только на loopback (`127.0.0.1:3000:3000`) и ставить reverse proxy с TLS/WAF.
2. На прокси добавить rate-limit/ban (например, nginx `limit_req`, CrowdSec, fail2ban).
3. Оставить в firewall доступ к 80/443, а порт 3000 не открывать снаружи.

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

## Аудит по User Story Map (актуализация)

Статусы ниже соответствуют текущей реализации в репозитории.

### Реализовано
- **US-M1 (Must):** выбор формата + релевантные поля в форме.
- **US-M2 (Must):** выбор индустрии/экспертов из конфигурации.
- **US-M3 (Must):** мультивыбор экспертов без дублей.
- **US-M4 (Must):** генерация итогового prompt + копирование.
- **US-S1 (Should):** подсказки к полям (`hint` в конфиге, рендер в UI).
- **US-S2 (Should):** избранное (локально + синхронизация с сервером).
- **US-S3 (Should):** онбординг-модалка с провайдером состояния.
- **US-C1 (Could):** мульти-LLM отправка и статусы по провайдерам.
- **US-C4 (Could):** шаринг через ссылку на серверный prompt.
- **US-C5 (Could):** веса экспертов (слайдер/влияние на итоговый prompt).

### Частично / не завершено
- **US-C2 (Could):** быстрый старт шаблонов по индустрии — есть заготовки/дефолтные промпты, но не полноценный UX «1 клик, 3+ шаблона на индустрию».
- **US-C3 (Could):** экспорт Markdown/HTML есть, но нет полноценного режима Plain+preview как отдельного пользовательского сценария.

### Won’t (по карте — намеренно не делаем в MVP)
- **US-W1:** цепочки промптов с внешними инструментами.
- **US-W2:** полноценный офлайн-режим со сложной синхронизацией.
- **US-W3:** real-time совместное редактирование курсорами.
