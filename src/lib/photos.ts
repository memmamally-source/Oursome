import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Pick a photo and return it as a small JPEG data URI kept on this device.
 * Web downsizes it in a canvas (longest side `maxSize`) so it stays around
 * 100–200 KB; phones shrink it the same way with expo-image-manipulator.
 * Returns null if the user cancels or the photo can't be read.
 */
export async function pickPhoto({ maxSize = 900, aspect }: { maxSize?: number; aspect?: [number, number] } = {}): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web' && !!aspect,
    aspect,
    quality: 0.7,
    base64: Platform.OS !== 'web',
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (Platform.OS !== 'web') {
    // Shrink to the same small size as on the web, so journal photos stay light.
    try {
      const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
      const scale = Math.min(1, maxSize / Math.max(asset.width || maxSize, asset.height || maxSize));
      const image = await ImageManipulator.manipulate(asset.uri)
        .resize({ width: Math.max(1, Math.round((asset.width || maxSize) * scale)) })
        .renderAsync();
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
      if (saved.base64) return `data:image/jpeg;base64,${saved.base64}`;
    } catch {
      // Fall back to the picker's own copy.
    }
    return asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
  }
  try {
    return await downscale(asset.uri, maxSize);
  } catch {
    return null;
  }
}

function downscale(uri: string, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => reject(new Error('unreadable image'));
    img.src = uri;
  });
}
