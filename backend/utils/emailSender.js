// Lightweight email sender utility with nodemailer fallback.
// It tries to use SMTP settings from environment variables.
// If nodemailer is not installed or SMTP is not configured, it will log the message
// and return false so callers can fall back to dev behavior.

async function sendResetEmail(to, resetUrl) {
  try {
    // lazy-require so code still runs if nodemailer isn't installed
    const nodemailer = require('nodemailer');

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'localhost'}`;

    if (!host || !port) {
      console.warn('SMTP host/port not configured (SMTP_HOST/SMTP_PORT). Email will not be sent.');
      return false;
    }

    const transportOptions = {
      host,
      port,
      secure: port === 465 // true for 465, false for other ports
    };

    // Only include auth when user/pass are present (MailHog / local SMTP often don't use auth)
    if (user && pass) transportOptions.auth = { user, pass };

    const transporter = nodemailer.createTransport(transportOptions);

    const html = `
      <p>Hello,</p>
      <p>You requested a password reset. Click the link below to set a new password (link expires in 1 hour):</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Password reset for your account',
      text: `Reset your password: ${resetUrl}`,
      html
    });

    console.log('Reset email sent:', info && info.messageId ? info.messageId : info);
    return true;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('nodemailer is not installed. Run `npm install nodemailer` in the backend to enable SMTP sending.');
    } else {
      console.error('Error sending reset email:', err);
    }
    return false;
  }
}

async function sendExamAssignmentEmail(to, examTitle, examLink, startTime, endTime, duration) {
  try {
    const nodemailer = require('nodemailer');

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `no-reply@${process.env.SMTP_HOST || 'localhost'}`;

    if (!host || !port) {
      console.warn('SMTP host/port not configured. Exam email will not be sent.');
      return false;
    }

    const transportOptions = { host, port, secure: port === 465 };
    if (user && pass) transportOptions.auth = { user, pass };

    const transporter = nodemailer.createTransport(transportOptions);

    const startStr = startTime ? new Date(startTime).toLocaleString() : 'Flexible';
    const endStr = endTime ? new Date(endTime).toLocaleString() : 'No expiry';
    const durationStr = duration ? `${duration} minutes` : 'Untimed';

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <!-- Header with Legacy Maroon Color -->
        <div style="background-color: #9B1C36; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Assessment Assigned</h1>
        </div>
        
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">You have been assigned a new exam: <strong>${examTitle}</strong>.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #9B1C36; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Start Time:</strong> ${startStr}</p>
            <p style="margin: 5px 0;"><strong>End Time:</strong> ${endStr}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${durationStr}</p>
          </div>

          <!-- Strict Violation Warnings -->
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #9f1239; margin-top: 0; font-size: 16px;">⚠️ Important Exam Rules</h3>
            <ul style="color: #881337; font-size: 14px; margin-bottom: 0; padding-left: 20px;">
              <li><strong>Do not copy-paste</strong> allowed during the exam.</li>
              <li><strong>Do not switch tabs</strong> or windows.</li>
              <li><strong>Do not minimize</strong> the exam screen.</li>
              <li><strong>Do not split the screen</strong>.</li>
              <li><strong>Do not use Windows shortcuts</strong> (e.g., Alt+Tab, Win+D).</li>
              <li><strong>Turn off notifications</strong> before starting to avoid interruptions.</li>
            </ul>
            <p style="font-size: 12px; color: #9f1239; margin-top: 10px; font-style: italic;">
              Violation of these rules may lead to automatic disqualification.
            </p>
          </div>

          <p style="font-size: 16px; color: #333;">Please click the button below to view and start your assessment:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${examLink}" style="background-color: #9B1C36; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Start Assessment</a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">Good luck!</p>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from,
      to,
      subject: `New Exam Assigned: ${examTitle}`,
      text: `You have been assigned the exam "${examTitle}". Duration: ${durationStr}. Access it here: ${examLink}`,
      html
    });

    console.log(`Exam assignment email sent to ${to}:`, info.messageId);
    return true;
  } catch (err) {
    console.error('Error sending exam assignment email:', err);
    return false;
  }
}

module.exports = { sendResetEmail, sendExamAssignmentEmail };
