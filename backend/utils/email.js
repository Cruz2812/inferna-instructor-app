const nodemailer = require('nodemailer');

// For testing, we'll just log emails to console
// In production, configure with real SMTP settings

async function sendEmail({ to, subject, text, html }) {
  try {
    // Log to console for testing
    console.log('\n📧 EMAIL NOTIFICATION:');
    console.log('To:', Array.isArray(to) ? to.join(', ') : to);
    console.log('Subject:', subject);
    console.log('Body:', text);
    console.log('---\n');

    // If SMTP is configured, actually send
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@infernafitness.com',
        to: Array.isArray(to) ? to.join(',') : to,
        subject,
        text,
        html: html || text
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return info;
    }

    return { messageId: 'console-only' };
  } catch (error) {
    console.error('❌ Email error:', error);
    // Don't throw - we don't want email failures to break the app
    return null;
  }
}

module.exports = { sendEmail };