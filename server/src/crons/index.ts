import cron from 'node-cron';
import Meeting from '../models/Meeting';
import Notification from '../models/Notification';
import Group from '../models/Group';
import { sendEmail, emailTemplates } from '../utils/email';

// Send meeting reminders 24 hours before
export const meetingReminder24h = cron.schedule('0 9 * * *', async () => {
  // Runs every day at 9 AM
  console.log('Running 24h meeting reminder cron...');

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const meetings = await Meeting.find({
      dateTime: { $gte: tomorrow, $lt: dayAfter },
      status: 'scheduled',
      reminderSent: { $ne: true },
    }).populate('groupId');

    for (const meeting of meetings) {
      const group = await Group.findById(meeting.groupId).populate(
        'mentees',
        'email profile.firstName profile.lastName'
      );

      if (!group) continue;

      // Create notifications
      const notifications = (group.mentees as any[]).map((mentee) => ({
        userId: mentee._id,
        title: 'Meeting Reminder',
        message: `Reminder: "${meeting.title}" is scheduled for tomorrow at ${new Date(meeting.dateTime).toLocaleTimeString()}`,
        type: 'meeting',
        refId: meeting._id,
        refModel: 'Meeting',
      }));

      await Notification.insertMany(notifications);

      // Send emails
      const emails = (group.mentees as any[]).map((m) => m.email).filter(Boolean);
      if (emails.length > 0) {
        const template = emailTemplates.meetingReminder({
          title: meeting.title,
          dateTime: meeting.dateTime,
          venue: meeting.venue || meeting.meetingLink || 'TBD',
        });

        await sendEmail({
          to: emails,
          subject: template.subject,
          html: template.html,
        });
      }

      // Mark reminder as sent
      meeting.reminderSent = true;
      await meeting.save();
    }

    console.log(`Sent reminders for ${meetings.length} meetings`);
  } catch (error) {
    console.error('Meeting reminder cron error:', error);
  }
}, {
  scheduled: false, // Don't auto-start
});

// Send meeting reminders 1 hour before
export const meetingReminder1h = cron.schedule('*/15 * * * *', async () => {
  // Runs every 15 minutes
  console.log('Running 1h meeting reminder cron...');

  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHour15Later = new Date(now.getTime() + 75 * 60 * 1000);

    const meetings = await Meeting.find({
      dateTime: { $gte: oneHourLater, $lt: oneHour15Later },
      status: 'scheduled',
      reminderSent1h: { $ne: true },
    }).populate('groupId');

    for (const meeting of meetings) {
      const group = await Group.findById(meeting.groupId).populate('mentees');

      if (!group) continue;

      // Create notifications
      const notifications = (group.mentees as any[]).map((mentee) => ({
        userId: mentee._id,
        title: 'Meeting Starting Soon',
        message: `"${meeting.title}" starts in 1 hour`,
        type: 'meeting',
        refId: meeting._id,
        refModel: 'Meeting',
      }));

      await Notification.insertMany(notifications);

      // Mark reminder as sent
      (meeting as any).reminderSent1h = true;
      await meeting.save();
    }

    console.log(`Sent 1h reminders for ${meetings.length} meetings`);
  } catch (error) {
    console.error('1h meeting reminder cron error:', error);
  }
}, {
  scheduled: false,
});

// Clean up old notifications (older than 30 days)
export const cleanupNotifications = cron.schedule('0 2 * * 0', async () => {
  // Runs every Sunday at 2 AM
  console.log('Running notification cleanup cron...');

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      isRead: true,
    });

    console.log(`Deleted ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error('Notification cleanup cron error:', error);
  }
}, {
  scheduled: false,
});

// Auto-mark past meetings as completed
export const autoCompleteMeetings = cron.schedule('0 * * * *', async () => {
  // Runs every hour
  console.log('Running auto-complete meetings cron...');

  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const result = await Meeting.updateMany(
      {
        dateTime: { $lt: twoDaysAgo },
        status: 'scheduled',
      },
      {
        status: 'completed',
      }
    );

    console.log(`Auto-completed ${result.modifiedCount} meetings`);
  } catch (error) {
    console.error('Auto-complete meetings cron error:', error);
  }
}, {
  scheduled: false,
});

// Start all cron jobs
export const startCronJobs = () => {
  console.log('Starting cron jobs...');
  meetingReminder24h.start();
  meetingReminder1h.start();
  cleanupNotifications.start();
  autoCompleteMeetings.start();
  console.log('Cron jobs started');
};

// Stop all cron jobs
export const stopCronJobs = () => {
  meetingReminder24h.stop();
  meetingReminder1h.stop();
  cleanupNotifications.stop();
  autoCompleteMeetings.stop();
  console.log('Cron jobs stopped');
};
