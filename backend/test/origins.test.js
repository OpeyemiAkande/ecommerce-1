import {test} from "node:test";
import assert from "node:assert/strict";
import {parseAllowedOrigins} from "../src/lib/origins.js";

test("returns an empty list when unset", () => {
  assert.deepEqual(parseAllowedOrigins(undefined), []);
  assert.deepEqual(parseAllowedOrigins(""), []);
});

test("parses a single origin", () => {
  assert.deepEqual(parseAllowedOrigins("http://localhost:5173"), [
    "http://localhost:5173"
  ]);
});

test("parses a comma-separated list, trimming spaces and trailing slashes", () => {
  assert.deepEqual(
    parseAllowedOrigins("http://localhost:5173/, https://shop.example.com ,"),
    ["http://localhost:5173", "https://shop.example.com"]
  );
});
