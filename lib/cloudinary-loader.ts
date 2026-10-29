// next/image loader: `src` is a Cloudinary public_id; Cloudinary picks format and quality.
const base = () => `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;
// Videos: Cloudinary picks the codec phones and browsers play best, capped at 1080px wide.
export const videoUrl = (id: string) => `${base()}/f_auto,q_auto,c_limit,w_1080/${id}`;
// Still frame from the clip's start, shown before it plays and as its thumbnail.
export const videoPoster = (id: string, width = 800) => `${base()}/so_0,q_auto,c_limit,w_${width}/${id}.jpg`;

export default function cloudinaryLoader({ src, width }: { src: string; width: number }) {
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${src}`;
}
