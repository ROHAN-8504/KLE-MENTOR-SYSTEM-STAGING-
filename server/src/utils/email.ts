import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

// HTML escape function to prevent XSS in emails
const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  const htmlEntities: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, char => htmlEntities[char]);
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"KLE Mentor System" <${process.env.SMTP_USER}>`,
    to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw error to prevent API failures due to email issues
  }
};

// Email templates
export const emailTemplates = {
  meetingScheduled: (data: { title: string; dateTime: Date; venue: string; description?: string }) => ({
    subject: `New Meeting: ${escapeHtml(data.title)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: bold; color: #1e40af; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Meeting Scheduled</h1>
          </div>
          <div class="content">
            <div class="detail">
              <span class="label">Title:</span> ${escapeHtml(data.title)}
            </div>
            <div class="detail">
              <span class="label">Date &amp; Time:</span> ${new Date(data.dateTime).toLocaleString()}
            </div>
            <div class="detail">
              <span class="label">Venue:</span> ${escapeHtml(data.venue || 'TBD')}
            </div>
            ${data.description ? `
              <div class="detail">
                <span class="label">Description:</span> ${escapeHtml(data.description)}
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>KLE Mentor System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  meetingReminder: (data: { title: string; dateTime: Date; venue: string }) => ({
    subject: `Reminder: ${escapeHtml(data.title)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: bold; color: #f59e0b; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Reminder</h1>
          </div>
          <div class="content">
            <p>This is a reminder for your upcoming meeting:</p>
            <div class="detail">
              <span class="label">Title:</span> ${escapeHtml(data.title)}
            </div>
            <div class="detail">
              <span class="label">Date &amp; Time:</span> ${new Date(data.dateTime).toLocaleString()}
            </div>
            <div class="detail">
              <span class="label">Venue:</span> ${escapeHtml(data.venue || 'TBD')}
            </div>
          </div>
          <div class="footer">
            <p>KLE Mentor System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcomeEmail: (data: { name: string; role: string }) => ({
    subject: 'Welcome to KLE Mentor System',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to KLE Mentor System</h1>
          </div>
          <div class="content">
            <p>Hello ${escapeHtml(data.name)},</p>
            <p>Welcome to the KLE Mentor System! Your account has been successfully created with the role of <strong>${escapeHtml(data.role)}</strong>.</p>
            <p>You can now log in and start using the system.</p>
            <p>Best regards,<br>KLE Mentor System Team</p>
          </div>
          <div class="footer">
            <p>KLE Mentor System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};
