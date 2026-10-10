import { v4 as uuidv4 } from 'uuid';
import { notificationStore } from '../store/firestore.js';

export class NotificationService {
  static async handleDomainEvent(event) {
    const { eventType, aggregateId, correlationId, payload } = event;

    if (!payload || !payload.userId) {
      console.warn('[NotificationService] Event missing userId in payload:', eventType);
      return null;
    }

    const userId = payload.userId;
    const prefs = await notificationStore.getPreferences(userId);
    if (!prefs.inAppAlerts) {
      return null;
    }

    let title = '';
    let message = '';
    let type = 'INFO';

    switch (eventType) {
      case 'orders.created':
        title = `Order Created: ${payload.side} ${payload.quantity} ${payload.symbol}`;
        message = `Your ${payload.orderType} order to ${payload.side} ${payload.quantity} shares of ${payload.symbol} has been submitted.`;
        type = 'INFO';
        break;

      case 'orders.accepted':
        title = `Order Accepted: ${payload.symbol}`;
        message = `Your ${payload.side} order for ${payload.quantity} shares of ${payload.symbol} has been accepted for execution.`;
        type = 'INFO';
        break;

      case 'orders.executed':
      case 'trades.executed':
        if (!prefs.orderExecutionAlerts) return null;
        const priceInr = (payload.pricePaise / 100).toFixed(2);
        const totalInr = (payload.totalValuePaise / 100).toFixed(2);
        title = `Trade Executed: ${payload.side} ${payload.quantity} ${payload.symbol}`;
        message = `Successfully executed ${payload.side} of ${payload.quantity} shares of ${payload.symbol} at ₹${priceInr} (Total: ₹${totalInr}).`;
        type = 'SUCCESS';
        break;

      case 'orders.rejected':
        title = `Order Rejected: ${payload.symbol}`;
        message = `Your order to ${payload.side} ${payload.quantity} ${payload.symbol} was rejected: ${payload.rejectionReason || 'Unknown error'}.`;
        type = 'ERROR';
        break;

      case 'orders.cancelled':
        title = `Order Cancelled: ${payload.symbol}`;
        message = `Your order for ${payload.symbol} has been cancelled.`;
        type = 'WARNING';
        break;

      case 'wallet.reservation.failed':
        title = `Wallet Reservation Failed`;
        message = `Could not reserve funds for your order: ${payload.reason || 'Insufficient funds'}.`;
        type = 'ERROR';
        break;

      default:
        title = `System Notification`;
        message = `Event received: ${eventType}`;
        type = 'INFO';
    }

    const notification = {
      id: uuidv4(),
      userId,
      title,
      message,
      type,
      eventType,
      aggregateId,
      correlationId,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: payload,
    };

    await notificationStore.createNotification(notification);
    console.log(`[NotificationService] Created notification for user ${userId}: "${title}"`);
    return notification;
  }
}
