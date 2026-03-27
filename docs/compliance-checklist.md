# Compliance checklist (MVP phase)

## Репозиторий и код
- [x] Структура проекта разделена по модулям: `src/app`, `src/app/api`, `src/components`, `src/hooks`, `src/lib`, `src/data`.
- [x] ESLint-конфигурация в репозитории: `.eslintrc.json` + `eslint.config.mjs`.
- [x] CI workflow присутствует и запускает `lint` + `build`: `.github/workflows/ci.yml`.
- [ ] Открытый GitHub/GitLab-репозиторий — подтверждается на стороне хостинга (вне кода).

## README
- [x] Описание проекта и целей.
- [x] Явное разделение MVP/MUP.
- [x] Структура репозитория.
- [x] Инструкция запуска, установка зависимостей, команды lint/build/start.
- [x] Требования к окружению (Node.js/npm).

## Архитектура
- [x] C4 L1 (Context): `diagrams/c4-context.mmd`.
- [x] C4 L2 (Container): `diagrams/c4-container.mmd`.
- [x] Deployment diagram: `diagrams/deployment.mmd`.

## Презентация
- [ ] PDF-презентация проверяется как отдельный артефакт (вне этого репозитория).

## Реализованный функционал
- [x] В README зафиксированы планы MVP и MUP.
- [ ] Факт соответствия roadmap/защите прототипа проверяется по вашим исходным планам и демо.

## User Story Map (статус на текущий момент)

### Must / Should
- [x] US-M1: выбор формата + релевантные поля.
- [x] US-M2: выбор индустрии/эксперта из конфигурации.
- [x] US-M3: выбор нескольких экспертов без дублей.
- [x] US-M4: генерация итогового промпта и копирование.
- [x] US-S1: подсказки к полям.
- [x] US-S2: избранное (добавление/удаление/повторное использование).
- [x] US-S3: онбординг.

### Could (backend)
- [x] US-C1: мульти-LLM отправка (параллельно) + статус/ошибки по провайдерам.
- [~] US-C2: быстрый старт шаблонами (частично, требует фронтенд UX).
- [~] US-C3: формат/вывод Markdown/HTML/Plain (частично, backend готов, нужен UX preview).
- [x] US-C4: шаринг ссылкой.
- [x] US-C5: веса экспертов.

### MUP backend tails
- [x] Workspace model: `workspaces`, `workspace_members`, API `/api/workspaces*`.
- [x] Versioning + rollback: `prompt_versions`, API `/api/prompts/:id/versions`, `/rollback`.
- [x] Audit trail: `audit_logs`, API `/api/audit`.
- [x] Prompt quality metrics: `prompt_runs`, `prompt_scores`, API `/api/prompts/:id/metrics`.
- [x] A/B experiments: `ab_tests`, `ab_variants`, API `/api/ab-tests*`.

### Won’t
- [ ] US-W1: цепочки промптов с внешними инструментами (намеренно не реализуется в MVP).
- [ ] US-W2: офлайн-режим с последующей синхронизацией (намеренно не реализуется в MVP).
- [ ] US-W3: совместное редактирование real-time (намеренно не реализуется в MVP).
