import { describe, it, expect } from 'vitest';
import { buildUrl, blurUrl, thumbUrl, fullUrl, TRANSFORMS } from '@/lib/cloudinary';

describe('buildUrl', () => {
  it('assembles cloud, transform and publicId', () => {
    expect(buildUrl('mycloud', 'w_100', 'folder/pic')).toBe(
      'https://res.cloudinary.com/mycloud/image/upload/w_100/folder/pic',
    );
  });
});

describe('variants', () => {
  it('blur variant uses tiny blurred transform', () => {
    expect(blurUrl('pic', 'mycloud')).toBe(
      `https://res.cloudinary.com/mycloud/image/upload/${TRANSFORMS.blur}/pic`,
    );
    expect(TRANSFORMS.blur).toContain('w_24');
    expect(TRANSFORMS.blur).toContain('e_blur');
  });

  it('thumb and full variants use limit-fit autos', () => {
    expect(thumbUrl('pic', 'mycloud')).toContain('/w_600,c_limit,q_auto,f_auto/pic');
    expect(fullUrl('pic', 'mycloud')).toContain('/w_1600,c_limit,q_auto,f_auto/pic');
  });

  it('falls back to env cloud name when not passed', () => {
    expect(thumbUrl('pic')).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/image\/upload\//);
  });
});
