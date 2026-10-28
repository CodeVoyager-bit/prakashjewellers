import { test } from "node:test";
import assert from "node:assert/strict";
import { priceOf, rupees } from "./price";
import { sign } from "./cloudinary.mjs";
import { staffEmail } from "./staff-email.mjs";
import { codePattern } from "./codes.mjs";

test("rate-based price matches weight × rate × 1.10 × 1.03", () => {
  const p = priceOf({ weight: 10, making: null, fixedPrice: null }, 7000)!;
  assert.deepEqual(p, { fixed: false, gold: 70000, making: 7000, gst: 2310, total: 79310 });
  assert.equal(p.total, Math.round(10 * 7000 * 1.1 * 1.03));
});

test("per-item making charge overrides the 10% default", () => {
  assert.equal(priceOf({ weight: 10, making: 15, fixedPrice: null }, 7000)!.making, 10500);
});

test("fixed price wins over the formula; missing rate or weight means price on request", () => {
  assert.equal(priceOf({ weight: 10, making: null, fixedPrice: 4999 }, 7000)!.total, 4999);
  assert.equal(priceOf({ weight: 10, making: null, fixedPrice: null }, 0), null);
  assert.equal(priceOf({ weight: 0, making: null, fixedPrice: null }, 7000), null);
});

test("rupees use Indian grouping", () => {
  assert.equal(rupees(352000), "₹3,52,000");
});

test("Cloudinary signature matches their documented example", () => {
  const params = { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" };
  assert.equal(sign(params, "abcd"), "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("staff phone numbers map to one login however they're typed", () => {
  for (const p of ["9876543210", "+91 98765 43210", "098765-43210", "919876543210"])
    assert.equal(staffEmail(p), "919876543210@staff.invalid");
});

test("design-code search ignores case and separators but not digits", () => {
  for (const q of ["PJ-024", "pj024", "PJ 024", "024"]) assert.ok(codePattern(q)!.test("PJ-024"), q);
  assert.equal(codePattern("PJ-025")!.test("PJ-024"), false);
  assert.equal(codePattern("--"), null);
});
