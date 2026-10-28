// next/image loader: `src` is a Cloudinary public_id; Cloudinary picks format and quality.
export default function cloudinaryLoader({ src, width }: { src: string; width: number }) {
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${src}`;
}
