// RN-web's Alert.alert is a NO-OP: every confirm dialog in the app
// (approve/reject/delete) silently did nothing when running in a browser.
// On web we map Alert.alert onto window.confirm / window.alert so the same
// screens work in the dev preview and any web build. Native is untouched.
import { Alert, Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length === 0) {
      window.alert(text);
      return;
    }

    if (buttons.length === 1) {
      window.alert(text);
      buttons[0].onPress?.();
      return;
    }

    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    // Prefer the last non-cancel button (destructive/confirm actions are
    // conventionally listed after Cancel).
    const confirmBtn = [...buttons].reverse().find((b) => b.style !== 'cancel') || buttons[0];

    if (window.confirm(text)) {
      confirmBtn.onPress?.();
    } else {
      cancelBtn?.onPress?.();
    }
  };
}
