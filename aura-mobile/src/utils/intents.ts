import * as IntentLauncher from 'expo-intent-launcher';

export const SystemSettings = {
  wifi: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.WIFI_SETTINGS),
  bluetooth: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS),
  battery: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.BATTERY_SAVER_SETTINGS),
  display: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.DISPLAY_SETTINGS),
  sound: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SOUND_SETTINGS),
  security: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.SECURITY_SETTINGS),
  about: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.DEVICE_INFO_SETTINGS),
  notifications: () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.NOTIFICATION_SETTINGS),
};

export function openApp(packageName: string) {
  return IntentLauncher.openApplication(packageName);
}