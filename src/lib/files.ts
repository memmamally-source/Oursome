import { Platform, Share } from 'react-native';

/** Save text as a file: a download in the browser, the share sheet on phones. */
export async function saveTextFile(name: string, text: string, type = 'text/plain'): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ message: text, title: name });
}

/** Let the person choose a text file in the browser. Resolves null if cancelled or unsupported. */
export function pickTextFile(accept: string): Promise<{ name: string; text: string } | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file
        .text()
        .then((text) => resolve({ name: file.name, text }))
        .catch(() => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
