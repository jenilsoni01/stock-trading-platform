import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { initFirestore } from './store/firestore.js';
import notificationsRouter from './routes/notifications.js';
import internalRouter from './routes/internal.js';
import healthRouter from './routes/health.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/', healthRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/internal/v1/notifications', internalRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
});

async function bootstrap() {
  await initFirestore();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Notification Service] Listening on port ${config.port} (${config.nodeEnv})`);
  });
}

bootstrap().catch(err => {
  console.error('[Fatal Bootstrap Error]', err);
  process.exit(1);
});
