
import test from "node:test";
import assert from "node:assert/strict";
import { toPaise } from "../src/lib/money";

test("converts whole rupee amounts into paise", () => {
  assert.equal(toPaise(1), 100);
  assert.equal(toPaise(100), 10000);
  assert.equal(toPaise(22899), 2289900);
});

test("converts decimal rupee amounts into paise", () => {
  assert.equal(toPaise(1.5), 150);
  assert.equal(toPaise(100.5), 10050);
  assert.equal(toPaise(0.29), 29);
});

test("supports Prisma Decimal-like values", () => {
  assert.equal(toPaise({ toString: () => "100.50" }), 10050);
  assert.equal(toPaise({ toString: () => "22899" }), 2289900);
});

test("allows zero", () => {
  assert.equal(toPaise(0), 0);
});

test("rejects negative amounts", () => {
  assert.throws(() => toPaise(-1));
  assert.throws(() => toPaise(-0.5));
});

test("rejects amounts with more than two decimal places", () => {
  assert.throws(() => toPaise(1.234));
  assert.throws(() => toPaise({ toString: () => "10.999" }));
});

test("rejects invalid numeric amounts", () => {
  assert.throws(() => toPaise(Number.NaN));
  assert.throws(() => toPaise(Number.POSITIVE_INFINITY));
});

test("rejects unsafe paise values", () => {
  assert.throws(() => toPaise(100000000000000));
});

test("rejects unsupported numeric notation", () => {
  assert.throws(() => toPaise({ toString: () => "1e3" }));
});
