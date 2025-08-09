// backend/utils/email.js - Complete Updated File with Console Fallback
const nodemailer = require('nodemailer');

// Email templates
const emailTemplates = {
  verification: (name, verificationUrl) => ({
    subject: 'Verify Your Email - Wellness Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Wellness Platform!</h1>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6;">
          <h2>Hi ${name || 'there'},</h2>
          <p>Thank you for registering with Numbers Don't Lie Wellness Platform!</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: white; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Wellness Platform Team
          </p>
        </div>
      </div>
    `,
    text: `
      Welcome to Wellness Platform!
      
      Please verify your email address by visiting:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, please ignore this email.
      
      Best regards,
      The Wellness Platform Team
    `
  }),

  passwordReset: (name, resetUrl) => ({
    subject: 'Password Reset Request - Wellness Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Password Reset Request</h1>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6;">
          <h2>Hi ${name || 'there'},</h2>
          <p>We received a request to reset your password.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #ef4444; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="background-color: white; padding: 10px; border-radius: 5px; word-break: break-all;">
            ${resetUrl}
          </p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p style="color: #ef4444;"><strong>⚠️ Important:</strong> If you didn't request this password reset, 
             please ignore this email and your password will remain unchanged.</p>
        </div>
      </div>
    `,
    text: `
      Password Reset Request
      
      Reset your password by visiting:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email.
      
      Best regards,
      The Wellness Platform Team
    `
  }),

  welcome: (name) => ({
    subject: 'Welcome to Wellness Platform - Your Journey Begins!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome Aboard! 🎉</h1>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6;">
          <h2>Hi ${name || 'Wellness Warrior'},</h2>
          <p>Your email has been verified and your account is now active!</p>
          <h3>Here's how to get started:</h3>
          <ol style="line-height: 2;">
            <li><strong>Complete Your Health Profile</strong></li>
            <li><strong>Set Your Fitness Goals</strong></li>
            <li><strong>Track Your Progress</strong></li>
            <li><strong>Get AI Insights</strong></li>
          </ol>
          <p>Remember: <strong>Numbers Don't Lie!</strong> 💪</p>
        </div>
      </div>
    `,
    text: `Welcome to Wellness Platform! Your account is now active!`
  })
};

// Create transporter (with fallback for development)
const createTransporter = () => {
  // If no email config, return null (we'll use console logging instead)
  if (!process.env.EMAIL_HOST) {
    return null;
  }
  
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send email function with console fallback
const sendEmail = async (to, template, data) => {
  try {
    const emailContent = emailTemplates[template](...data);
    
    // Always log in development
    if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL (Development Mode - Not Actually Sent)');
      console.log('='.repeat(60));
      console.log('To:', to);
      console.log('Subject:', emailContent.subject);
      console.log('Template:', template);
      
      // Log important info based on template
      if (template === 'verification' && data[1]) {
        console.log('VERIFICATION LINK:', data[1]);
      } else if (template === 'passwordReset' && data[1]) {
        console.log('RESET LINK:', data[1]);
      }
      
      console.log('='.repeat(60) + '\n');
      
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }
    
    // Try to send real email if configured
    const transporter = createTransporter();
    if (!transporter) {
      console.log('📧 Email service not configured - logged to console instead');
      return { success: true, messageId: 'no-email-service' };
    }
    
    const mailOptions = {
      from: `"Wellness Platform" <${process.env.EMAIL_USER || 'noreply@wellness.com'}>`,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Email sending error:', error);
    // Don't throw - just return failure
    return { success: false, error: error.message };
  }
};

// Specific email sending functions
const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
  return sendEmail(email, 'verification', [name, verificationUrl]);
};

const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  return sendEmail(email, 'passwordReset', [name, resetUrl]);
};

const sendWelcomeEmail = async (email, name) => {
  return sendEmail(email, 'welcome', [name]);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendEmail
};