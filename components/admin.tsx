"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { saveItem, uploadSignature } from "@/app/admin/actions";
import { authClient } from "@/lib/auth-client";
import type { Item } from "@/lib/data";
import { DETAILS } from "@/lib/fields";
import { staffEmail } from "@/lib/staff-email.mjs";
import { CloseIcon, PlusIcon } from "./icons";
import { Photo } from "./photo";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login(fd: FormData) {
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.email({ email: staffEmail(fd.get("phone")), password: String(fd.get("password")) });
    if (!error) return router.replace("/admin");
    setError(error.status === 429 ? "Too many attempts. Wait a minute, then try again." : "That phone number and password don’t match a staff login.");
    setBusy(false);
  }

  return (
    // onSubmit, not action: a form action resets the fields, which would clear the number on a typo.
    <form onSubmit={(e) => (e.preventDefault(), login(new FormData(e.currentTarget)))} className="form-grid">
      <div className="field">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="username" placeholder="98765 43210…" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? "Signing In…" : "Sign In"}
      </button>
    </form>
  );
}

const PLACEHOLDERS = { metal: "22K gold…", stones: "Kundan, pearls…", finish: "Antique…", occasion: "Wedding, festive…", includes: "Necklace and earrings…" };

export function ItemForm({ item, categories }: { item: Item | null; categories: string[] }) {
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const [photos, setPhotos] = useState(item?.photos ?? []);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");

  async function upload(files: File[]) {
    if (!files.length) return;
    setUploadError("");
    setUploading(files.length);
    try {
      const { url, fields } = await uploadSignature();
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
        const res = await fetch(url, { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message);
        setPhotos((p) => [...p, json.public_id]);
        setUploading((n) => n - 1);
      }
    } catch (e) {
      setUploadError(e instanceof Error && e.message ? `Upload failed: ${e.message}` : "Upload failed. Check the connection and try again.");
    }
    setUploading(0);
  }

  // Keeps what the owner typed if the server rejects it (a form action would reset the fields).
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startSaving(async () => setError((await saveItem(null, fd)) ?? ""));
  }

  const v = (n: number | null | undefined) => (n == null ? "" : String(n));

  return (
    <form onSubmit={submit} className="form-grid panel">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      <div className="field">
        <label htmlFor="name">Item name *</label>
        <input id="name" name="name" required defaultValue={item?.name} autoComplete="off" placeholder="Bridal Kundan Necklace…" />
      </div>

      <div className="form-grid two">
        <div className="field">
          <label htmlFor="category">Category</label>
          <input id="category" name="category" list="categories" defaultValue={item?.category} autoComplete="off" placeholder="Necklaces…" />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="code">Design code</label>
          <input id="code" name="code" defaultValue={item?.code} autoComplete="off" spellCheck={false} placeholder="Automatic…" />
          <p className="help">Leave empty for the next code (PJ-001, PJ-002…). Use the code from your Instagram post if it has one.</p>
        </div>
      </div>

      <fieldset className="form-grid">
        <legend>Price &amp; stock</legend>
        <div className="form-grid two">
          <div className="field">
            <label htmlFor="weight">Weight (grams)</label>
            <input id="weight" name="weight" type="number" inputMode="decimal" min="0" step="0.001" defaultValue={v(item?.weight || null)} />
            <p className="help">Price = weight × today’s rate + making + 3% GST.</p>
          </div>
          <div className="field">
            <label htmlFor="making">Making charge (%)</label>
            <input id="making" name="making" type="number" inputMode="decimal" min="0" max="100" step="0.1" defaultValue={v(item?.making)} placeholder="10" />
            <p className="help">Leave empty for the usual 10%.</p>
          </div>
          <div className="field">
            <label htmlFor="fixedPrice">Fixed price (₹, optional)</label>
            <input id="fixedPrice" name="fixedPrice" type="number" inputMode="numeric" min="0" step="1" defaultValue={v(item?.fixedPrice)} />
            <p className="help">Only for pieces sold at a set price. It replaces the rate calculation and includes GST.</p>
          </div>
          <div className="field">
            <label htmlFor="qty">Quantity available *</label>
            <input id="qty" name="qty" type="number" inputMode="numeric" min="0" step="1" required defaultValue={v(item?.qty ?? 1)} />
            <p className="help">Set 0 when sold out. It then shows as “Made to order”.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="form-grid">
        <legend>Details (optional)</legend>
        <p className="help">Shown in the details table on the piece’s page. Empty rows are hidden.</p>
        <div className="form-grid two">
          {Object.entries(DETAILS).map(([k, label]) => (
            <div className="field" key={k}>
              <label htmlFor={k}>{label}</label>
              <input id={k} name={k} defaultValue={item?.[k as keyof typeof DETAILS]} autoComplete="off" placeholder={PLACEHOLDERS[k as keyof typeof DETAILS]} />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={item?.description} placeholder="Handmade in 22K gold with…" />
      </div>

      <fieldset className="form-grid">
        <legend>Photos</legend>
        <p className="help">The first photo is the cover. Large, well-lit photos sell best.</p>
        <ul className="photos">
          {photos.map((p, i) => (
            <li key={p} className="photo">
              <Photo id={p} alt={`Photo ${i + 1}`} sizes="120px" w={240} h={300} />
              {i === 0 ? (
                <span className="cover-tag">Cover</span>
              ) : (
                <button type="button" className="photo-btn cover-btn" onClick={() => setPhotos([p, ...photos.filter((x) => x !== p)])}>
                  Make Cover
                </button>
              )}
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

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={saving || uploading > 0}>
        {saving ? "Saving…" : item ? "Save Changes" : "Add Item"}
      </button>
    </form>
  );
}
