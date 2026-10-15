import { NotificationsService } from './src/notifications/notifications.service';
import { PrismaClient as ApplicationPrismaClient, NotificationPriority } from '@prisma/application-client';

async function main() {
  console.log('=== TEST SUITE: Student In-App Notifications & Deadline Alerts ===\n');

  const notificationsService = new NotificationsService();
  const prisma = new ApplicationPrismaClient();

  const testUserId = `test-notif-student-${Date.now()}`;

  // 1. Create a System Welcome Notification
  console.log('1. Creating a System Announcement Notification...');
  const notif = await notificationsService.createNotification({
    userId: testUserId,
    title: 'Welcome to ScholarHub Pakistan! 🇵🇰',
    message: 'Explore verified German master’s programs and review your HEC/IBCC document requirements.',
    priority: NotificationPriority.NORMAL,
  });
  console.log(`   ✓ Created notification: ID=${notif.id}, Title="${notif.title}"`);

  // 2. Query User Notifications & Unread Count
  console.log('2. Querying User Notifications...');
  const initial = await notificationsService.getUserNotifications(testUserId);
  console.log(`   ✓ Found ${initial.notifications.length} notifications, Unread count: ${initial.unreadCount}`);
  if (initial.unreadCount !== 1) {
    throw new Error(`Expected unreadCount=1, got ${initial.unreadCount}`);
  }

  // 3. Mark Notification as Read
  console.log('3. Marking Notification as Read...');
  const updated = await notificationsService.markAsRead(notif.id, testUserId);
  console.log(`   ✓ Notification updated: isRead=${updated.isRead}`);
  const afterRead = await notificationsService.getUserNotifications(testUserId);
  console.log(`   ✓ New Unread count: ${afterRead.unreadCount}`);
  if (afterRead.unreadCount !== 0) {
    throw new Error(`Expected unreadCount=0, got ${afterRead.unreadCount}`);
  }

  // 4. Test Deadline Alert Dispatch with Mock Application
  console.log('4. Testing Deadline Alert Engine with 5-day approaching deadline...');
  const mockDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future
  const mockApp = await prisma.application.create({
    data: {
      userId: testUserId,
      scholarshipId: `mock-sch-${Date.now()}`,
      scholarshipTitle: 'DAAD Research Grant 2026',
      providerName: 'German Academic Exchange Service',
      targetDeadline: mockDeadline,
      status: 'PLANNING',
    },
  });

  const alertRun1 = await notificationsService.dispatchDeadlineAlerts(testUserId);
  console.log(`   ✓ Alert Dispatch Run 1: ${alertRun1.dispatchedCount} alert dispatched (Window: 7d)`);

  const userAlerts1 = await notificationsService.getUserNotifications(testUserId);
  console.log(`   ✓ Total notifications now: ${userAlerts1.notifications.length}, Unread: ${userAlerts1.unreadCount}`);
  const deadlineAlert = userAlerts1.notifications.find((n) => n.title.includes('Upcoming Deadline'));
  if (!deadlineAlert) {
    throw new Error('Expected upcoming deadline alert notification not found!');
  }
  console.log(`   ✓ Alert Title: "${deadlineAlert.title}"`);
  console.log(`   ✓ Alert Message: "${deadlineAlert.message}"`);

  // 5. Test Deduplication
  console.log('5. Testing Deduplication Guarantee (Re-running alert dispatch)...');
  const alertRun2 = await notificationsService.dispatchDeadlineAlerts(testUserId);
  console.log(`   ✓ Alert Dispatch Run 2: ${alertRun2.dispatchedCount} alerts dispatched (Expected 0 due to dedupKey)`);
  if (alertRun2.dispatchedCount !== 0) {
    throw new Error(`Deduplication failed: dispatched ${alertRun2.dispatchedCount} duplicate alerts!`);
  }

  // 6. Test Mark All As Read
  console.log('6. Testing Mark All As Read...');
  const markAllResult = await notificationsService.markAllAsRead(testUserId);
  console.log(`   ✓ Marked ${markAllResult.updatedCount} notification(s) as read`);
  const finalState = await notificationsService.getUserNotifications(testUserId);
  console.log(`   ✓ Final unread count: ${finalState.unreadCount}`);

  // Cleanup
  await prisma.notification.deleteMany({ where: { userId: testUserId } });
  await prisma.application.deleteMany({ where: { userId: testUserId } });
  console.log('\n   ✓ Test cleanup complete.');

  console.log('\n=== ALL NOTIFICATION & DEADLINE ALERT TESTS PASSED ===');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

