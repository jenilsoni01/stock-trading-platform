import { Router } from 'express';
import { notificationStore } from '../store/firestore.js';

const router = Router();

function extractUserId(req) {
  return req.headers['x-user-id'] || req.query.userId || req.headers['x-forwarded-user'];
}

router.get('/', async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User authentication required' });
  }

  const unreadOnly = req.query.unreadOnly === 'true';
  const limit = parseInt(req.query.limit || '50', 10);

  try {
    const notifications = await notificationStore.getUserNotifications(userId, unreadOnly, limit);
    return res.json({ notifications, count: notifications.length });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to retrieve notifications' });
  }
});

router.patch('/:id/read', async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User authentication required' });
  }

  try {
    const updated = await notificationStore.markAsRead(req.params.id, userId);
    if (!updated) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Notification not found' });
    }
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update notification' });
  }
});

router.post('/read-all', async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User authentication required' });
  }

  try {
    const updatedCount = await notificationStore.markAllAsRead(userId);
    return res.json({ message: 'All notifications marked as read', updatedCount });
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update notifications' });
  }
});

router.get('/preferences', async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User authentication required' });
  }

  try {
    const prefs = await notificationStore.getPreferences(userId);
    return res.json(prefs);
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to get preferences' });
  }
});

router.patch('/preferences', async (req, res) => {
  const userId = extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'User authentication required' });
  }

  try {
    const updated = await notificationStore.updatePreferences(userId, req.body);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to update preferences' });
  }
});

export default router;
