import { Platform, Alert } from 'react-native';

/**
 * Cross-platform alert that works on both web and native.
 * On web, uses window.alert/confirm since RN Alert.alert can be unreliable.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = 'OK',
  cancelText = 'Annuler'
) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, onPress: onConfirm },
    ]);
  }
}

/**
 * Copy text to clipboard (web + native compatible).
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Web: use navigator.clipboard directly (most reliable)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && navigator?.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback: textarea trick for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch {
        return false;
      }
    }
  }

  // Native: use expo-clipboard
  try {
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
