import { router } from 'expo-router';
import { View } from 'react-native';

import { AlbumBook, useVisibleAlbums } from '@/components/albums/AlbumsSection';
import { Button, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { useAlbums } from '@/features/albums/store';
import { useLayout } from '@/hooks/useLayout';
import { layout, space } from '@/theme';

/** Every album, as books on a shelf. */
export default function AlbumsScreen() {
  const albums = useVisibleAlbums();
  const photos = useAlbums((s) => s.photos);
  const { width } = useLayout();
  const columns = width >= 1000 ? 5 : width >= 700 ? 4 : 2;
  const inner = Math.min(width, layout.maxWideContentWidth) - layout.screenPadding * 2;
  const book = Math.floor((inner - space.xl * (columns - 1)) / columns);

  return (
    <Screen wide>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl }}>
        <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/space'))} />
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>
          Photo albums
        </Text>
        <Button label="Create album" icon="add" size="sm" onPress={() => router.push('/album/new')} />
      </View>
      {albums.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xl }}>
          {albums.map((a) => (
            <AlbumBook key={a.id} album={a} photos={photos} width={book} />
          ))}
        </View>
      ) : (
        <EmptyState
          illustration="orb"
          title="Your first album"
          body="Choose photos from a holiday, a birthday or an ordinary Sunday. Oursome lays them out like a printed photo book."
          action="Create an album"
          onAction={() => router.push('/album/new')}
        />
      )}
      <Text variant="caption" tone="tertiary" style={{ marginTop: space.xxl }}>
        Albums and photos are kept on this device. They’re never public and never used to train AI.
      </Text>
    </Screen>
  );
}
