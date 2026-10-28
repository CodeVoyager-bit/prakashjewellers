import { test } from "node:test";
import assert from "node:assert/strict";
import { perGram, priceOf, rupees, type Priceable, type Rate } from "./price";
import { sign } from "./cloudinary.mjs";
import { staffEmail } from "./staff-email.mjs";
import { codePattern } from "./codes.mjs";

const today: Rate = { key: "22k", label: "22K gold", perGram: 7000, updatedAt: new Date(), updatedBy: "Test" };
const cfg = { makingPct: 10, taxPct: 3 };
const piece = (p: Partial<Priceable> = {}): Priceable => ({ pricing: "weight", rateKey: "22k", weight: 10, netWeight: null, making: null, extraCharge: null, fixedPrice: null, ...p });

test("weight-based price: metal, making, tax, total", () => {
  const p = priceOf(piece(), [today], cfg)!;
  assert.deepEqual([p.metal, p.making, p.extra, p.tax, p.total], [70000, 7000, 0, 2310, 79310]);
  assert.equal(p.total, Math.round(10 * 7000 * 1.1 * 1.03));
  assert.equal(p.stale, false);
});

test("billable weight, making override, additional charges and tax setting all apply", () => {
  const p = priceOf(piece({ weight: 12, netWeight: 10, making: 15, extraCharge: 2000 }), [today], { makingPct: 10, taxPct: 5 })!;
  assert.equal(p.billable, 10);
  assert.deepEqual([p.metal, p.making, p.extra, p.tax, p.total], [70000, 10500, 2000, 4125, 86625]);
});

test("fixed price is final; missing rate, category or weight means price on request", () => {
  assert.equal(priceOf(piece({ pricing: "fixed", fixedPrice: 4999 }), [today], cfg)!.total, 4999);
  assert.equal(priceOf(piece({ rateKey: "18k" }), [today], cfg), null);
  assert.equal(priceOf(piece(), [{ ...today, perGram: 0 }], cfg), null);
  assert.equal(priceOf(piece({ weight: 0 }), [today], cfg), null);
});

test("a rate not updated today is flagged stale", () => {
  const old = { ...today, updatedAt: new Date(Date.now() - 2 * 864e5) };
  assert.equal(priceOf(piece(), [old], cfg)!.stale, true);
});

test("per-10-gram entry converts to per gram", () => {
  assert.equal(perGram(137500, "10g"), 13750);
  assert.equal(perGram(13750, "g"), 13750);
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
