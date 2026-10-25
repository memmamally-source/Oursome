import { Image } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text as RNText, View, type TextStyle } from 'react-native';

import { imageRect } from '@/features/albums/edit';
import { frameAspect, layoutById, type Frame, type TextBox } from '@/features/albums/layouts';
import { cachedPhotoUrl, photoUrl, type Version } from '@/features/albums/storage';
import { themeOf, type Theme } from '@/features/albums/templates';
import { PAGE_ASPECT, type Album, type AlbumPage, type Crop, type PhotoMeta } from '@/features/albums/types';
import { fonts, paperProps } from '@/theme';

/** A stored album photo's address, loaded on demand (pages only ask when shown). */
export function useAlbumPhoto(id: string | undefined, version: Version): string | null {
  const [state, setState] = useState<{ id?: string; v: Version; url: string | null }>({
    id,
    v: version,
    url: id ? cachedPhotoUrl(id, version) : null,
  });
  if (state.id !== id || state.v !== version) setState({ id, v: version, url: id ? cachedPhotoUrl(id, version) : null });
  useEffect(() => {
    if (!id || cachedPhotoUrl(id, version)) return;
    let alive = true;
    photoUrl(id, version)
      .then((url) => alive && setState({ id, v: version, url }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, version]);
  return state.url;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const longDate = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${DAYS[d.getDay()]}\n${d.getDate()} ${LONG_MONTHS[d.getMonth()]}`;
};
export const shortDate = (iso?: string) =>
  iso ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}` : '';

/** One photo in its frame, cropped and positioned exactly as saved. */
export function FramedPhoto({ photo, crop, aspect, version }: { photo?: PhotoMeta; crop: Crop; aspect: number; version: Version }) {
  const url = useAlbumPhoto(photo?.id, version);
  if (!photo) return <View style={{ flex: 1, backgroundColor: '#E6DDD0' }} />;
  const r = imageRect(photo.width && photo.height ? photo.width / photo.height : 1, aspect, crop);
  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#E9E1D5' }}>
      {url ? (
        <Image
          source={{ uri: url }}
          contentFit="fill"
          transition={160}
          accessibilityIgnoresInvertColors
          style={{
            position: 'absolute',
            left: `${r.left * 100}%`,
            top: `${r.top * 100}%`,
            width: `${r.width * 100}%`,
            height: `${r.height * 100}%`,
          }}
        />
      ) : null}
    </View>
  );
}

function Mounted({ frame, theme, children, W, H }: { frame: Frame; theme: Theme; children: ReactNode; W: number; H: number }) {
  const style = frame.style ?? 'plain';
  const shadow = theme.dark
    ? {}
    : {
        shadowColor: '#2A1E17',
        shadowOpacity: style === 'plain' ? 0.08 : 0.2,
        shadowRadius: style === 'plain' ? 3 : 8,
        shadowOffset: { width: 0, height: style === 'plain' ? 1 : 4 },
      };
  const pad = style === 'polaroid' ? frame.w * W * 0.05 : style === 'tape' ? frame.w * W * 0.025 : 0;
  const bottom = style === 'polaroid' ? pad * 3.2 : pad;
  return (
    <View
      style={{
        position: 'absolute',
        left: frame.x * W - pad,
        top: frame.y * H - pad,
        width: frame.w * W + pad * 2,
        height: frame.h * H + pad + bottom,
        padding: pad,
        paddingBottom: bottom,
        backgroundColor: style === 'plain' ? 'transparent' : theme.mount,
        transform: frame.rotate ? [{ rotate: `${frame.rotate}deg` }] : undefined,
        ...shadow,
      }}>
      {children}
      {style === 'tape' ? (
        <>
          <View
            style={{
              position: 'absolute',
              top: -pad * 1.4,
              left: '8%',
              width: '22%',
              height: pad * 3,
              backgroundColor: 'rgba(229,185,109,0.55)',
              transform: [{ rotate: '-8deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: -pad * 1.4,
              right: '8%',
              width: '22%',
              height: pad * 3,
              backgroundColor: 'rgba(135,157,134,0.5)',
              transform: [{ rotate: '7deg' }],
            }}
          />
        </>
      ) : null}
    </View>
  );
}

function Words({ box, W, H, style, children }: { box: TextBox; W: number; H: number; style: TextStyle; children: ReactNode }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: box.x * W,
        top: box.y * H,
        width: box.w * W,
        height: box.h * H,
        justifyContent: box.h > 0.1 ? 'flex-start' : 'center',
      }}>
      <RNText
        style={[{ textAlign: box.align ?? 'center' }, style]}
        numberOfLines={Math.max(1, Math.floor((box.h * H) / ((style.fontSize ?? 12) * 1.45)))}>
        {children}
      </RNText>
    </View>
  );
}

type PageProps = {
  page: AlbumPage;
  album: Pick<Album, 'theme' | 'title'>;
  photos: Map<string, PhotoMeta>;
  width: number;
  /** Thumbnails for small previews; display versions for reading. */
  version?: Version;
  number?: number;
  /** Editing: tap a photo. */
  onSlotPress?: (slot: number) => void;
  selectedSlot?: number | null;
};

/** One album page, drawn from its saved design. */
export function AlbumPageView({ page, album, photos, width: W, version = 'display', number, onSlotPress, selectedSlot }: PageProps) {
  const theme = themeOf(album.theme);
  const H = W / PAGE_ASPECT;
  const layout = layoutById(page.layout);
  const unit = W / 30;
  const serif: TextStyle = { fontFamily: fonts.display, color: theme.ink };
  const body: TextStyle = { fontFamily: fonts.body, color: theme.muted };
  const isTimeline = layout.family === 'timeline' && page.kind === 'photos';
  const dateBox = layout.note ?? (layout.caption && layout.caption.h >= 0.1 ? layout.caption : undefined);

  return (
    <View {...paperProps} style={{ width: W, height: H, backgroundColor: theme.page, overflow: 'hidden' }}>
      {layout.frames.map((frame, i) => {
        const slot = page.slots[i];
        if (!slot) return null;
        const content = <FramedPhoto photo={photos.get(slot.photoId)} crop={slot.crop} aspect={frameAspect(frame)} version={version} />;
        return (
          <Mounted key={i} frame={frame} theme={theme} W={W} H={H}>
            {onSlotPress ? (
              <Pressable
                onPress={() => onSlotPress(i)}
                accessibilityRole="button"
                accessibilityLabel={`Photo ${i + 1}`}
                style={{ flex: 1, outlineStyle: 'none' } as object}>
                {content}
                {selectedSlot === i ? (
                  <View
                    pointerEvents="none"
                    style={{ position: 'absolute', inset: 0, borderWidth: 3, borderColor: theme.accent } as object}
                  />
                ) : null}
              </Pressable>
            ) : (
              content
            )}
          </Mounted>
        );
      })}

      {/* Timeline: dates beside each photo. */}
      {isTimeline
        ? layout.frames.map((f, i) => {
            const p = page.slots[i] && photos.get(page.slots[i].photoId);
            return p?.takenAt ? (
              <View
                key={`d${i}`}
                style={{ position: 'absolute', left: 0.06 * W, top: (f.y + f.h / 2) * H - unit, width: 0.2 * W, alignItems: 'flex-end' }}>
                <RNText style={{ ...serif, fontSize: unit * 1.1, color: theme.accent }}>
                  {shortDate(p.takenAt).split(' ').slice(0, 2).join(' ')}
                </RNText>
                <RNText style={{ ...body, fontSize: unit * 0.8 }}>{p.takenAt.slice(0, 4)}</RNText>
              </View>
            ) : null;
          })
        : null}
      {isTimeline ? (
        <View
          style={{
            position: 'absolute',
            left: 0.275 * W,
            top: 0.06 * H,
            width: 1,
            height: 0.88 * H,
            backgroundColor: theme.muted,
            opacity: 0.35,
          }}
        />
      ) : null}

      {page.kind === 'divider' ? (
        <>
          {layout.title ? (
            <Words box={layout.title} W={W} H={H} style={{ ...serif, fontSize: unit * 2.4 }}>
              {page.title}
            </Words>
          ) : null}
          {layout.note && page.note ? (
            <Words box={layout.note} W={W} H={H} style={{ ...body, fontSize: unit * 1.05, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {page.note}
            </Words>
          ) : null}
        </>
      ) : null}

      {page.kind === 'note' ? (
        <>
          {layout.title && page.title ? (
            <Words box={layout.title} W={W} H={H} style={{ ...serif, fontSize: unit * 1.6 }}>
              {page.title}
            </Words>
          ) : null}
          {layout.note && page.note ? (
            <Words box={layout.note} W={W} H={H} style={{ ...body, color: theme.ink, fontSize: unit * 1.05, lineHeight: unit * 1.7 }}>
              {page.note}
            </Words>
          ) : null}
        </>
      ) : null}

      {/* Roomy caption corners hold the day when there's no caption, so pages never look unfinished. */}
      {page.kind === 'photos' && !page.caption && dateBox && page.date ? (
        <Words box={dateBox} W={W} H={H} style={{ ...serif, fontSize: unit * 1.15, color: theme.accent }}>
          {longDate(page.date)}
        </Words>
      ) : null}

      {page.kind === 'photos' && page.caption && layout.caption ? (
        layout.overlay ? (
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 0.2 * H,
              backgroundColor: 'rgba(20,14,10,0.38)',
              justifyContent: 'flex-end',
              padding: unit * 1.6,
            }}>
            <RNText style={{ ...serif, color: '#FFF9F0', fontSize: unit * 1.3 }} numberOfLines={2}>
              {page.caption}
            </RNText>
          </View>
        ) : (
          <Words box={layout.caption} W={W} H={H} style={{ ...serif, fontSize: unit * 1.05, color: theme.muted }}>
            {page.caption}
          </Words>
        )
      ) : null}
      {page.kind === 'photos' && page.title && !isTimeline ? (
        <View style={{ position: 'absolute', left: 0.08 * W, top: 0.015 * H, right: 0.08 * W }}>
          <RNText style={{ ...serif, fontSize: unit * 0.95, color: theme.accent, letterSpacing: 1 }}>{page.title}</RNText>
        </View>
      ) : null}

      {number && !layout.overlay ? (
        <RNText
          style={{
            position: 'absolute',
            bottom: 0.018 * H,
            width: W,
            textAlign: 'center',
            fontFamily: fonts.body,
            fontSize: unit * 0.7,
            color: theme.muted,
            opacity: 0.8,
          }}>
          {number}
        </RNText>
      ) : null}
    </View>
  );
}

/** The album's cover, in one of four designs. */
export function AlbumCover({
  album,
  photos,
  width: W,
  version = 'display',
}: {
  album: Album;
  photos: Map<string, PhotoMeta>;
  width: number;
  version?: Version;
}) {
  const theme = themeOf(album.theme);
  const H = W / PAGE_ASPECT;
  const unit = W / 30;
  const photo = album.cover.photoId ? photos.get(album.cover.photoId) : undefined;
  const crop = album.cover.crop ?? { x: 0.5, y: 0.45, zoom: 1 };
  const dates = album.date
    ? album.endDate && album.endDate !== album.date
      ? `${shortDate(album.date)} – ${shortDate(album.endDate)}`
      : shortDate(album.date)
    : '';
  const sub = album.subtitle || album.person?.name || dates;
  const title = (color: string, size = 2.6) => (
    <>
      <RNText
        style={{ fontFamily: fonts.display, color, fontSize: unit * size, textAlign: 'center', lineHeight: unit * size * 1.15 }}
        numberOfLines={3}>
        {album.title}
      </RNText>
      {sub ? (
        <RNText
          style={{
            fontFamily: fonts.body,
            color,
            opacity: 0.85,
            fontSize: unit * 0.95,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginTop: unit * 0.6,
          }}>
          {sub}
        </RNText>
      ) : null}
    </>
  );
  const design = photo ? album.cover.design : 'title';

  if (design === 'photo') {
    return (
      <View style={{ width: W, height: H, backgroundColor: theme.cover }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H * 0.74 }}>
          <FramedPhoto photo={photo} crop={crop} aspect={W / (H * 0.74)} version={version} />
        </View>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: H * 0.26,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: unit * 2,
          }}>
          {title(theme.coverInk, 2.3)}
        </View>
      </View>
    );
  }
  if (design === 'framed' || design === 'polaroid') {
    const polaroid = design === 'polaroid';
    const fw = W * (polaroid ? 0.64 : 0.7);
    const fh = fw * (polaroid ? 0.85 : 0.78);
    return (
      <View
        {...paperProps}
        style={{ width: W, height: H, backgroundColor: polaroid ? theme.page : theme.cover, alignItems: 'center', paddingTop: H * 0.1 }}>
        <View
          style={{
            width: fw + (polaroid ? fw * 0.1 : unit * 0.6),
            padding: polaroid ? fw * 0.05 : unit * 0.3,
            paddingBottom: polaroid ? fw * 0.18 : unit * 0.3,
            backgroundColor: theme.mount,
            transform: polaroid ? [{ rotate: '-2.5deg' }] : undefined,
            shadowColor: '#000',
            shadowOpacity: 0.22,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
          }}>
          <View style={{ width: fw, height: fh }}>
            <FramedPhoto photo={photo} crop={crop} aspect={fw / fh} version={version} />
          </View>
        </View>
        <View style={{ marginTop: H * 0.06, paddingHorizontal: unit * 2 }}>{title(polaroid ? theme.ink : theme.coverInk)}</View>
      </View>
    );
  }
  // Title only: cloth with a fine border, like a debossed book.
  return (
    <View style={{ width: W, height: H, backgroundColor: theme.cover, padding: unit * 1.6 }}>
      <View
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: theme.coverInk,
          opacity: 0.9,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: unit * 2,
        }}>
        {title(theme.coverInk, 2.8)}
      </View>
    </View>
  );
}
