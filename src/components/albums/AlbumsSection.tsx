import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useAlbums } from '@/features/albums/store';
import type { Album, PhotoMeta } from '@/features/albums/types';
import { belongsTo } from '@/features/space/families';
import { useSpace } from '@/features/space/store';
import { elevation, radius, space, useTheme } from '@/theme';

import { Icon } from '../ui/Icon';
import { SectionHeader } from '../ui/primitives';
import { Text } from '../ui/Text';

import { AlbumCover } from './AlbumPageView';

/** Albums this person can see: their own private ones, and the active family's shared ones. */
export function useVisibleAlbums(): Album[] {
  const albums = useAlbums((s) => s.albums);
  const family = useSpace((s) => s.space);
  const spaces = useSpace((s) => s.spaces);
  return albums.filter((a) => a.visibility === 'private' || (!!family && belongsTo(a, family.id, spaces)));
}

/** A small closed book on the shelf. */
export function AlbumBook({ album, photos, width }: { album: Album; photos: PhotoMeta[]; width: number }) {
  const { palette } = useTheme();
  const map = new Map(photos.filter((p) => p.albumId === album.id).map((p) => [p.id, p]));
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${album.title}, ${album.pages.length} pages`}
      style={({ pressed }) => ({ width, gap: space.sm, opacity: pressed ? 0.85 : 1 })}>
      <View
        style={[{ borderRadius: 4, overflow: 'hidden', borderLeftWidth: 5, borderLeftColor: 'rgba(0,0,0,0.18)' }, elevation(palette, 2)]}>
        <AlbumCover album={album} photos={map} width={width} version="thumb" />
      </View>
      <View>
        <Text variant="bodyStrong" numberOfLines={1}>
          {album.title}
        </Text>
        <Text variant="caption" tone="secondary">
          {album.pages.length ? `${album.pages.length} pages` : 'Being designed…'}
          {album.visibility === 'shared' ? ' · Shared' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

/** Our Space's photo albums shelf. */
export function AlbumsSection() {
  const { palette } = useTheme();
  const albums = useVisibleAlbums();
  const photos = useAlbums((s) => s.photos);
  return (
    <View style={{ marginBottom: space.xxl }}>
      <SectionHeader
        title="Photo albums"
        icon="images-outline"
        accent="sunshine"
        action={albums.length ? 'All albums' : undefined}
        onAction={() => router.push('/albums')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.lg, paddingVertical: space.sm, paddingRight: space.lg }}>
        <Pressable
          onPress={() => router.push('/album/new')}
          accessibilityRole="button"
          accessibilityLabel="Create an album"
          style={({ pressed }) => ({
            width: 132,
            height: 165,
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: palette.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.sm,
            padding: space.md,
            opacity: pressed ? 0.75 : 1,
          })}>
          <Icon name="add" size={26} color={palette.accents.coral.ink} />
          <Text variant="callout" align="center">
            Create an album
          </Text>
          <Text variant="caption" tone="secondary" align="center">
            Choose photos; Oursome designs the pages
          </Text>
        </Pressable>
        {albums.slice(0, 8).map((a) => (
          <AlbumBook key={a.id} album={a} photos={photos} width={132} />
        ))}
        {!albums.some((a) => a.template === 'growingUp') ? (
          <Pressable
            onPress={() => router.push({ pathname: '/album/new', params: { template: 'growingUp' } })}
            accessibilityRole="button"
            accessibilityLabel="Start a Growing Up album"
            style={({ pressed }) => ({
              width: 132,
              height: 165,
              borderRadius: radius.md,
              backgroundColor: palette.accents.mint.soft,
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
              padding: space.md,
              opacity: pressed ? 0.75 : 1,
            })}>
            <Icon name="leaf-outline" size={24} color={palette.accents.mint.ink} />
            <Text variant="callout" tone="mint" align="center">
              Growing Up
            </Text>
            <Text variant="caption" tone="secondary" align="center">
              One album through the years, a chapter each
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
