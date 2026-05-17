const ENV_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

export const TRANSFORMS = {
  blur: 'w_24,e_blur:200,q_auto,f_auto',
  thumb: 'w_600,c_limit,q_auto,f_auto',
  full: 'w_1600,c_limit,q_auto,f_auto',
} as const;

export function buildUrl(cloudName: string, transform: string, publicId: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transform}/${publicId}`;
}

export const blurUrl = (publicId: string, cloud: string = ENV_CLOUD) =>
  buildUrl(cloud, TRANSFORMS.blur, publicId);
export const thumbUrl = (publicId: string, cloud: string = ENV_CLOUD) =>
  buildUrl(cloud, TRANSFORMS.thumb, publicId);
export const fullUrl = (publicId: string, cloud: string = ENV_CLOUD) =>
  buildUrl(cloud, TRANSFORMS.full, publicId);

export function isConfigured(): boolean {
  return ENV_CLOUD.length > 0;
}
