"use client";

import { useEffect, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { trackView } from "@/app/actions";

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
