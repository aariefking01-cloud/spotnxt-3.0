import { promises as fs } from 'fs';
import path from 'path';
import { newId, AppError } from './domain';

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function safeExtension(fileName: string, mimeType: string) {
  const fromName = path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fromName)) return fromName;
  return mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : mimeType === 'image/gif' ? '.gif' : '.jpg';
}

export async function persistUploadedImage(file: Blob & { name?: string; type?: string; size?: number }) {
  const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : '';
  const fileSize = typeof file.size === 'number' ? file.size : 0;
  if (!allowedImageTypes.has(mimeType)) {
    throw new AppError('UNSUPPORTED_IMAGE_TYPE', 'Upload a JPG, PNG, WEBP, or GIF advertisement image.', 400, { mimeType });
  }
  if (!fileSize || fileSize > MAX_IMAGE_BYTES) {
    throw new AppError('IMAGE_TOO_LARGE', 'Advertisement images must be between 1 byte and 50MB.', 400, { maxBytes: MAX_IMAGE_BYTES });
  }

  const uploadId = newId('upload');
  const fileName = `${uploadId}${safeExtension(file.name || '', mimeType)}`;
  const uploadDir = process.env.SPOTNXT_UPLOAD_DIR
    ? path.resolve(process.env.SPOTNXT_UPLOAD_DIR)
    : path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== fileSize) {
    throw new AppError('IMAGE_READ_FAILED', 'The uploaded image could not be read completely.', 400);
  }
  await fs.writeFile(path.join(uploadDir, fileName), bytes, { flag: 'wx' });
  return {
    uploadId,
    fileName,
    bytes: bytes.length,
    mimeType,
    publicUrl: `/uploads/${fileName}`,
    absolutePath: path.join(uploadDir, fileName),
  };
}
