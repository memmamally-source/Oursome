import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text as RNText, View } from 'react-native';

import { AlbumCover, AlbumPageView } from '@/components/albums/AlbumPageView';
import { OrbIdle } from '@/components/brand/Orb';
import { PageTurn } from '@/components/journal/PageTurn';
import { Button, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { unplaced } from '@/features/albums/auto';
import { resumeAlbum, retryFailed, useImports, whenSettled } from '@/features/albums/importer';
import { themeOf } from '@/features/albums/templates';
import { useAlbum, useAlbums } from '@/features/albums/store';
import type { PhotoMeta } from '@/features/albums/types';
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
    <Screen wide>
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
        <PageTurn
          count={pages.length}
          index={shown}
          onIndexChange={setIndex}
          spread={spread}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          renderPage={render}
        />
      ) : null}
    </Screen>
  );
}
