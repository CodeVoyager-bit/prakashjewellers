"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { addStaff, duplicateItem, markSold, removeStaff, resetStaffPassword, saveItem, saveRates, setEnquiryStatus, setQty, setStatus, uploadSignature } from "@/app/admin/actions";
import { authClient } from "@/lib/auth-client";
import type { Item } from "@/lib/data";
import { CATEGORIES, DETAILS, ENQUIRY_STATUSES, STATUSES, type EnquiryStatus, type Status } from "@/lib/fields";
import { formatDayTime, isToday, perGram, priceOf, rupees, type Rate } from "@/lib/price";
import { staffEmail } from "@/lib/staff-email.mjs";
import { videoPoster, videoUrl } from "@/lib/cloudinary-loader";
import { BackIcon, CloseIcon, CopyIcon, EyeIcon, EyeOffIcon, MinusIcon, PlayIcon, PlusIcon, SearchIcon } from "./icons";
import { Photo } from "./photo";

// Keeps only the 10-digit mobile: letters never appear, and "+91 98765 43210" or "098765…" paste cleanly.
// No maxLength on these fields: the browser would cut a pasted "+91 …" short before this could clean it.
const mobile = (v: string) => {
  let d = v.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
};

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const phoneError = !touched || /^[6-9]\d{9}$/.test(phone) ? "" : phone.length < 10 ? "Enter the 10-digit mobile number." : "Indian mobile numbers start with 6, 7, 8 or 9.";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) return document.getElementById("phone")?.focus();
    if (!password) {
      setError("Enter your password.");
      return document.getElementById("password")?.focus();
    }
    setBusy(true);
    try {
      const { error } = await authClient.signIn.email({ email: staffEmail(phone), password });
      if (!error) return router.replace("/admin");
      setError(error.status === 429 ? "Too many attempts. Wait a minute, then try again." : "That mobile number and password don’t match a staff login.");
    } catch {
      setError("Couldn’t reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  const capsCheck = (e: React.KeyboardEvent) => setCaps(e.getModifierState("CapsLock"));

  return (
    // onSubmit, not action: a form action resets the fields, which would clear the number on a typo.
    <form onSubmit={submit} noValidate className="login-form">
      <div className="field">
        <label htmlFor="phone">Mobile number</label>
        <div className={`affix-field${phoneError ? " is-invalid" : ""}`}>
          <span className="affix" aria-hidden="true">
            +91
          </span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="username"
            placeholder="98765 43210"
            value={phone}
            onChange={(e) => setPhone(mobile(e.target.value))}
            onBlur={() => phone && setTouched(true)}
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? "phone-error" : undefined}
            required
          />
        </div>
        {phoneError && (
          <p id="phone-error" className="field-error" role="alert">
            {phoneError}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <div className="affix-field">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={capsCheck}
            onKeyUp={capsCheck}
            aria-describedby={caps ? "caps-hint" : undefined}
            required
          />
          <button type="button" className="affix-btn" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)}>
            {show ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
          </button>
        </div>
        {caps && (
          <p id="caps-hint" className="help">
            Caps Lock is on.
          </p>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner spinner-light" aria-hidden="true" /> Signing In…
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}

// Easy to read out or send on WhatsApp: no 0/O or 1/l/I lookalikes.
const suggestPassword = () => {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (x) => chars[x % chars.length]).join("");
};

function NewPassword({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <div className="affix-field">
        <input id={id} name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} required />
        <button type="button" className="affix-btn" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(!show)}>
          {show ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </div>
      <p className="help">
        At least 8 characters.{" "}
        <button type="button" className="inline-link" onClick={() => (onChange(suggestPassword()), setShow(true))}>
          Suggest one
        </button>
      </p>
    </>
  );
}

type Note = { ok: boolean; text: string } | null;
const NoteLine = ({ note }: { note: Note }) =>
  note && (
    <p className={note.ok ? "notice notice-info" : "error"} role={note.ok ? "status" : "alert"}>
      {note.text}
    </p>
  );

export function AddStaffForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState<Note>(null);
  const [saving, start] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const error = await addStaff(fd);
      if (error) return setNote({ ok: false, text: error });
      // Shown once so the owner can pass it on; it isn't stored anywhere readable.
      setNote({ ok: true, text: `Login created for ${fd.get("name")}: +91 ${phone.slice(0, 5)} ${phone.slice(5)}, password ${password}. Send them these to sign in at Staff Login.` });
      form.reset();
      setPhone("");
      setPassword("");
    });
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <div className="form-grid two">
        <div className="field">
          <label htmlFor="staff-name">Name</label>
          <input id="staff-name" name="name" maxLength={60} autoComplete="off" placeholder="Priya Patil" required />
        </div>
        <div className="field">
          <label htmlFor="staff-phone">Mobile number</label>
          <div className="affix-field">
            <span className="affix" aria-hidden="true">
              +91
            </span>
            <input
              id="staff-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              pattern="[6-9][0-9]{9}"
              title="A 10-digit mobile number starting with 6, 7, 8 or 9"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(mobile(e.target.value))}
              required
            />
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="staff-password">Password</label>
        <NewPassword id="staff-password" value={password} onChange={setPassword} />
      </div>
      <label className="check-row">
        <input type="checkbox" name="owner" /> Owner: can also add and remove staff logins
      </label>
      <NoteLine note={note} />
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Adding…" : "Add Staff Login"}
      </button>
    </form>
  );
}

export function StaffActions({ id, name, me }: { id: string; name: string; me: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [note, setNote] = useState<Note>(null);
  const [busy, start] = useTransition();

  function reset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const error = await resetStaffPassword(id, password);
      if (error) return setNote({ ok: false, text: error });
      setNote({ ok: true, text: `New password for ${name}: ${password}.${me ? "" : " They’ve been signed out and must sign in with it."}` });
      setOpen(false);
      setPassword("");
    });
  }
  function remove() {
    if (!confirm(`Remove ${name}’s login? They’ll be signed out and won’t be able to sign in again.`)) return;
    start(async () => {
      const error = await removeStaff(id);
      if (error) setNote({ ok: false, text: error });
    });
  }

  return (
    <div className="staff-actions">
      <div className="row-actions">
        <button type="button" className="btn btn-quiet btn-sm" aria-expanded={open} onClick={() => (setOpen(!open), setNote(null))}>
          Reset Password
        </button>
        {!me && (
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={remove}>
            Remove
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={reset} className="staff-reset form-grid">
          <div className="field">
            <label htmlFor={`pw-${id}`}>New password for {name}</label>
            <NewPassword id={`pw-${id}`} value={password} onChange={setPassword} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Saving…" : "Save Password"}
          </button>
        </form>
      )}
      <NoteLine note={note} />
    </div>
  );
}

const n = (v: FormDataEntryValue | null) => (String(v ?? "").trim() === "" ? null : Number(String(v).replace(/,/g, "")));

// Daily rates. Staff type only what changed; the preview shows the per-gram figure and a sample price before saving.
export function RatesForm({ rates, makingPct, taxPct }: { rates: Rate[]; makingPct: number; taxPct: number }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [unit, setUnit] = useState<"g" | "10g">("g");
  const [values, setValues] = useState<Record<string, string>>({});
  // onSubmit, not action: a form action resets the fields, which would flip the unit back to "per gram"
  // while the labels still say "per 10 g". On success only the typed values are cleared.
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const err = await saveRates(null, fd);
      setError(err);
      if (err) return;
      setValues({});
      (form.elements.namedItem("allowBig") as HTMLInputElement).checked = false;
    });
  }
  return (
    <form onSubmit={submit} className="form-grid panel rate-panel">
      <fieldset className="segmented">
        <legend>I’m entering rates</legend>
        {(["g", "10g"] as const).map((u) => (
          <label key={u}>
            <input type="radio" name="unit" value={u} checked={unit === u} onChange={() => setUnit(u)} />
            <span>{u === "g" ? "Per gram" : "Per 10 grams"}</span>
          </label>
        ))}
      </fieldset>
      {[...rates, { key: "new", label: "", perGram: 0, updatedAt: null, updatedBy: "" }].map((r) => {
        const v = n(values[r.key] ?? null);
        const g = v && v > 0 ? perGram(v, unit) : null;
        const sample = g ? priceOf({ pricing: "weight", rateKey: "x", weight: 10, netWeight: null, making: null, extraCharge: null, fixedPrice: null }, [{ ...r, key: "x", perGram: g }], { makingPct, taxPct }) : null;
        const isNew = r.key === "new";
        return (
          <div key={r.key} className={`rate-row${isNew ? " rate-new" : ""}`}>
            {isNew ? (
              <div className="field">
                <label htmlFor="newLabel">Add a rate category (optional)</label>
                <input id="newLabel" name="newLabel" placeholder="18K gold, Silver 925…" autoComplete="off" value={values.newLabel ?? ""} onChange={(e) => setValues({ ...values, newLabel: e.target.value })} />
              </div>
            ) : (
              <div className="rate-meta">
                <p className="rate-name">{r.label}</p>
                <p className="help">
                  {r.perGram ? `Now ${rupees(r.perGram)}/g` : "Not set"}
                  {r.updatedAt && ` · ${formatDayTime(r.updatedAt)} by ${r.updatedBy || "staff"}`}
                  {r.perGram > 0 && !isToday(r.updatedAt) && <span className="badge-warn"> Not updated today</span>}
                </p>
              </div>
            )}
            <div className="field">
              <label htmlFor={`rate_${r.key}`}>
                {isNew ? "Its rate" : "New rate"} (₹ per {unit === "g" ? "gram" : "10 g"})
              </label>
              <input
                id={`rate_${r.key}`}
                name={`rate_${r.key}`}
                type="text"
                inputMode="decimal"
                className="rate-input"
                autoComplete="off"
                placeholder={r.perGram ? String(unit === "g" ? r.perGram : r.perGram * 10) : ""}
                value={values[r.key] ?? ""}
                onChange={(e) => setValues({ ...values, [r.key]: e.target.value })}
              />
              <p className="help rate-preview" aria-live="polite">
                {g ? `= ${rupees(g)} per gram${sample ? ` · a 10 g piece ≈ ${rupees(sample.total)}` : ""}` : isNew ? "" : "Leave empty to keep the current rate."}
              </p>
            </div>
          </div>
        );
      })}
      <label className="check-row small">
        <input type="checkbox" name="allowBig" /> Allow a big change (only when correcting a wrong rate)
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save Rates"}
      </button>
    </form>
  );
}

const PLACEHOLDERS: Record<keyof typeof DETAILS, string> = { stones: "Kundan, pearls…", finish: "Antique…", occasion: "Wedding, festive…", includes: "Necklace and earrings…" };

// Straight from the browser to Cloudinary with a signature from our server; returns the new public_id.
async function sendToCloudinary(file: File, kind: "image" | "video") {
  const { url, fields } = await uploadSignature(kind);
  const fd = new FormData();
  fd.append("file", file);
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
  const res = await fetch(url, { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message);
  return json.public_id as string;
}
const uploadFailed = (e: unknown) => (e instanceof Error && e.message ? `Upload failed: ${e.message}` : "Upload failed. Check the connection and try again.");

export function ItemForm({ item, categories, rates, makingPct, taxPct, copied }: { item: Item | null; categories: string[]; rates: Rate[]; makingPct: number; taxPct: number; copied?: boolean }) {
  const [error, setError] = useState("");
  // On phones the message sits below the long form, so bring it into view.
  useEffect(() => {
    if (error) document.getElementById("item-error")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);
  const [saving, startSaving] = useTransition();
  const [photos, setPhotos] = useState(item?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [video, setVideo] = useState(item?.video ?? null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [pricing, setPricing] = useState<"weight" | "fixed">(item?.pricing ?? "weight");
  const [category, setCategory] = useState(item?.category ?? "");
  const [newCategory, setNewCategory] = useState(false);
  const categoryOptions = [...new Set([...CATEGORIES, ...categories])].sort();
  // Live inputs for the price preview.
  const [f, setF] = useState({
    rateKey: item?.rateKey ?? rates[0]?.key ?? "",
    weight: String(item?.weight || ""),
    netWeight: String(item?.netWeight ?? ""),
    making: String(item?.making ?? ""),
    extraCharge: String(item?.extraCharge ?? ""),
    fixedPrice: String(item?.fixedPrice ?? ""),
  });
  const bind = (k: keyof typeof f) => ({ name: k, value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) });
  const preview = useMemo(
    () => priceOf({ pricing, rateKey: f.rateKey, weight: n(f.weight) ?? 0, netWeight: n(f.netWeight), making: n(f.making), extraCharge: n(f.extraCharge), fixedPrice: n(f.fixedPrice) }, rates, { makingPct, taxPct }),
    [f, pricing, rates, makingPct, taxPct],
  );

  async function upload(files: File[]) {
    if (!files.length) return;
    setUploadError("");
    setUploading(files.length);
    try {
      for (const file of files) {
        const id = await sendToCloudinary(file, "image");
        setPhotos((p) => [...p, id]);
        setUploading((x) => x - 1);
      }
    } catch (e) {
      setUploadError(uploadFailed(e));
    }
    setUploading(0);
  }
  async function uploadVideo(file?: File) {
    if (!file) return;
    setVideoError("");
    // Cloudinary's free plan takes a video of up to 100 MB in one upload.
    if (file.size > 100e6) return setVideoError("That video is over 100 MB. Trim it to a short clip and try again.");
    setVideoBusy(true);
    try {
      setVideo(await sendToCloudinary(file, "video"));
    } catch (e) {
      setVideoError(uploadFailed(e));
    }
    setVideoBusy(false);
  }
  const move = (i: number, d: -1 | 1) => setPhotos((p) => {
    const next = [...p];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  });

  // Keeps what was typed if the server rejects it (a form action would reset the fields).
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => setError((await saveItem(null, fd)) ?? ""));
  }

  const v = (x: number | null | undefined) => (x == null ? "" : String(x));
  const rate = rates.find((r) => r.key === f.rateKey);

  return (
    <form onSubmit={submit} className="editor">
      <div className="form-grid panel">
        {copied && (
          <p className="notice notice-info" role="status">
            New piece of design {item?.code}. Enter <strong>this piece’s own weight</strong>; it was not copied. It stays a draft until you publish it.
          </p>
        )}
        <input type="hidden" name="id" value={item?.id ?? ""} />
        <input type="hidden" name="photos" value={JSON.stringify(photos)} />
        <input type="hidden" name="video" value={video ?? ""} />
        <input type="hidden" name="pricing" value={pricing} />

        <div className="field">
          <label htmlFor="name">Product name *</label>
          <input id="name" name="name" required defaultValue={item?.name} autoComplete="off" placeholder="Maharani bridal set…" />
        </div>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="category">Category</label>
            {newCategory ? (
              <>
                <input id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} autoFocus autoComplete="off" placeholder="Anklets…" />
                <p className="help">
                  Spell it the way customers should see it.{" "}
                  <button type="button" className="inline-link" onClick={() => (setNewCategory(false), setCategory(item?.category ?? ""))}>
                    Choose from the list
                  </button>
                </p>
              </>
            ) : (
              <select id="category" name="category" value={category} onChange={(e) => (e.target.value === "+new" ? (setNewCategory(true), setCategory("")) : setCategory(e.target.value))}>
                <option value="">Choose a category</option>
                {categoryOptions.map((c) => (
                  <option key={c}>{c}</option>
                ))}
                <option value="+new">+ New category…</option>
              </select>
            )}
          </div>
          <div className="field">
            <label htmlFor="code">Design code</label>
            <input id="code" name="code" defaultValue={item?.code} autoComplete="off" spellCheck={false} placeholder="Automatic…" />
            <p className="help">Leave empty for the next code. Pieces of the same design share it.{item?.piece ? ` This is piece #${item.piece}.` : ""}</p>
          </div>
        </div>

        <fieldset className="form-grid">
          <legend>Price</legend>
          <div className="segmented" role="radiogroup" aria-label="Pricing mode">
            {(["weight", "fixed"] as const).map((m) => (
              <label key={m}>
                <input type="radio" name="pricingMode" checked={pricing === m} onChange={() => setPricing(m)} />
                <span>{m === "weight" ? "Weight × today’s rate" : "Fixed price"}</span>
              </label>
            ))}
          </div>
          {pricing === "weight" ? (
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="rateKey">Purity / rate category</label>
                <select id="rateKey" {...bind("rateKey")}>
                  {rates.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                      {r.perGram ? ` · ${rupees(r.perGram)}/g` : " · rate not set"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="weight">Gross weight of this piece (g) *</label>
                <input id="weight" type="text" inputMode="decimal" autoComplete="off" {...bind("weight")} />
              </div>
              <div className="field">
                <label htmlFor="netWeight">Billable gold weight (g)</label>
                <input id="netWeight" type="text" inputMode="decimal" autoComplete="off" placeholder={f.weight ? `${f.weight}…` : ""} {...bind("netWeight")} />
                <p className="help">Only if stones or beads are excluded. Empty means the gross weight.</p>
              </div>
              <div className="field">
                <label htmlFor="making">Making charge (%)</label>
                <input id="making" type="text" inputMode="decimal" autoComplete="off" placeholder={`${makingPct} (store default)…`} {...bind("making")} />
              </div>
              <div className="field">
                <label htmlFor="extraCharge">Additional charges (₹)</label>
                <input id="extraCharge" type="text" inputMode="numeric" autoComplete="off" {...bind("extraCharge")} />
              </div>
              <div className="field">
                <label htmlFor="extraLabel">What the additional charge is for</label>
                <input id="extraLabel" name="extraLabel" defaultValue={item?.extraLabel} autoComplete="off" placeholder="Stone setting…" />
              </div>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="fixedPrice">Fixed price (₹, tax included) *</label>
              <input id="fixedPrice" type="text" inputMode="numeric" autoComplete="off" {...bind("fixedPrice")} />
              <input type="hidden" name="weight" value={f.weight} />
            </div>
          )}
          {pricing === "fixed" && (
            <>
              <input type="hidden" name="rateKey" value={f.rateKey} />
              <input type="hidden" name="netWeight" value={f.netWeight} />
              <input type="hidden" name="making" value={f.making} />
              <input type="hidden" name="extraCharge" value={f.extraCharge} />
            </>
          )}
          {pricing === "weight" && <input type="hidden" name="fixedPrice" value={f.fixedPrice} />}
        </fieldset>

        <fieldset className="form-grid">
          <legend>Stock &amp; visibility</legend>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="qty">Quantity in stock *</label>
              <input id="qty" name="qty" type="number" inputMode="numeric" min="0" step="1" required defaultValue={v(item?.qty ?? 1)} />
              <p className="help">Usually 1: each piece has its own weight. 0 shows as sold out.</p>
            </div>
            <div className="field">
              <label htmlFor="status">Visibility</label>
              <select id="status" name="status" defaultValue={item?.status ?? "live"}>
                {Object.entries(STATUSES).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="check-row">
            <input type="checkbox" name="featured" defaultChecked={item?.featured} /> Feature on the home page
          </label>
        </fieldset>

        <fieldset className="form-grid">
          <legend>Verified details (optional)</legend>
          <p className="help">Only what the store has confirmed. Empty rows are hidden.</p>
          <div className="form-grid two">
            {Object.entries(DETAILS).map(([k, label]) => (
              <div className="field" key={k}>
                <label htmlFor={k}>{label}</label>
                <input id={k} name={k} defaultValue={item?.[k as keyof typeof DETAILS]} autoComplete="off" placeholder={PLACEHOLDERS[k as keyof typeof DETAILS]} />
              </div>
            ))}
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} defaultValue={item?.description} placeholder="Handmade with…" />
          </div>
        </fieldset>

        <fieldset className="form-grid">
          <legend>Photos</legend>
          <p className="help">The first photo is the cover. Use ← → to reorder. Large, well-lit photos sell best.</p>
          <ul className="photos">
            {photos.map((p, i) => (
              <li key={p} className="photo">
                <Photo id={p} alt={`Photo ${i + 1}`} sizes="120px" w={240} h={300} />
                {i === 0 && <span className="cover-tag">Cover</span>}
                <span className="photo-move">
                  <button type="button" className="photo-btn" aria-label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)}>
                    ←
                  </button>
                  <button type="button" className="photo-btn" aria-label={`Move photo ${i + 1} later`} disabled={i === photos.length - 1} onClick={() => move(i, 1)}>
                    →
                  </button>
                </span>
                <button type="button" className="photo-btn remove-btn" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(photos.filter((x) => x !== p))}>
                  <CloseIcon size={16} />
                </button>
              </li>
            ))}
            <li>
              <label className="upload" aria-busy={uploading > 0}>
                <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading > 0} onChange={(e) => (upload(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
                <PlusIcon size={22} />
                <span>{uploading ? `Uploading ${uploading}…` : "Add Photos"}</span>
              </label>
            </li>
          </ul>
          {uploadError && (
            <p className="error" role="alert">
              {uploadError}
            </p>
          )}
        </fieldset>

        <fieldset className="form-grid">
          <legend>Video (optional)</legend>
          <p className="help">One short clip, ideally under 30 seconds, turning the piece in good light. Customers see it after the photos, playing silently on a loop.</p>
          <ul className="photos">
            <li className={video ? "photo" : undefined}>
              {video ? (
                <>
                  <video src={videoUrl(video)} poster={videoPoster(video, 400)} muted loop playsInline autoPlay preload="metadata" aria-label="Product video" />
                  <button type="button" className="photo-btn remove-btn" aria-label="Remove video" onClick={() => setVideo(null)}>
                    <CloseIcon size={16} />
                  </button>
                </>
              ) : (
                <label className="upload" aria-busy={videoBusy}>
                  <input type="file" accept="video/*" className="sr-only" disabled={videoBusy} onChange={(e) => (uploadVideo(e.target.files?.[0]), (e.target.value = ""))} />
                  <PlayIcon size={22} />
                  <span>{videoBusy ? "Uploading video…" : "Add a Video"}</span>
                </label>
              )}
            </li>
          </ul>
          {videoError && (
            <p className="error" role="alert">
              {videoError}
            </p>
          )}
        </fieldset>
      </div>

      <aside className="panel preview-panel" aria-label="Price preview">
        <p className="eyebrow">Customer price preview</p>
        {preview ? (
          <>
            <p className="preview-total">{rupees(preview.total)}</p>
            {!preview.fixed && (
              <dl className="breakdown compact">
                <div>
                  <dt>{rate?.label} at {rupees(rate?.perGram ?? 0)}/g</dt>
                  <dd>{preview.billable} g</dd>
                </div>
                <div>
                  <dt>Metal value</dt>
                  <dd>{rupees(preview.metal)}</dd>
                </div>
                <div>
                  <dt>Making ({preview.makingPct}%)</dt>
                  <dd>{rupees(preview.making)}</dd>
                </div>
                {preview.extra > 0 && (
                  <div>
                    <dt>Additional</dt>
                    <dd>{rupees(preview.extra)}</dd>
                  </div>
                )}
                <div>
                  <dt>Tax ({preview.taxPct}%)</dt>
                  <dd>{rupees(preview.tax)}</dd>
                </div>
              </dl>
            )}
            {preview.stale && <p className="badge-warn">Rate not updated today</p>}
          </>
        ) : (
          <p className="muted">{pricing === "weight" ? (rate?.perGram ? "Enter the weight to see the price." : `Set the ${rate?.label ?? ""} rate first, on the Rates page.`) : "Enter the fixed price."}</p>
        )}
        {error && (
          <p id="item-error" className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving || uploading > 0 || videoBusy}>
          {saving ? "Saving…" : item ? "Save Changes" : "Add Product"}
        </button>
        {item && (
          <Link href={`/item/${item.id}`} className="btn btn-quiet btn-block" target="_blank">
            Preview as Customer
          </Link>
        )}
      </aside>
      <div className="save-bar">
        <span className="save-bar-total">{preview ? rupees(preview.total) : ""}</span>
        <button type="submit" className="btn btn-primary" disabled={saving || uploading > 0 || videoBusy}>
          {saving ? "Saving…" : item ? "Save Changes" : "Add Product"}
        </button>
      </div>
    </form>
  );
}

// Stock management: search, filter by state, and the everyday actions on each row.
export function StockList({ items, prices }: { items: Item[]; prices: Record<string, number | null> }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | Status | "sold">("all");
  const shown = items.filter((i) => {
    const hit = !q || `${i.name} ${i.code} ${i.category} #${i.piece}`.toLowerCase().includes(q.toLowerCase());
    const inTab = tab === "all" ? i.status !== "archived" : tab === "sold" ? i.qty <= 0 && i.status === "live" : i.status === tab;
    return hit && inTab;
  });
  const tabs = { all: "Active", live: "Live", draft: "Drafts", sold: "Sold out", archived: "Archived" } as const;
  return (
    <>
      <div className="stock-tools">
        <label className="search">
          <SearchIcon size={20} />
          <span className="sr-only">Search products</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, code or piece number…" autoComplete="off" />
        </label>
        <div className="chips" role="group" aria-label="Show">
          {Object.entries(tabs).map(([k, label]) => (
            <button key={k} type="button" className="chip" aria-pressed={tab === k} onClick={() => setTab(k as typeof tab)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {shown.length ? (
        <ul className="admin-items">
          {shown.map((it) => (
            <li key={it.id} className="admin-item">
              <Link href={`/admin/item/${it.id}`} className="thumb" tabIndex={-1} aria-hidden="true">
                <Photo id={it.photos[0]} alt="" sizes="64px" w={128} h={160} />
              </Link>
              <div className="admin-item-info">
                <Link href={`/admin/item/${it.id}`} className="line-name">
                  {it.name}
                </Link>
                <p className="code">{[it.code, it.piece && `#${it.piece}`, it.weight ? `${it.weight} g` : "no weight"].filter(Boolean).join(" · ")}</p>
                <p className="small">
                  {prices[it.id] != null ? rupees(prices[it.id]!) : "Price on request"}
                  {it.status !== "live" && <span className="badge-muted"> {it.status}</span>}
                  {it.demo && <span className="badge-muted"> sample</span>}
                  <span className="muted"> · {it.views} views · {it.enquiries} enquiries</span>
                </p>
              </div>
              <div className="admin-item-actions">
                <div className="stepper" role="group" aria-label={`Stock for ${it.name}`}>
                  <form action={setQty.bind(null, it.id, it.qty - 1)}>
                    <button type="submit" aria-label="One less in stock" disabled={it.qty <= 0}>
                      <MinusIcon size={18} />
                    </button>
                  </form>
                  <output aria-label="In stock">{it.qty}</output>
                  <form action={setQty.bind(null, it.id, it.qty + 1)}>
                    <button type="submit" aria-label="One more in stock">
                      <PlusIcon size={18} />
                    </button>
                  </form>
                </div>
                <div className="row-actions">
                  {it.qty > 0 && it.status === "live" && (
                    <form action={markSold.bind(null, it.id)} onSubmit={(e) => confirm(`Mark one “${it.name}” as sold? Stock goes down by 1 and the sale is logged.`) || e.preventDefault()}>
                      <button type="submit" className="btn btn-quiet btn-sm">
                        Mark Sold
                      </button>
                    </form>
                  )}
                  <form action={duplicateItem.bind(null, it.id)}>
                    <button type="submit" className="btn btn-quiet btn-sm" title="New piece of this design, with its own weight">
                      <CopyIcon size={16} /> New Piece
                    </button>
                  </form>
                  <form action={setStatus.bind(null, it.id, it.status === "archived" ? "draft" : "archived")}>
                    <button type="submit" className="btn btn-quiet btn-sm">
                      {it.status === "archived" ? (
                        <>
                          <BackIcon size={16} /> Restore
                        </>
                      ) : (
                        "Archive"
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted empty-small">{items.length ? "No products match." : "No products yet. Add the first piece with its photos and weight."}</p>
      )}
    </>
  );
}

export function EnquiryStatusSelect({ id, status }: { id: string; status: EnquiryStatus }) {
  return (
    <form action={(fd) => setEnquiryStatus(id, String(fd.get("status")) as EnquiryStatus)}>
      <label className="sr-only" htmlFor={`st-${id}`}>
        Follow-up status
      </label>
      <select id={`st-${id}`} name="status" defaultValue={status} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {Object.entries(ENQUIRY_STATUSES).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
