import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from './logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('lydia-reminders', {
        name: "Lydia's Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a855f7',
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    logger.info('notifications', 'requestPermissions', 'Permission result', { granted });
    return granted;
  } catch (e) {
    logger.error('notifications', 'requestPermissions', 'Failed to request permissions', { error: String(e) });
    return false;
  }
}

interface DailyReminder {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
  weekday?: number; // 1=Monday … 7=Sunday (undefined = every day)
}

const DAILY_REMINDERS: DailyReminder[] = [
  // Wake-up
  { id: 'wake-weekday', title: "Rise & Grind 🌅", body: "Time to wake up! Drink 500ml water first thing.", hour: 16, minute: 30 },
  // Water reminders during shift
  { id: 'water-1am',   title: "💧 Hydration check", body: "Drink 250ml water. Stand up and stretch for 2 min.", hour: 1, minute: 0 },
  { id: 'water-3am',   title: "💧 Hydration check", body: "Another glass of water. Walk around briefly.", hour: 3, minute: 30 },
  // Meals
  { id: 'midshift-snack', title: "🍎 Mid-shift snack time", body: "Cottage cheese + apple OR Greek yogurt + almonds.", hour: 2, minute: 0 },
  { id: 'meal3',          title: "🍽️ Night shift meal", body: "Time for Meal 3 — keep fuelling!", hour: 4, minute: 0 },
  { id: 'preslep-snack',  title: "🌙 Pre-sleep snack", body: "Casein shake or cottage cheese before you sleep.", hour: 6, minute: 0 },
  // Supplements
  { id: 'magnesium',   title: "😴 Magnesium time", body: "Take 300mg Magnesium Glycinate before sleep.", hour: 7, minute: 30 },
  // Gym reminders (Mon/Tue/Wed/Thu/Sat)
  { id: 'gym-mon',  title: "🏋️ Gym time after class!", body: "Upper Push today — Chest · Shoulders · Triceps. Let's go!", hour: 20, minute: 15, weekday: 1 },
  { id: 'gym-tue',  title: "🏋️ Gym time after class!", body: "Lower Body today — Glutes · Quads · Hamstrings. You've got this!", hour: 19, minute: 35, weekday: 2 },
  { id: 'gym-wed',  title: "🏋️ Gym time after class!", body: "Upper Pull today — Back · Biceps · Rear Delts. Pull hard!", hour: 19, minute: 35, weekday: 3 },
  { id: 'gym-thu',  title: "🏋️ Optional HIIT + Core", body: "HIIT + Core session tonight. 60 min, max energy!", hour: 18, minute: 0, weekday: 4 },
  { id: 'gym-sat',  title: "🏋️ Full Body Saturday!", body: "Full Body compound lifts today. Biggest workout of the week!", hour: 18, minute: 45, weekday: 6 },
  // Post-workout shake
  { id: 'shake-mon', title: "🥤 Post-workout shake!", body: "Recovery shake now + creatine (5g). Within 30 min!", hour: 21, minute: 30, weekday: 1 },
  { id: 'shake-tue', title: "🥤 Post-workout shake!", body: "Green Goddess shake + creatine (5g). Great session!", hour: 21, minute: 0, weekday: 2 },
  { id: 'shake-wed', title: "🥤 Post-workout shake!", body: "Recovery shake + creatine (5g). Back day done!", hour: 21, minute: 0, weekday: 3 },
  // Sunday meal prep
  { id: 'meal-prep', title: "🥘 Sunday Meal Prep!", body: "Batch cook time! Chicken, rice, veggies & eggs for the week.", hour: 19, minute: 0, weekday: 7 },
];

export async function scheduleAllReminders(): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      logger.info('notifications', 'scheduleAll', 'Permission not granted — skipping');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.info('notifications', 'scheduleAll', 'Scheduling reminders', { count: DAILY_REMINDERS.length });

    let scheduled = 0;
    for (const reminder of DAILY_REMINDERS) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: reminder.id,
          content: {
            title: reminder.title,
            body:  reminder.body,
            sound: true,
            data:  { id: reminder.id },
          },
          trigger: {
            type:    Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: reminder.weekday ?? undefined,
            hour:    reminder.hour,
            minute:  reminder.minute,
            repeats: true,
          } as any,
        });
        scheduled++;
      } catch (e) {
        // One failed reminder should not cancel the rest
        logger.warn('notifications', 'scheduleAll', 'Failed to schedule reminder', {
          id: reminder.id, error: String(e),
        });
      }
    }

    logger.info('notifications', 'scheduleAll', 'Scheduling complete', {
      scheduled, total: DAILY_REMINDERS.length,
    });
  } catch (e) {
    logger.error('notifications', 'scheduleAll', 'Unexpected error during scheduling', { error: String(e) });
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.info('notifications', 'cancelAll', 'All reminders cancelled');
  } catch (e) {
    logger.error('notifications', 'cancelAll', 'Failed to cancel reminders', { error: String(e) });
  }
}
