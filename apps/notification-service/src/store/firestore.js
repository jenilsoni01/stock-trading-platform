import { Firestore } from '@google-cloud/firestore';
import { config } from '../config.js';

let db = null;
let useMemoryFallback = false;
const memoryNotifications = new Map();
const memoryPreferences = new Map();

export async function initFirestore() {
  try {
    // If running with emulator host env var, Firestore automatically targets the emulator
    if (config.firestoreEmulatorHost) {
      process.env.FIRESTORE_EMULATOR_HOST = config.firestoreEmulatorHost;
    }

    db = new Firestore({
      projectId: config.projectId,
      customEndpoint: config.firestoreEmulatorHost || undefined,
    });

    console.log(`[Firestore] Initialized Firestore client pointing to ${config.firestoreEmulatorHost || 'default'}`);
  } catch (err) {
    console.warn('[Firestore] Emulator not reachable directly, using in-memory store fallback:', err.message);
    useMemoryFallback = true;
  }
}

export const notificationStore = {
  async createNotification(notification) {
    if (!useMemoryFallback && db) {
      try {
        await db.collection('notifications').doc(notification.id).set(notification);
        return notification;
      } catch (err) {
        console.warn('[Firestore] Error writing to firestore, falling back to memory:', err.message);
        useMemoryFallback = true;
      }
    }
    memoryNotifications.set(notification.id, notification);
    return notification;
  },

  async getUserNotifications(userId, unreadOnly = false, limit = 50) {
    if (!useMemoryFallback && db) {
      try {
        let query = db.collection('notifications').where('userId', '==', userId);
        if (unreadOnly) {
          query = query.where('read', '==', false);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();
        return snapshot.docs.map(doc => doc.data());
      } catch (err) {
        console.warn('[Firestore] Query error, falling back to memory:', err.message);
        useMemoryFallback = true;
      }
    }

    const list = Array.from(memoryNotifications.values())
      .filter(n => n.userId === userId && (!unreadOnly || !n.read))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return list;
  },

  async markAsRead(notificationId, userId) {
    if (!useMemoryFallback && db) {
      try {
        const docRef = db.collection('notifications').doc(notificationId);
        const doc = await docRef.get();
        if (doc.exists && doc.data().userId === userId) {
          await docRef.update({ read: true, readAt: new Date().toISOString() });
          return { ...doc.data(), read: true };
        }
        return null;
      } catch (err) {
        useMemoryFallback = true;
      }
    }

    const n = memoryNotifications.get(notificationId);
    if (n && n.userId === userId) {
      n.read = true;
      n.readAt = new Date().toISOString();
      memoryNotifications.set(notificationId, n);
      return n;
    }
    return null;
  },

  async markAllAsRead(userId) {
    if (!useMemoryFallback && db) {
      try {
        const snapshot = await db.collection('notifications').where('userId', '==', userId).where('read', '==', false).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { read: true, readAt: new Date().toISOString() });
        });
        await batch.commit();
        return snapshot.size;
      } catch (err) {
        useMemoryFallback = true;
      }
    }

    let count = 0;
    for (const [id, n] of memoryNotifications.entries()) {
      if (n.userId === userId && !n.read) {
        n.read = true;
        n.readAt = new Date().toISOString();
        memoryNotifications.set(id, n);
        count++;
      }
    }
    return count;
  },

  async getPreferences(userId) {
    if (!useMemoryFallback && db) {
      try {
        const doc = await db.collection('notification_preferences').doc(userId).get();
        if (doc.exists) {
          return doc.data();
        }
      } catch (err) {
        useMemoryFallback = true;
      }
    }

    return memoryPreferences.get(userId) || {
      userId,
      emailAlerts: true,
      inAppAlerts: true,
      orderExecutionAlerts: true,
      priceAlerts: true,
      marketingAlerts: false,
    };
  },

  async updatePreferences(userId, prefs) {
    const updated = {
      userId,
      emailAlerts: prefs.emailAlerts ?? true,
      inAppAlerts: prefs.inAppAlerts ?? true,
      orderExecutionAlerts: prefs.orderExecutionAlerts ?? true,
      priceAlerts: prefs.priceAlerts ?? true,
      marketingAlerts: prefs.marketingAlerts ?? false,
      updatedAt: new Date().toISOString(),
    };

    if (!useMemoryFallback && db) {
      try {
        await db.collection('notification_preferences').doc(userId).set(updated, { merge: true });
        return updated;
      } catch (err) {
        useMemoryFallback = true;
      }
    }

    memoryPreferences.set(userId, updated);
    return updated;
  },
};
