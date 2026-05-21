export interface UploadResult {
  publicId: string;
  width: number;
  height: number;
}

export interface UploadConfig {
  cloudName: string;
  preset: string;
  onProgress?: (percent: number) => void;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Only image files can be uploaded.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Images must be 10 MB or smaller.';
  return null;
}

/** Unsigned direct upload. XHR (not fetch) for upload progress events. */
export function uploadToCloudinary(file: File, config: UploadConfig): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) config.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = JSON.parse(xhr.responseText) as {
          public_id: string;
          width: number;
          height: number;
        };
        resolve({ publicId: body.public_id, width: body.width, height: body.height });
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed (network error)'));
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', config.preset);
    xhr.send(form);
  });
}
