// Design codes (PJ-001, PJ-002 …) that the shop can quote on Instagram and customers can search.
// Plain JS so scripts/demo-data.mjs shares the same counter.
export async function nextCode(db) {
  const { seq } = await db
    .collection("counters")
    .findOneAndUpdate({ _id: "item" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return `PJ-${String(seq).padStart(3, "0")}`;
}

// Lets "pj024", "PJ 024" and "PJ-024" all find PJ-024: letters and digits, any separators between.
export function codePattern(q) {
  const chars = String(q).replace(/[^a-z0-9]/gi, "").split("");
  return chars.length ? new RegExp(chars.join("[^a-z0-9]?"), "i") : null;
}

// Every physical piece gets its own number, so two pieces of one design (different weights) stay distinct.
export async function nextPiece(db) {
  const { seq } = await db
    .collection("counters")
    .findOneAndUpdate({ _id: "piece" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return seq;
}
