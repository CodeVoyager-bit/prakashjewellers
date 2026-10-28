import type { ReactNode } from "react";

// Lucide-style line icons (ISC), decorative: the control next to them carries the label.
const icon = (paths: ReactNode) =>
  function Icon({ size = 20 }: { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths}
      </svg>
    );
  };

export const PhoneIcon = icon(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />);
export const BagIcon = icon(<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>);
export const ChatIcon = icon(<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />);
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);
export const BackIcon = icon(<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>);
export const CloseIcon = icon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const PlusIcon = icon(<><path d="M5 12h14" /><path d="M12 5v14" /></>);
export const MinusIcon = icon(<path d="M5 12h14" />);
export const GemIcon = icon(<><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></>);
export const PinIcon = icon(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>);
