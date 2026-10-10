import dotenv from 'dotenv';
dotenv.config();

const infraHost = process.env.INFRA_HOST || 'localhost';

export const config = {
  port: parseInt(process.env.PORT || process.env.NOTIFICATION_SERVICE_PORT || '8085', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST || `${infraHost}:8088`,
  projectId: process.env.FIRESTORE_PROJECT_ID || 'stp-local',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me-in-production-this-must-be-at-least-256-bits-long-for-hs256',
  kafkaBrokers: (process.env.KAFKA_BOOTSTRAP_SERVERS || `${infraHost}:9092`).split(','),
  kafkaGroupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
};
