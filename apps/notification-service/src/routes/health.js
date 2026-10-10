import { Router } from 'express';
import client from 'prom-client';

const router = Router();
const register = new client.Registry();
client.collectDefaultMetrics({ register });

router.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'notification-service' });
});

router.get('/ready', (req, res) => {
  res.json({ status: 'READY', service: 'notification-service' });
});

router.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

export default router;
