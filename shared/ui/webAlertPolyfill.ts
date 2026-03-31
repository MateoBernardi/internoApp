import { Alert, type AlertButton, type AlertOptions, Platform } from 'react-native';

let isInstalled = false;

function toDialogMessage(title?: string, message?: string): string {
  const safeTitle = String(title ?? '').trim();
  const safeMessage = String(message ?? '').trim();

  if (safeTitle && safeMessage) {
    return `${safeTitle}\n\n${safeMessage}`;
  }

  return safeTitle || safeMessage;
}

function runButton(button?: AlertButton) {
  if (!button?.onPress) return;
  button.onPress();
}

/**
 * Ensures React Native alerts are visible in PWA flows where Alert.alert can fail silently.
 */
export function installWebAlertPolyfill() {
  if (isInstalled || Platform.OS !== 'web') {
    return;
  }

  isInstalled = true;
  const originalAlert = Alert.alert.bind(Alert);

  Alert.alert = ((title?: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => {
    const dialogMessage = toDialogMessage(title, message);

    if (!dialogMessage) {
      originalAlert(title, message, buttons, options);
      return;
    }

    const alertFn = globalThis.alert;
    const confirmFn = globalThis.confirm;

    if (!buttons || buttons.length === 0) {
      if (typeof alertFn === 'function') {
        alertFn(dialogMessage);
        return;
      }

      originalAlert(title, message, buttons, options);
      return;
    }

    if (buttons.length === 1) {
      if (typeof alertFn === 'function') {
        alertFn(dialogMessage);
        runButton(buttons[0]);
        return;
      }

      originalAlert(title, message, buttons, options);
      return;
    }

    if (typeof confirmFn === 'function') {
      const cancelButton = buttons.find((button) => button.style === 'cancel') ?? buttons[0];
      const confirmButton =
        [...buttons].reverse().find((button) => button.style !== 'cancel') ?? buttons[buttons.length - 1];

      if (confirmFn(dialogMessage)) {
        runButton(confirmButton);
      } else {
        runButton(cancelButton);
      }
      return;
    }

    originalAlert(title, message, buttons, options);
  }) as typeof Alert.alert;
}