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
