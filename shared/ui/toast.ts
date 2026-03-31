import { Alert, Platform, ToastAndroid } from 'react-native';

export function showGlobalToast(message: string, title = 'Aviso') {
  if (!message) return;

  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(title, message);
}
