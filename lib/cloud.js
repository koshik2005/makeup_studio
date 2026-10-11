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

// Returns { url, publicId } if valid image, else null.
export function cleanImage(img) {
  if (!img || !img.url) return null;
  const urlStr = String(img.url).trim();
  try {
    const u = new URL(urlStr);
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      return { url: urlStr.slice(0, 800), publicId: clean(img.publicId || '', 240) };
    }
  } catch {
    return null;
  }
  return null;
}

export async function destroy(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error('Cloudinary destroy failed', publicId, err?.message);
  }
}
