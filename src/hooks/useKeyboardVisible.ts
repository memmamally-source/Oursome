import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * True while the on-screen keyboard is up. On phones it comes from the
 * keyboard's own events; in a phone browser (or the installed web app) a text
 * field with focus on a touch screen means the keyboard is showing.
 */
export function useKeyboardVisible(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document === 'undefined' || typeof matchMedia === 'undefined') return;
      const update = () => {
        const el = document.activeElement as HTMLElement | null;
        const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
        setShown(typing && matchMedia('(pointer: coarse)').matches);
      };
      const later = () => setTimeout(update, 0);
      document.addEventListener('focusin', update);
      document.addEventListener('focusout', later);
      return () => {
        document.removeEventListener('focusin', update);
        document.removeEventListener('focusout', later);
      };
    }
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}
