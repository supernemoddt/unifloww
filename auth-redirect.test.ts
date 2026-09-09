import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmationDestination } from "../lib/auth-redirect";
test("email callback preserves safe invitations and blocks external redirects", () => {
  assert.equal(
    confirmationDestination(null, "/join/ABC123DEF456"),
    "/join/ABC123DEF456",
  );
  for (const path of [
    "//evil.example",
    "https://evil.example",
    "/join/../../settings",
    "/join/code?next=//evil.example",
    "/join/code#fragment",
  ])
    assert.equal(confirmationDestination(null, path), "/");
  assert.equal(
    confirmationDestination("true", "/join/ABC123"),
    "/reset-password",
  );
});
