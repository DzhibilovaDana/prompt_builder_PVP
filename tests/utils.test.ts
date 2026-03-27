import test from "node:test";
import assert from "node:assert/strict";

import { cn, hasUserMadeSelections, isEmptySelection } from "../src/lib/utils.ts";

test("cn склеивает только truthy классы", () => {
  assert.equal(cn("btn", undefined, "btn-primary", null, false), "btn btn-primary");
});

test("isEmptySelection распознает системные и пустые значения", () => {
  assert.equal(isEmptySelection(null), true);
  assert.equal(isEmptySelection(undefined), true);
  assert.equal(isEmptySelection("   "), true);
  assert.equal(isEmptySelection("Выберите вариант"), true);
  assert.equal(isEmptySelection("Автоматический выбор (рекомендуется)"), true);
  assert.equal(isEmptySelection("Система подберет оптимальный режим"), true);
});

test("isEmptySelection корректно обрабатывает массивы", () => {
  assert.equal(isEmptySelection([]), true);
  assert.equal(isEmptySelection([" ", "Выберите вариант"]), true);
  assert.equal(isEmptySelection(["значение"]), false);
});

test("isEmptySelection считает пустые объекты пустыми", () => {
  assert.equal(isEmptySelection({}), true);
  assert.equal(isEmptySelection({ mode: "manual" }), false);
});

test("hasUserMadeSelections возвращает false если выбраны только placeholder-значения", () => {
  const values = {
    industry: "Выберите вариант",
    experts: [],
    flags: {},
    comment: "   ",
  };
  assert.equal(hasUserMadeSelections(values), false);
});

test("hasUserMadeSelections возвращает true, когда есть минимум одно реальное значение", () => {
  const values = {
    industry: "Выберите вариант",
    experts: ["Аналитик"],
    flags: {},
    comment: "   ",
  };
  assert.equal(hasUserMadeSelections(values), true);
});
