import { Router } from 'express';
import { NotificationService } from '../services/notificationService.js';

const router = Router();

router.post('/events', async (req, res) => {
  try {
    const event = req.body;
    const notification = await NotificationService.handleDomainEvent(event);
    return res.status(201).json({ status: 'PROCESSED', notification });
  } catch (err) {
    console.error('[Internal] Event handling error:', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
  }
});

router.post('/test', async (req, res) => {
  const { userId, title, message, type } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const notification = await NotificationService.handleDomainEvent({
    eventType: 'orders.executed',
    aggregateId: 'test-order',
    correlationId: 'test-corr',
    payload: {
      userId,
      side: 'BUY',
      quantity: 10,
      symbol: 'TCS',
      pricePaise: 385000,
      totalValuePaise: 3850000,
    },
  });

  return res.status(201).json({ message: 'Test notification created', notification });
});

export default router;
