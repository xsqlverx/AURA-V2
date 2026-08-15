import * as Notifications from 'expo-notifications';

export type ScheduledReminder = {
  id: string;
  title: string;
  body: string;
  trigger: Notifications.NotificationTriggerInput;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestReminderPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminder(reminder: ScheduledReminder): Promise<string> {
  const granted = await requestReminderPermission();
  if (!granted) throw new Error('Notification permission not granted');

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminder.title,
      body: reminder.body,
      sound: true,
    },
    trigger: reminder.trigger,
  });

  return id;
}

export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function listReminders(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

export function timeTrigger(date: Date): Notifications.NotificationTriggerInput {
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
  if (seconds <= 0) return null;
  return { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL };
}

export function dateTrigger(date: Date): Notifications.NotificationTriggerInput {
  return { date, type: Notifications.SchedulableTriggerInputTypes.DATE };
}

export function dailyTrigger(hour: number, minute: number): Notifications.NotificationTriggerInput {
  return { hour, minute, type: Notifications.SchedulableTriggerInputTypes.DAILY };
}

export function weeklyTrigger(dayOfWeek: number, hour: number, minute: number): Notifications.NotificationTriggerInput {
  return { weekday: dayOfWeek, hour, minute, type: Notifications.SchedulableTriggerInputTypes.WEEKLY };
}
