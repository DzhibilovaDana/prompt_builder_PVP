import test from "node:test";
import assert from "node:assert/strict";
import { hasSuspiciousPayload } from "../src/lib/security.ts";

test("detects echo|base64|bash payload", () => {
  const payload = {
    prompt: "echo ZWNobyBoaQ==|base64 -d|bash",
  };

  assert.equal(hasSuspiciousPayload(payload), true);
});

test("detects /dev/tcp reverse-shell style payload", () => {
  const payload = {
    prompt: "exec 3<>/dev/tcp/127.0.0.1/4444",
  };

  assert.equal(hasSuspiciousPayload(payload), true);
});

test("does not block regular business prompts", () => {
  const payload = {
    prompt: "Сделай маркетинговый план на 90 дней для B2B SaaS стартапа",
    providers: ["openai"],
  };

  assert.equal(hasSuspiciousPayload(payload), false);
});
