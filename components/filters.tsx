"use client";

import { useState } from "react";
import { SlidersIcon } from "./icons";
import { Sheet } from "./ui";

const AVAIL = { all: "All pieces", in: "In stock", out: "Sold out" } as const;
const SORT = { new: "Newest first", "price-asc": "Price: low to high", "price-desc": "Price: high to low", weight: "Weight: heaviest first" } as const;

type Props = { c?: string; q?: string; avail: keyof typeof AVAIL; sort: keyof typeof SORT };
type Select = { currentTarget: HTMLSelectElement };

// A pick with the mouse or finger applies at once. From the keyboard, arrow keys only move the choice
// (Windows browsers fire "change" on each one); Enter or leaving the field applies it.
const apply = (e: Select) => e.currentTarget.form?.requestSubmit();
const autoApply = {
  onKeyDown: (e: Select & { key: string; preventDefault(): void }) => {
    e.currentTarget.dataset.keyboard = "1";
    if (e.key !== "Enter") return;
    e.preventDefault();
    apply(e);
  },
  onChange: (e: Select) => {
    if (e.currentTarget.dataset.keyboard) e.currentTarget.dataset.changed = "1";
    else apply(e);
  },
  onBlur: (e: Select) => {
    if (e.currentTarget.dataset.changed) apply(e);
  },
};

// Availability and sort. Inline selects on desktop; a bottom sheet with large radio rows on phones.
// Both are plain GET forms, so the URL always reflects the filters and can be shared.
export function Filters({ c, q, avail, sort }: Props) {
  const [open, setOpen] = useState(false);
  const active = (avail !== "all" ? 1 : 0) + (sort !== "new" ? 1 : 0);
  const hidden = (
    <>
      {c && <input type="hidden" name="c" value={c} />}
      {q && <input type="hidden" name="q" value={q} />}
    </>
  );
  return (
    <>
      <form action="/collections" className="filters-inline">
        {hidden}
        <label>
          <span className="sr-only">Availability</span>
          <select name="avail" defaultValue={avail} {...autoApply}>
            {Object.entries(AVAIL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort</span>
          <select name="sort" defaultValue={sort} {...autoApply}>
            {Object.entries(SORT).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <noscript>
          <button type="submit" className="btn btn-quiet btn-sm">
            Apply
          </button>
        </noscript>
      </form>

      <button type="button" className="btn btn-quiet btn-sm filters-open" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SlidersIcon size={18} /> Filter &amp; Sort{active > 0 && <span className="badge badge-inline">{active}</span>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Filter & Sort">
        <form action="/collections" className="filters-sheet" onSubmit={() => setOpen(false)}>
          {hidden}
          <fieldset>
            <legend>Availability</legend>
            {Object.entries(AVAIL).map(([v, l]) => (
              <label key={v} className="radio-row">
                <input type="radio" name="avail" value={v} defaultChecked={v === avail} /> {l}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Sort by</legend>
            {Object.entries(SORT).map(([v, l]) => (
              <label key={v} className="radio-row">
                <input type="radio" name="sort" value={v} defaultChecked={v === sort} /> {l}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn btn-primary btn-block">
            Show Pieces
          </button>
        </form>
      </Sheet>
    </>
  );
}
