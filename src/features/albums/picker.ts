import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { toIso } from './exif';
import type { Picked } from './importer';

export type PickedPhoto = Picked & { preview: string };

/**
 * Open the photo library for several photos. Resolves [] if the person backs
 * out; throws if the library couldn't be opened or read (shown to them, never
 * swallowed). `onWaiting` fires once photos are chosen and the phone is
 * still handing them over, which can take a few seconds for many photos.
 */
export async function pickPhotos(onWaiting?: () => void): Promise<PickedPhoto[]> {
  onWaiting?.();
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 0,
    orderedSelection: true,
    exif: Platform.OS !== 'web',
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((a) => ({
    file: a.file,
    uri: a.file ? undefined : a.uri,
    width: a.width || undefined,
    height: a.height || undefined,
    name: a.fileName ?? a.file?.name ?? undefined,
    takenAt: typeof a.exif?.DateTimeOriginal === 'string' ? toIso(a.exif.DateTimeOriginal) : undefined,
    preview: a.uri,
  }));
}
