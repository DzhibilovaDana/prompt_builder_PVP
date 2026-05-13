import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error runtime import for node --experimental-strip-types
import { roleCanEditPrompt, roleCanReadPrompt } from "../src/lib/promptAccessRules.ts";
// @ts-expect-error runtime import for node --experimental-strip-types
import { buildHtmlExport, buildMdExport, buildTxtExport } from "../src/lib/exportPrompt.ts";



test("role checks for prompt access", () => {
  assert.equal(roleCanReadPrompt("viewer"), true);
  assert.equal(roleCanReadPrompt(null), false);
  assert.equal(roleCanEditPrompt("editor"), true);
  assert.equal(roleCanEditPrompt("viewer"), false);
});

test("export builders return expected txt/md/html", () => {
  const source = "Hello <b>world</b>";
  assert.equal(buildTxtExport(source), source);
  assert.equal(buildMdExport(source), source);

  const html = buildHtmlExport(source);
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /&lt;b&gt;world&lt;\/b&gt;/);
});