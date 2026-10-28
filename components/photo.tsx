import Image from "next/image";
import { GemIcon } from "./icons";

export function Photo({ id, alt, sizes, preload, w = 800, h = 1000 }: { id?: string | null; alt: string; sizes?: string; preload?: boolean; w?: number; h?: number }) {
  if (!id)
    return (
      <div className="ph" role={alt ? "img" : undefined} aria-label={alt || undefined}>
        <GemIcon size={32} />
      </div>
    );
  return <Image src={id} alt={alt} width={w} height={h} sizes={sizes} preload={preload} />;
}
