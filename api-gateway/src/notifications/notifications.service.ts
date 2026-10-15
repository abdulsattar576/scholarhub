import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  PrismaClient as ApplicationPrismaClient,
  NotificationType,
  NotificationPriority,
} from '@prisma/application-client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private applicationPrisma: ApplicationPrismaClient;

  constructor() {
    this.applicationPrisma = new ApplicationPrismaClient();
  }

  async getUserNotifications(userId: string) {
    const notifications = await this.applicationPrisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await this.applicationPrisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      notifications,
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notif = await this.applicationPrisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notif) {
      throw new NotFoundException('Notification not found');
    }

    if (notif.userId !== userId) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    return await this.applicationPrisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.applicationPrisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { updatedCount: result.count };
  }

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    priority?: NotificationPriority;
    link?: string;
    dedupKey?: string;
  }) {
    if (data.dedupKey) {
      const existing = await this.applicationPrisma.notification.findUnique({
        where: { dedupKey: data.dedupKey },
      });
      if (existing) {
        return existing;
      }
    }

    return await this.applicationPrisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || NotificationType.SYSTEM_ANNOUNCEMENT,
        priority: data.priority || NotificationPriority.NORMAL,
        link: data.link,
        dedupKey: data.dedupKey,
      },
    });
  }

  async dispatchDeadlineAlerts(userId: string) {
    const now = new Date();
    const apps = await this.applicationPrisma.application.findMany({
      where: {
        userId,
        status: { notIn: ['REJECTED', 'WITHDRAWN', 'ACCEPTED'] },
      },
    });

    let dispatchedCount = 0;

    for (const app of apps) {
      if (!app.targetDeadline) continue;

      const diffMs = new Date(app.targetDeadline).getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        // Cycle deadline has passed
        const dedupKey = `${userId}-${app.scholarshipId}-closed`;
        const existing = await this.applicationPrisma.notification.findUnique({
          where: { dedupKey },
        });

        if (!existing) {
          await this.applicationPrisma.notification.create({
            data: {
              userId,
              title: `Deadline Passed: ${app.scholarshipTitle}`,
              message: `The active deadline for ${app.scholarshipTitle} (${app.providerName}) has passed. Your application checklist and documents remain preserved in your history.`,
              type: NotificationType.CYCLE_CLOSED,
              priority: NotificationPriority.NORMAL,
              dedupKey,
            },
          });
          dispatchedCount++;
        }
      } else if (daysRemaining <= 14) {
        // Approaching deadline window: 14d, 7d, 3d, 1d
        let window = '14d';
        let priority: NotificationPriority = NotificationPriority.LOW;

        if (daysRemaining <= 1) {
          window = '1d';
          priority = NotificationPriority.URGENT;
        } else if (daysRemaining <= 3) {
          window = '3d';
          priority = NotificationPriority.HIGH;
        } else if (daysRemaining <= 7) {
          window = '7d';
          priority = NotificationPriority.NORMAL;
        }

        const dedupKey = `${userId}-${app.scholarshipId}-deadline-${window}`;
        const existing = await this.applicationPrisma.notification.findUnique({
          where: { dedupKey },
        });

        if (!existing) {
          await this.applicationPrisma.notification.create({
            data: {
              userId,
              title: `Upcoming Deadline: ${app.scholarshipTitle}`,
              message: `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining until the official deadline for ${app.scholarshipTitle} (${app.providerName}). Ensure your verified documents and motivation letter are ready for submission.`,
              type: NotificationType.DEADLINE_REMINDER,
              priority,
              dedupKey,
            },
          });
          dispatchedCount++;
          this.logger.log(`Dispatched deadline alert (${window}) for user ${userId} on ${app.scholarshipTitle}`);
        }
      }
    }

    return {
      evaluatedApplications: apps.length,
      dispatchedCount,
    };
  }
}
