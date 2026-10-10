import { NotificationService } from '../src/services/notificationService.js';

describe('NotificationService Domain Event Processing', () => {
  test('should format trade execution alert into user readable notification', async () => {
    const event = {
      eventType: 'trades.executed',
      aggregateId: 'ord-123',
      correlationId: 'corr-123',
      payload: {
        userId: 'usr-999',
        side: 'BUY',
        quantity: 5,
        symbol: 'INFY',
        pricePaise: 185000,
        totalValuePaise: 925000,
      },
    };

    const notif = await NotificationService.handleDomainEvent(event);
    expect(notif).toBeDefined();
    expect(notif.userId).toBe('usr-999');
    expect(notif.title).toContain('Trade Executed: BUY 5 INFY');
    expect(notif.type).toBe('SUCCESS');
  });
});
