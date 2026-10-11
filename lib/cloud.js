import { v2 as cloudinary } from 'cloudinary';
import { clean } from './http.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

export function isCloudinaryUrl(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'res.cloudinary.com' &&
      u.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/`)
    );
  } catch {
    return false;
  }
}

// Returns { url, publicId } if the image really lives on our Cloudinary account, else null.
export function cleanImage(img) {
  if (!img || !img.url || !isCloudinaryUrl(img.url)) return null;
  return { url: String(img.url).slice(0, 600), publicId: clean(img.publicId, 240) };
}

export async function destroy(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error('Cloudinary destroy failed', publicId, err?.message);
  }
}
