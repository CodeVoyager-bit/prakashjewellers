"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { trackView } from "@/app/actions";
import { Photo } from "./photo";

export function Submit({ children, pending: pendingText = "Saving…", className = "btn btn-primary", disabled }: { children: ReactNode; pending?: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function TrackView({ id }: { id: string }) {
  useEffect(() => {
    trackView(id);
  }, [id]);
  return null;
}

export function ConfirmForm({ action, message, children }: { action: () => Promise<void>; message: string; children: ReactNode }) {
  return (
    <form action={action} onSubmit={(e) => confirm(message) || e.preventDefault()}>
      {children}
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => print()}>
      Print QR Card
    </button>
  );
}

// Main photo with tappable thumbnails, as in the lookbook's product pages.
export function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [i, setI] = useState(0);
  if (!photos.length)
    return (
      <div className="gallery">
        <div className="shot">
          <Photo alt={`${name}, photo coming soon`} />
        </div>
      </div>
    );
  return (
    <div className="gallery">
      <div className="shot">
        <Photo id={photos[i]} alt={`${name}, photo ${i + 1} of ${photos.length}`} sizes="(min-width: 900px) 55vw, 100vw" w={1200} h={1500} preload={i === 0} />
      </div>
      {photos.length > 1 && (
        <div className="thumbs" role="group" aria-label="Choose photo">
          {photos.map((p, j) => (
            <button key={p} type="button" className="thumb-btn" aria-pressed={j === i} aria-label={`Photo ${j + 1}`} onClick={() => setI(j)}>
              <Photo id={p} alt="" sizes="80px" w={160} h={200} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
