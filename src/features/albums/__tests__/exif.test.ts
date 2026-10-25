import { readExif, swapsSides, toIso } from '../exif';

/** Build a minimal JPEG with an EXIF block: IFD0 (orientation, ExifIFD pointer) → DateTimeOriginal. */
function jpeg({ little, orientation, date }: { little: boolean; orientation?: number; date?: string }): ArrayBuffer {
  const tiff: number[] = [];
  const u16 = (v: number) => (little ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]);
  const u32 = (v: number) =>
    little ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24] : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  const ifd0Entries = (orientation ? 1 : 0) + 1;
  const ifd0 = 8;
  const exifIfd = ifd0 + 2 + ifd0Entries * 12 + 4;
  const dateOffset = exifIfd + 2 + 12 + 4;
  tiff.push(...(little ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(ifd0));
  tiff.push(...u16(ifd0Entries));
  if (orientation) tiff.push(...u16(0x0112), ...u16(3), ...u32(1), ...u16(orientation), 0, 0);
  tiff.push(...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifIfd));
  tiff.push(...u32(0));
  const dateBytes = date ? [...date].map((c) => c.charCodeAt(0)).concat(0) : [0];
  tiff.push(...u16(1), ...u16(0x9003), ...u16(2), ...u32(dateBytes.length), ...u32(dateOffset), ...u32(0));
  tiff.push(...dateBytes);
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = app1.length + 2;
  const bytes = [0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...app1, 0xff, 0xda, 0, 2];
  return Uint8Array.from(bytes).buffer;
}

describe('EXIF', () => {
  it('reads when a photo was taken and how it’s turned (both byte orders)', () => {
    expect(readExif(jpeg({ little: true, orientation: 6, date: '2024:08:12 14:03:22' }))).toEqual({
      orientation: 6,
      takenAt: '2024-08-12T14:03:22',
    });
    expect(readExif(jpeg({ little: false, date: '2019:12:25 09:00:00' }))).toEqual({ takenAt: '2019-12-25T09:00:00' });
  });

  it('copes with photos without EXIF, other formats and junk', () => {
    expect(readExif(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toEqual({});
    expect(readExif(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer)).toEqual({});
    expect(readExif(new ArrayBuffer(0))).toEqual({});
    expect(readExif(jpeg({ little: true, date: '0000:00:00 00:00:00' }))).toEqual({});
  });

  it('formats dates and knows which orientations swap sides', () => {
    expect(toIso('2024:08:12 14:03:22')).toBe('2024-08-12T14:03:22');
    expect(toIso('garbage')).toBeUndefined();
    expect([1, 3, 5, 6, 8].map(swapsSides)).toEqual([false, false, true, true, true]);
  });
});
