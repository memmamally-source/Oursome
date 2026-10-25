import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text as RNText, View } from 'react-native';

import { AlbumCover, AlbumPageView } from '@/components/albums/AlbumPageView';
import { OrbIdle } from '@/components/brand/Orb';
import { PageTurn } from '@/components/journal/PageTurn';
import { Button, EmptyState, IconButton, Screen, Segmented, Text } from '@/components/ui';
import { unplaced } from '@/features/albums/auto';
import { resumeAlbum, retryFailed, useImports, whenSettled } from '@/features/albums/importer';
import { themeOf } from '@/features/albums/templates';
import { PRINT_SPEC, printChecks, SCREEN_SPEC } from '@/features/albums/print';
import { photoUrl } from '@/features/albums/storage';
import { useAlbum, useAlbums } from '@/features/albums/store';
import type { Album, PhotoMeta } from '@/features/albums/types';
import { saveBlob } from '@/lib/files';
import { toast } from '@/components/ui/Toast';
import { Icon } from '@/components/ui/Icon';
import { useLayout } from '@/hooks/useLayout';
import { fonts, layout, radius, space, useTheme } from '@/theme';

const NO_PHOTOS: PhotoMeta[] = [];

/** Read an album as a book: cover, pages, back cover. */
export default function AlbumReader() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { palette } = useTheme();
  const { width, height } = useLayout();
  const album = useAlbum(id);
  const allPhotos = useAlbums((s) => s.photos);
  const albumPhotos = album ? allPhotos.filter((p) => p.albumId === album.id) : NO_PHOTOS;
  const progress = useImports((s) => s.progress[id]);
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Have the next few pages' photos ready before they're turned to (and keep the previous ones).
  useEffect(() => {
    const a = useAlbums.getState().albums.find((x) => x.id === id);
    if (!a) return;
    const near = a.pages.slice(Math.max(0, index - 3), index + 5);
    for (const page of near) for (const slot of page.slots) void photoUrl(slot.photoId, 'display').catch(() => {});
    if (a.cover.photoId) void photoUrl(a.cover.photoId, 'display').catch(() => {});
  }, [id, index, album?.pages]);

  // Carry on preparing photos, then design whatever isn't on a page yet.
  useEffect(() => {
    if (!id) return;
    resumeAlbum(id);
    let alive = true;
    void whenSettled(id).then(() => {
      const a = useAlbums.getState().albums.find((x) => x.id === id);
      if (!alive || !a) return;
      const ready = useAlbums
        .getState()
        .photos.filter((p) => p.albumId === id && p.status === 'ready')
        .map((p) => p.id);
      if (!a.pages.length || unplaced(ready, a.pages).length) useAlbums.getState().design(id, { fresh: !!fresh && !a.pages.length });
    });
    return () => {
      alive = false;
    };
  }, [id, fresh]);

  if (!album) {
    return (
      <Screen>
        <EmptyState
          illustration="orb"
          title="Album not found"
          body="It may have been deleted."
          action="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const photos = new Map(albumPhotos.map((p) => [p.id, p]));
  const preparing = albumPhotos.some((p) => p.status === 'pending');
  const failed = albumPhotos.filter((p) => p.status === 'failed').length;
  const theme = themeOf(album.theme);

  const spread = width >= 820;
  const items = ['cover', ...album.pages.map((_, i) => i), 'back'] as const;
  const pages: (number | 'cover' | 'back' | 'blank')[] = [...items];
  if (spread && pages.length % 2) pages.splice(pages.length - 1, 0, 'blank');
  const available = Math.min(width, layout.maxWideContentWidth) - layout.screenPadding * 2;
  const pageHeight = Math.floor(Math.min(((spread ? available / 2 : available) / 4) * 5, Math.max(420, height - 230)));
  const pageWidth = Math.floor((pageHeight * 4) / 5);
  const shown = Math.min(spread ? index - (index % 2) : index, pages.length - (spread ? 2 : 1));

  const render = (i: number) => {
    const p = pages[i];
    if (p === 'cover') return <AlbumCover album={album} photos={photos} width={pageWidth} />;
    if (p === 'blank') return <View style={{ flex: 1, backgroundColor: theme.page }} />;
    if (p === 'back')
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.cover,
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingBottom: pageHeight * 0.08,
          }}>
          <RNText style={{ fontFamily: fonts.display, color: theme.coverInk, fontSize: pageWidth / 26, opacity: 0.9 }}>
            {album.title}
          </RNText>
          <RNText style={{ fontFamily: fonts.body, color: theme.coverInk, fontSize: pageWidth / 40, opacity: 0.7, marginTop: 6 }}>
            Made with Oursome
          </RNText>
        </View>
      );
    return <AlbumPageView page={album.pages[p]} album={album} photos={photos} width={pageWidth} number={p + 1} />;
  };

  return (
    // flexGrow lets the book sit in the middle of tall phones instead of leaving a gap below it.
    <Screen wide contentStyle={{ flexGrow: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/albums'))} />
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1} accessibilityRole="header">
            {album.title}
          </Text>
          <Text variant="caption" tone="secondary">
            {album.pages.length} {album.pages.length === 1 ? 'page' : 'pages'} · {albumPhotos.length}{' '}
            {albumPhotos.length === 1 ? 'photo' : 'photos'}
            {album.visibility === 'shared' ? ' · Shared with family' : ' · Private'}
          </Text>
        </View>
        {Platform.OS === 'web' ? (
          <Button
            label="PDF"
            icon="download-outline"
            size="sm"
            variant="secondary"
            disabled={preparing || !album.pages.length}
            onPress={() => setExporting(!exporting)}
          />
        ) : null}
        <Button
          label="Edit"
          icon="create-outline"
          size="sm"
          variant="secondary"
          disabled={preparing}
          onPress={() => router.push({ pathname: '/album/[id]/edit', params: { id: album.id } })}
        />
      </View>

      {preparing ? (
        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: radius.xl,
            padding: space.xl,
            alignItems: 'center',
            gap: space.md,
            marginBottom: space.lg,
          }}>
          <OrbIdle size={56} />
          <Text variant="heading" align="center">
            Designing your album…
          </Text>
          <Text variant="callout" tone="secondary" align="center">
            Preparing photos {progress ? `${progress.done + progress.failed} of ${progress.total}` : ''}. You can leave this page: it
            carries on next time you open the album.
          </Text>
          <View style={{ height: 6, alignSelf: 'stretch', backgroundColor: palette.surfaceSunken, borderRadius: 3, overflow: 'hidden' }}>
            <View
              style={{
                height: 6,
                width: `${progress && progress.total ? Math.round(((progress.done + progress.failed) / progress.total) * 100) : 5}%`,
                backgroundColor: palette.accents.coral.base,
              }}
            />
          </View>
        </View>
      ) : null}

      {exporting ? <ExportPanel album={album} photos={photos} onClose={() => setExporting(false)} /> : null}

      {failed && !preparing ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.md,
            backgroundColor: palette.dangerSoft,
            borderRadius: radius.lg,
            padding: space.md,
            marginBottom: space.lg,
          }}>
          <Text variant="callout" style={{ flex: 1 }}>
            {failed} {failed === 1 ? 'photo' : 'photos'} couldn’t be prepared. Some formats (like HEIC in Chrome) aren’t supported by this
            browser.
          </Text>
          <Button label="Try again" size="sm" variant="secondary" onPress={() => void retryFailed(album.id)} />
        </View>
      ) : null}

      {album.pages.length || !preparing ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <PageTurn
            count={pages.length}
            index={shown}
            onIndexChange={setIndex}
            spread={spread}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            renderPage={render}
          />
        </View>
      ) : null}
    </Screen>
  );
}

/** Download the album as a PDF photo book. */
function ExportPanel({ album, photos, onClose }: { album: Album; photos: Map<string, PhotoMeta>; onClose: () => void }) {
  const { palette } = useTheme();
  const [quality, setQuality] = useState<'print' | 'screen'>('print');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const checks = printChecks(album, photos);

  const run = async () => {
    setProgress({ done: 0, total: album.pages.length + 2 });
    try {
      const { albumPdf } = await import('@/features/albums/pdf');
      const blob = await albumPdf(album, photos, quality === 'print' ? PRINT_SPEC : SCREEN_SPEC, (done, total) =>
        setProgress({ done, total }),
      );
      await saveBlob(`${album.title.replace(/[^\w ,.-]/g, '').trim() || 'Album'}.pdf`, blob);
      toast({ message: `PDF ready (${Math.max(1, Math.round(blob.size / 1e6))} MB)` });
      onClose();
    } catch {
      toast({ message: 'The PDF couldn’t be made. Try the smaller screen version.', tone: 'error' });
    } finally {
      setProgress(null);
    }
  };

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.xl,
        padding: space.lg,
        gap: space.md,
        marginBottom: space.lg,
        borderWidth: 1,
        borderColor: palette.border,
      }}>
      <Text variant="heading">Download as a photo book</Text>
      <Segmented
        value={quality}
        onChange={setQuality}
        accent="coral"
        options={[
          { value: 'print', label: 'For printing', icon: 'print-outline' },
          { value: 'screen', label: 'For sharing', icon: 'phone-portrait-outline' },
        ]}
      />
      <Text variant="caption" tone="secondary">
        {quality === 'print'
          ? '8 × 10 in pages at 300 dpi with 1/8 in bleed, using your original photos where kept. Larger file, ready for a print shop.'
          : 'Smaller file (150 dpi, no bleed) for viewing on screens and sending to family.'}
      </Text>
      {quality === 'print'
        ? checks.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <Icon
                name={c.level === 'ok' ? 'checkmark-circle' : 'alert-circle-outline'}
                size={16}
                color={c.level === 'ok' ? palette.accents.mint.base : palette.accents.sunshine.ink}
              />
              <Text variant="caption" style={{ flex: 1 }}>
                {c.text}
              </Text>
            </View>
          ))
        : null}
      {progress ? (
        <View style={{ gap: 4 }}>
          <Text variant="caption" tone="secondary">
            Making page {Math.min(progress.done + 1, progress.total)} of {progress.total}…
          </Text>
          <View style={{ height: 6, backgroundColor: palette.surfaceSunken, borderRadius: 3, overflow: 'hidden' }}>
            <View
              style={{
                height: 6,
                width: `${Math.round((progress.done / progress.total) * 100)}%`,
                backgroundColor: palette.accents.coral.base,
              }}
            />
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button
          label={progress ? 'Making PDF…' : 'Download PDF'}
          icon="download-outline"
          size="sm"
          disabled={!!progress}
          onPress={() => void run()}
        />
        <Button label="Close" size="sm" variant="ghost" onPress={onClose} />
      </View>
      <Text variant="caption" tone="tertiary">
        Made on this device; nothing is uploaded. Ordering printed books from inside Oursome may come later.
      </Text>
    </View>
  );
}
