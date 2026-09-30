import { jsonError, jsonOk, requestIdFrom, requiredString } from '@/lib/server/http';
import { AppError, CanonicalAd } from '@/lib/server/domain';
import { ingestUploadedAd } from '@/lib/server/providers';
import { persistUploadedImage } from '@/lib/server/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function optionalString(form: FormData, key: string, fallback = '') {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : fallback;
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const form = await request.formData();
    const entry = form.get('file');
    if (!entry || typeof entry !== 'object' || typeof (entry as Blob).arrayBuffer !== 'function') {
      throw new AppError('IMAGE_REQUIRED', 'Choose an advertisement image before uploading.', 400);
    }
    const file = entry as Blob & { name?: string; type?: string; size?: number };
    const upload = await persistUploadedImage(file);
    const ad = await ingestUploadedAd({
      advertiserName: optionalString(form, 'advertiserName', 'Uploaded Creative'),
      headline: optionalString(form, 'headline', file.name || 'Uploaded advertisement'),
      primaryText: optionalString(form, 'primaryText'),
      cta: optionalString(form, 'cta', 'Learn More'),
      platform: (optionalString(form, 'platform', 'Uploaded') || 'Uploaded') as CanonicalAd['platform'],
      creativeType: 'Image',
      mediaUrl: upload.publicUrl,
      metadata: {
        ingestion: 'multipart-image-upload',
        uploadId: upload.uploadId,
        fileName: upload.fileName,
        mimeType: upload.mimeType,
        bytes: upload.bytes,
        storedPath: upload.absolutePath,
      },
    });
    return jsonOk({ ad, upload: { id: upload.uploadId, url: upload.publicUrl, bytes: upload.bytes, mimeType: upload.mimeType } }, requestId, 201);
  } catch (error) {
    return jsonError(error, requestId);
  }
}
