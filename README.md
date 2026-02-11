# Prompt Builder PVP

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

> ⚠️ Замените `OWNER/REPO` на фактический путь вашего GitHub-репозитория, чтобы badge стал рабочим.

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
- `diagrams/` *(планируется)* — архитектурные схемы.
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

### 3) Инициализация БД (когда будет добавлена SQLite/Prisma)

На текущем этапе добавлено локальное файловое хранилище промптов `data/prompts.json` и скрипт инициализации:

```bash
npm run db:init
```

Для следующего этапа можно мигрировать на SQLite/Prisma:

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

Для локального запуска обязательных переменных окружения нет.

Рекомендуемые переменные:

- `OPENAI_API_KEY` — ключ API модели (если не задан, `/api/generate` работает в mock-режиме).
- `DATABASE_URL` — путь/URL к БД для следующего этапа (SQLite/Prisma migration).


## Архитектура

Архитектурные диаграммы добавлены в каталог `diagrams/`:

- C4 L1 (Context): `diagrams/c4-context.mmd`
- C4 L2 (Container): `diagrams/c4-container.mmd`
- Deployment: `diagrams/deployment.mmd`

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

После запуска приложение будет доступно на `http://localhost:3000`.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`.

Pipeline выполняет:

1. `npm ci`
2. `npm run lint`
3. `npm run build`

Цель — гарантировать, что линтер и production-сборка остаются зелёными на каждом push/PR.
