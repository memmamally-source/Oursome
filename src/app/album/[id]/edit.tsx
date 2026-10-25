import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { PanResponder, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AlbumCover, AlbumPageView, useAlbumPhoto } from '@/components/albums/AlbumPageView';
import { ChipRow, DatePicker, Field } from '@/components/forms/Fields';
import { Button, Chip, IconButton, Screen, Segmented, SettingRow, Text, TextField } from '@/components/ui';
import { confirmAction } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { unplaced } from '@/features/albums/auto';
import {
  addNotePage,
  appendPhotos,
  changeLayout,
  movePage,
  removePage,
  replacePhoto,
  setCrop,
  swapPhotos,
  updatePage,
} from '@/features/albums/edit';
import { toIso } from '@/features/albums/exif';
import { addPhotos, whenSettled } from '@/features/albums/importer';
import { layoutById, layoutsFor } from '@/features/albums/layouts';
import { getPhotoBlob } from '@/features/albums/storage';
import { THEMES, TEMPLATES } from '@/features/albums/templates';
import { useAlbum, useAlbums } from '@/features/albums/store';
import type { Album, AlbumPage, CoverDesign, PhotoMeta } from '@/features/albums/types';
import { useSpace } from '@/features/space/store';
import { useLayout } from '@/hooks/useLayout';
import { saveBlob } from '@/lib/files';
import { fonts, radius, space, useTheme } from '@/theme';

const NO_PHOTOS: PhotoMeta[] = [];
type Tab = 'pages' | 'album' | 'photos';
type Sel = { page: number; slot: number } | null;

/** Album editing. Everything is optional: the automatic design is already complete. */
export default function AlbumEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const album = useAlbum(id);
  const all = useAlbums((s) => s.photos);
  const photosList = album ? all.filter((p) => p.albumId === album.id) : NO_PHOTOS;
  const [tab, setTab] = useState<Tab>('pages');

  if (!album) return null;
  const photos = new Map(photosList.map((p) => [p.id, p]));
  // Shared albums someone else made are view-only unless they allow editing.
  const canEdit = album.authorId === 'me' || (album.visibility === 'shared' && !!album.membersCanEdit);

  return (
    <Screen wide>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg }}>
        <IconButton
          icon="chevron-back"
          label="Done"
          onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/album/[id]', params: { id: album.id } }))}
        />
        <Text variant="heading" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
          Edit “{album.title}”
        </Text>
        <Button label="Done" size="sm" onPress={() => router.back()} />
      </View>
      {!canEdit ? (
        <Text variant="body" tone="secondary">
          Only the person who made this album can edit it.
        </Text>
      ) : (
        <>
          <Segmented
            value={tab}
            onChange={setTab}
            accent="coral"
            options={[
              { value: 'pages', label: 'Pages', icon: 'document-outline' },
              { value: 'album', label: 'Album', icon: 'book-outline' },
              { value: 'photos', label: `Photos · ${photosList.length}`, icon: 'images-outline' },
            ]}
          />
          <View style={{ height: space.lg }} />
          {tab === 'pages' ? (
            <PagesTab album={album} photos={photos} />
          ) : tab === 'album' ? (
            <AlbumTab album={album} photos={photos} />
          ) : (
            <PhotosTab album={album} photos={photos} list={photosList} />
          )}
        </>
      )}
    </Screen>
  );
}

// ───────────────────────── Pages ─────────────────────────

function PagesTab({ album, photos }: { album: Album; photos: Map<string, PhotoMeta> }) {
  const { palette } = useTheme();
  const { width, isWide } = useLayout();
  const [current, setCurrent] = useState(0);
  const [sel, setSel] = useState<Sel>(null);
  const [swapFrom, setSwapFrom] = useState<Sel>(null);
  const [picking, setPicking] = useState(false);
  const pages = album.pages;
  const page = pages[Math.min(current, pages.length - 1)];
  const save = (next: AlbumPage[]) => useAlbums.getState().setPages(album.id, next);
  const loose = unplaced(
    album.photoIds.filter((pid) => photos.get(pid)?.status === 'ready'),
    pages,
  );
  const big = Math.min(isWide ? 460 : width - 40, 520);

  if (!page) return <Text tone="secondary">No pages yet.</Text>;
  const layout = layoutById(page.layout);
  const options = page.kind === 'photos' ? layoutsFor(page.slots.length) : [];

  const tapSlot = (slot: number) => {
    const here = { page: current, slot };
    if (swapFrom) {
      if (swapFrom.page !== here.page || swapFrom.slot !== here.slot) save(swapPhotos(pages, swapFrom, here, photos));
      setSwapFrom(null);
      setSel(here);
      return;
    }
    setSel(sel && sel.page === current && sel.slot === slot ? null : here);
    setPicking(false);
  };
  const selected = sel && sel.page === current ? page.slots[sel.slot] : undefined;

  const go = (i: number) => {
    setCurrent(Math.max(0, Math.min(pages.length - 1, i)));
    if (!swapFrom) setSel(null);
    setPicking(false);
  };

  return (
    <View style={{ gap: space.lg }}>
      {/* Page strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 4 }}>
        {pages.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => go(i)}
            accessibilityRole="button"
            accessibilityLabel={`Page ${i + 1}`}
            aria-selected={i === current}
            style={{ borderWidth: 2, borderColor: i === current ? palette.accents.coral.base : 'transparent', borderRadius: 4 }}>
            <AlbumPageView page={p} album={album} photos={photos} width={56} version="thumb" />
            <Text variant="caption" tone="secondary" align="center">
              {i + 1}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: isWide ? 'row' : 'column', gap: space.xl, alignItems: isWide ? 'flex-start' : 'center' }}>
        <View style={{ gap: space.sm, alignItems: 'center' }}>
          <CropSurface album={album} page={page} pageIndex={current} sel={sel} photos={photos} width={big} onSlotPress={tapSlot} />
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <IconButton icon="chevron-back" label="Previous page" size={36} onPress={() => go(current - 1)} />
            <Text variant="callout" tone="secondary">
              Page {current + 1} of {pages.length}
            </Text>
            <IconButton icon="chevron-forward" label="Next page" size={36} onPress={() => go(current + 1)} />
          </View>
          {swapFrom ? (
            <Text variant="callout" tone="coral">
              Now tap the photo to swap with (any page).
            </Text>
          ) : (
            <Text variant="caption" tone="tertiary">
              Tap a photo to move, crop or replace it.
            </Text>
          )}
        </View>

        <View style={{ flex: 1, gap: space.lg, alignSelf: 'stretch' }}>
          {selected && sel ? (
            <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm }}>
              <Text variant="subheading">This photo</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                <Button label="Swap" icon="swap-horizontal-outline" size="sm" variant="secondary" onPress={() => setSwapFrom(sel)} />
                <Button label="Replace" icon="images-outline" size="sm" variant="secondary" onPress={() => setPicking(!picking)} />
                <Button
                  label="Make cover"
                  icon="book-outline"
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    useAlbums.getState().updateAlbum(album.id, { cover: { ...album.cover, photoId: selected.photoId, crop: undefined } });
                    toast({ message: 'Cover updated' });
                  }}
                />
              </View>
              <Text variant="caption" tone="secondary">
                Crop: drag the photo, or
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(
                  [
                    ['arrow-back', 'Show more of the left', { x: -0.1, y: 0, zoom: 0 }],
                    ['arrow-forward', 'Show more of the right', { x: 0.1, y: 0, zoom: 0 }],
                    ['arrow-up', 'Show more of the top', { x: 0, y: -0.1, zoom: 0 }],
                    ['arrow-down', 'Show more of the bottom', { x: 0, y: 0.1, zoom: 0 }],
                    ['remove', 'Zoom out', { x: 0, y: 0, zoom: -0.15 }],
                    ['add', 'Zoom in', { x: 0, y: 0, zoom: 0.15 }],
                  ] as const
                ).map(([icon, label, d]) => (
                  <IconButton
                    key={label}
                    icon={icon}
                    label={label}
                    size={36}
                    onPress={() =>
                      save(
                        setCrop(pages, sel.page, sel.slot, {
                          x: selected.crop.x + d.x,
                          y: selected.crop.y + d.y,
                          zoom: selected.crop.zoom + d.zoom,
                        }),
                      )
                    }
                  />
                ))}
                <Button
                  label="Reset"
                  size="sm"
                  variant="ghost"
                  onPress={() => save(setCrop(pages, sel.page, sel.slot, { x: 0.5, y: 0.5, zoom: 1 }))}
                />
              </View>
              {picking ? (
                <View style={{ gap: space.sm }}>
                  <Text variant="caption" tone="secondary">
                    {loose.length
                      ? 'Choose a photo that isn’t on a page yet:'
                      : 'Every photo is already on a page. Use Swap to exchange two photos.'}
                  </Text>
                  <ScrollView horizontal contentContainerStyle={{ gap: 6 }}>
                    {loose.map((pid) => (
                      <Thumb
                        key={pid}
                        id={pid}
                        size={64}
                        onPress={() => {
                          save(replacePhoto(pages, sel, pid, photos));
                          setPicking(false);
                        }}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : null}

          {options.length > 1 ? (
            <View style={{ gap: space.sm }}>
              <Text variant="subheading">Page design</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                {options.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      save(pages.map((p, i) => (i === current ? changeLayout(p, l.id, photos) : p)));
                      setSel(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${l.name} design`}
                    aria-selected={l.id === page.layout}
                    style={{ alignItems: 'center', gap: 4 }}>
                    <View
                      style={{
                        borderWidth: 2,
                        borderColor: l.id === page.layout ? palette.accents.coral.base : palette.border,
                        borderRadius: 4,
                      }}>
                      <AlbumPageView page={changeLayout(page, l.id, photos)} album={album} photos={photos} width={64} version="thumb" />
                    </View>
                    <Text variant="caption" tone={l.id === page.layout ? 'primary' : 'secondary'}>
                      {l.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ gap: space.sm }}>
            {page.kind === 'photos' && layout.caption ? (
              <TextField
                label="Caption"
                value={page.caption ?? ''}
                onChangeText={(caption) => save(updatePage(pages, current, { caption }))}
                placeholder="A line about this page"
                maxLength={140}
              />
            ) : null}
            {page.kind !== 'photos' ? (
              <TextField
                label={page.kind === 'divider' ? 'Section title' : 'Title'}
                value={page.title ?? ''}
                onChangeText={(title) => save(updatePage(pages, current, { title }))}
                maxLength={60}
              />
            ) : (
              <TextField
                label="Small heading (optional)"
                value={page.title ?? ''}
                onChangeText={(title) => save(updatePage(pages, current, { title }))}
                placeholder="e.g. The beach, day two"
                maxLength={60}
              />
            )}
            {page.kind !== 'photos' ? (
              <View style={{ gap: 4 }}>
                <Text variant="callout" tone="secondary">
                  {page.kind === 'divider' ? 'Subtitle' : 'Your words'}
                </Text>
                <TextInput
                  value={page.note ?? ''}
                  onChangeText={(note) => save(updatePage(pages, current, { note }))}
                  multiline
                  maxLength={page.kind === 'divider' ? 80 : 1200}
                  placeholder={page.kind === 'divider' ? 'e.g. Age 3' : 'Write what you want to remember…'}
                  placeholderTextColor={palette.textTertiary}
                  accessibilityLabel={page.kind === 'divider' ? 'Subtitle' : 'Your words'}
                  style={{
                    minHeight: page.kind === 'divider' ? 48 : 140,
                    backgroundColor: palette.surface,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: palette.border,
                    padding: space.md,
                    fontFamily: fonts.body,
                    fontSize: 16,
                    color: palette.text,
                    textAlignVertical: 'top',
                  }}
                />
              </View>
            ) : null}
            <Text variant="callout" tone="secondary">
              Date on this page
            </Text>
            <DatePicker
              value={page.date}
              onChange={(date) => save(updatePage(pages, current, { date }))}
              optional
              emptyLabel="None"
              accent="sky"
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Button
              label="Move earlier"
              icon="arrow-back"
              size="sm"
              variant="secondary"
              disabled={current === 0}
              onPress={() => (save(movePage(pages, current, -1)), go(current - 1))}
            />
            <Button
              label="Move later"
              icon="arrow-forward"
              size="sm"
              variant="secondary"
              disabled={current >= pages.length - 1}
              onPress={() => (save(movePage(pages, current, 1)), go(current + 1))}
            />
            <Button
              label="Add a journal page after"
              icon="create-outline"
              size="sm"
              variant="soft"
              accent="lavender"
              onPress={() => {
                save(addNotePage(pages, current, { title: 'A note', note: '' }, photos));
                go(current + 1);
              }}
            />
            <Button
              label="Remove page"
              icon="trash-outline"
              size="sm"
              variant="ghost"
              accent="coral"
              onPress={() =>
                void confirmAction({
                  title: 'Remove this page?',
                  message: 'Its photos stay in the album (under Photos), ready to place again.',
                  confirmLabel: 'Remove',
                  destructive: true,
                }).then((ok) => {
                  if (!ok) return;
                  const before = pages;
                  save(removePage(pages, current));
                  go(current - 1);
                  toast({ message: 'Page removed', action: { label: 'Undo', onPress: () => save(before) } });
                })
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/** The large page: tap photos; drag the selected one to reposition its crop. */
function CropSurface({
  album,
  page,
  pageIndex,
  sel,
  photos,
  width,
  onSlotPress,
}: {
  album: Album;
  page: AlbumPage;
  pageIndex: number;
  sel: Sel;
  photos: Map<string, PhotoMeta>;
  width: number;
  onSlotPress: (slot: number) => void;
}) {
  const active = sel && sel.page === pageIndex ? sel.slot : null;
  const frame = active !== null ? layoutById(page.layout).frames[active] : null;
  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => active !== null && Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderRelease: (_, g) => {
      if (active === null || !frame) return;
      const slot = page.slots[active];
      const fw = frame.w * width;
      const fh = frame.h * (width / 0.8);
      // Dragging the photo right reveals more of its left side.
      const next = setCrop(useAlbums.getState().albums.find((a) => a.id === album.id)!.pages, pageIndex, active, {
        x: slot.crop.x - g.dx / fw / Math.max(1, slot.crop.zoom),
        y: slot.crop.y - g.dy / fh / Math.max(1, slot.crop.zoom),
        zoom: slot.crop.zoom,
      });
      useAlbums.getState().setPages(album.id, next);
    },
  });
  return (
    <View
      {...responder.panHandlers}
      style={{ shadowColor: '#2A1E17', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
      <AlbumPageView page={page} album={album} photos={photos} width={width} onSlotPress={onSlotPress} selectedSlot={active} />
    </View>
  );
}

function Thumb({
  id,
  size,
  onPress,
  selected,
  badge,
}: {
  id: string;
  size: number;
  onPress?: () => void;
  selected?: boolean;
  badge?: string;
}) {
  const { palette } = useTheme();
  const url = useAlbumPhoto(id, 'thumb');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `Photo, ${badge}` : 'Photo'}
      aria-selected={selected}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          overflow: 'hidden',
          backgroundColor: palette.surfaceSunken,
          borderWidth: selected ? 3 : 0,
          borderColor: palette.accents.coral.base,
        }}>
        {url ? <Image source={{ uri: url }} contentFit="cover" style={{ width: '100%', height: '100%' }} /> : null}
        {badge ? (
          <View
            style={{
              position: 'absolute',
              left: 4,
              bottom: 4,
              backgroundColor: 'rgba(30,26,23,0.7)',
              borderRadius: 4,
              paddingHorizontal: 4,
            }}>
            <Text variant="caption" color="#FFF9F0" style={{ fontSize: 10 }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ───────────────────────── Album ─────────────────────────

function AlbumTab({ album, photos }: { album: Album; photos: Map<string, PhotoMeta> }) {
  const { palette } = useTheme();
  const hasSpace = useSpace((s) => !!s.space);
  const update = (patch: Partial<Album>) => useAlbums.getState().updateAlbum(album.id, patch);
  const covers: { key: CoverDesign; name: string }[] = [
    { key: 'photo', name: 'Photo' },
    { key: 'framed', name: 'Framed' },
    { key: 'polaroid', name: 'Polaroid' },
    { key: 'title', name: 'Title only' },
  ];

  return (
    <View style={{ gap: space.xl }}>
      <TextField label="Album name" value={album.title} onChangeText={(title) => update({ title })} maxLength={60} />
      <TextField
        label="Subtitle (optional)"
        value={album.subtitle ?? ''}
        onChangeText={(subtitle) => update({ subtitle: subtitle || undefined })}
        placeholder="e.g. Cornwall · August 2026"
        maxLength={60}
      />
      <TextField
        label="Description (optional)"
        value={album.description ?? ''}
        onChangeText={(description) => update({ description: description || undefined })}
        maxLength={300}
      />
      <Field icon="calendar-outline" label="Date" accent="sky">
        <DatePicker value={album.date} onChange={(date) => update({ date })} optional emptyLabel="No date" accent="sky" />
      </Field>

      <Field icon="book-outline" label="Cover" accent="coral">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
          {covers.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => update({ cover: { ...album.cover, design: c.key } })}
              accessibilityRole="radio"
              aria-checked={album.cover.design === c.key}
              style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  borderWidth: 2,
                  borderColor: album.cover.design === c.key ? palette.accents.coral.base : 'transparent',
                  borderRadius: 4,
                }}>
                <AlbumCover album={{ ...album, cover: { ...album.cover, design: c.key } }} photos={photos} width={96} version="thumb" />
              </View>
              <Text variant="caption">{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text variant="caption" tone="tertiary">
          To change the cover photo, tap a photo on any page and choose “Make cover”.
        </Text>
      </Field>

      <Field icon="color-palette-outline" label="Theme" accent="sunshine">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {THEMES.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => update({ theme: t.key })}
              accessibilityRole="radio"
              aria-checked={album.theme === t.key}
              accessibilityLabel={`${t.name} theme`}
              style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 56,
                  height: 70,
                  borderRadius: 4,
                  backgroundColor: t.page,
                  borderWidth: album.theme === t.key ? 3 : 1,
                  borderColor: album.theme === t.key ? palette.accents.coral.base : palette.border,
                  overflow: 'hidden',
                }}>
                <View style={{ height: 18, backgroundColor: t.cover }} />
                <View style={{ margin: 6, height: 20, backgroundColor: t.mount, borderWidth: 1, borderColor: t.muted, opacity: 0.8 }} />
                <View style={{ marginHorizontal: 6, height: 3, backgroundColor: t.accent }} />
              </View>
              <Text variant="caption">{t.name}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field icon="sparkles-outline" label="Style" accent="lavender">
        <ChipRow>
          {TEMPLATES.map((t) => (
            <Chip
              key={t.key}
              label={t.name}
              icon={t.icon}
              small
              accent="lavender"
              selected={album.template === t.key}
              onPress={() => update({ template: t.key })}
            />
          ))}
        </ChipRow>
        <Button
          label="Redesign every page"
          icon="refresh-outline"
          size="sm"
          variant="secondary"
          onPress={() =>
            void confirmAction({
              title: 'Redesign the whole album?',
              message: 'Oursome lays out every page again in this style. Captions and notes on redesigned pages are lost.',
              confirmLabel: 'Redesign',
            }).then((ok) => {
              if (!ok) return;
              const before = album.pages;
              useAlbums.getState().design(album.id, { fresh: true });
              toast({
                message: 'Album redesigned',
                action: { label: 'Undo', onPress: () => useAlbums.getState().setPages(album.id, before) },
              });
            })
          }
          style={{ alignSelf: 'flex-start' }}
        />
      </Field>

      {album.template === 'growingUp' ? (
        <Field icon="leaf-outline" label={`Birthday${album.person?.name ? ` · ${album.person.name}` : ''}`} accent="mint">
          <DatePicker
            value={album.person?.birthDate}
            onChange={(birthDate) => update({ person: { ...(album.person ?? { name: '' }), birthDate } })}
            optional
            emptyLabel="Not set"
            accent="mint"
          />
          <Text variant="caption" tone="tertiary">
            Each year’s chapter shows their age. Redesign to update existing chapters.
          </Text>
        </Field>
      ) : null}

      <Field icon="people-outline" label="Who can see it" accent="sunshine">
        {hasSpace ? (
          <>
            <Segmented
              value={album.visibility}
              onChange={(visibility) => update({ visibility })}
              accent="sunshine"
              options={[
                { value: 'private', label: 'Just me', icon: 'lock-closed-outline' },
                { value: 'shared', label: 'My family', icon: 'people-outline' },
              ]}
            />
            {album.visibility === 'shared' ? (
              <View style={{ backgroundColor: palette.surface, borderRadius: radius.lg, paddingHorizontal: space.md }}>
                <SettingRow
                  icon="create-outline"
                  accent="sunshine"
                  label="Family can edit"
                  detail="Otherwise they can look but not change it."
                  value={!!album.membersCanEdit}
                  onValueChange={(v) => update({ membersCanEdit: v })}
                />
              </View>
            ) : null}
            <Text variant="caption" tone="tertiary">
              Photos are stored on this device. Seeing an album on other family members’ devices needs cloud photo storage, which isn’t set
              up yet.
            </Text>
          </>
        ) : (
          <Text variant="caption" tone="tertiary">
            Private to you. Create a family in Our Space to share albums.
          </Text>
        )}
      </Field>

      <Button
        label="Delete album"
        icon="trash-outline"
        variant="danger"
        onPress={() =>
          void confirmAction({
            title: `Delete “${album.title}”?`,
            message:
              'The album and its photos are removed from this device. This can’t be undone. Download anything you want to keep first.',
            confirmLabel: 'Delete',
            destructive: true,
          }).then((ok) => {
            if (!ok) return;
            useAlbums.getState().deleteAlbum(album.id);
            router.replace('/albums');
          })
        }
        style={{ alignSelf: 'center' }}
      />
    </View>
  );
}

// ───────────────────────── Photos ─────────────────────────

function PhotosTab({ album, photos, list }: { album: Album; photos: Map<string, PhotoMeta>; list: PhotoMeta[] }) {
  const { width } = useLayout();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const loose = new Set(
    unplaced(
      list.filter((p) => p.status === 'ready').map((p) => p.id),
      album.pages,
    ),
  );
  const size = Math.max(72, Math.min(110, Math.floor((Math.min(width, 1000) - 60) / 6)));

  const add = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      exif: Platform.OS !== 'web',
      quality: 1,
    });
    if (result.canceled) return;
    setBusy(true);
    await addPhotos(
      album.id,
      result.assets.map((a) => ({
        file: a.file,
        uri: a.file ? undefined : a.uri,
        width: a.width || undefined,
        height: a.height || undefined,
        name: a.fileName ?? undefined,
        takenAt: typeof a.exif?.DateTimeOriginal === 'string' ? toIso(a.exif.DateTimeOriginal) : undefined,
      })),
      { keepOriginals: true },
    );
    await whenSettled(album.id);
    // Redesign keeps sections that didn't change; new photos land in their place in time.
    useAlbums.getState().design(album.id);
    setBusy(false);
    toast({ message: 'Photos added to the album' });
  };

  const place = () => {
    useAlbums.getState().setPages(album.id, appendPhotos(album.pages, [...loose], photos));
    toast({ message: 'Added as new pages at the end' });
  };

  const remove = () =>
    void confirmAction({
      title: `Remove ${selected.length} ${selected.length === 1 ? 'photo' : 'photos'}?`,
      message: 'They’re deleted from the album and this device. Pages re-arrange around the gaps.',
      confirmLabel: 'Remove',
      destructive: true,
    }).then((ok) => {
      if (!ok) return;
      useAlbums.getState().removePhotos(album.id, selected);
      setSelected([]);
    });

  const download = async () => {
    for (const pid of selected) {
      const p = photos.get(pid);
      const blob = (await getPhotoBlob(pid, 'original')) ?? (await getPhotoBlob(pid, 'display'));
      if (blob) await saveBlob(p?.name ?? `${pid}.jpg`, blob);
    }
  };

  return (
    <View style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Button label={busy ? 'Adding…' : 'Add photos'} icon="add" size="sm" disabled={busy} onPress={() => void add()} />
        {loose.size ? (
          <Button label={`Place ${loose.size} on new pages`} icon="albums-outline" size="sm" variant="secondary" onPress={place} />
        ) : null}
        {selected.length ? (
          <>
            {Platform.OS === 'web' ? (
              <Button label="Download" icon="download-outline" size="sm" variant="secondary" onPress={() => void download()} />
            ) : null}
            <Button label={`Remove ${selected.length}`} icon="trash-outline" size="sm" variant="ghost" accent="coral" onPress={remove} />
            <Button label="Clear selection" size="sm" variant="ghost" onPress={() => setSelected([])} />
          </>
        ) : null}
      </View>
      <Text variant="caption" tone="tertiary">
        Tap photos to select them. “Not placed” photos are in the album but on no page.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {list.map((p) => (
          <Thumb
            key={p.id}
            id={p.id}
            size={size}
            selected={selected.includes(p.id)}
            badge={
              p.status === 'failed' ? 'Couldn’t prepare' : p.status === 'pending' ? 'Preparing' : loose.has(p.id) ? 'Not placed' : undefined
            }
            onPress={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Icon name="shield-checkmark-outline" size={16} />
        <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
          Photos stay on this device. They’re never public, never shared without your choice, and never used to train AI.
        </Text>
      </View>
    </View>
  );
}
