// utils/email.js - Email Service for Verification and Password Reset
const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  // For development, you can use Ethereal Email (fake SMTP service)
  // For production, use real SMTP settings
  
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
    // Use Ethereal for development if no email config
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }
  
  // Use configured SMTP settings
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

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
          <p>We received a request to reset your password for your Wellness Platform account.</p>
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
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The Wellness Platform Team
          </p>
        </div>
      </div>
    `,
    text: `
      Password Reset Request
      
      We received a request to reset your password.
      
      Reset your password by visiting:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this password reset, please ignore this email.
      
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
            <li><strong>Complete Your Health Profile</strong> - Tell us about your health metrics and goals</li>
            <li><strong>Set Your Fitness Goals</strong> - Whether it's weight loss, muscle gain, or general fitness</li>
            <li><strong>Track Your Progress</strong> - Monitor your BMI, wellness score, and achievements</li>
            <li><strong>Get AI Insights</strong> - Receive personalized recommendations based on your data</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/profile" 
               style="background-color: #10b981; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Your Profile
            </a>
          </div>
          <p>Remember: <strong>Numbers Don't Lie!</strong> 💪</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 14px;">
            Need help? Reply to this email or visit our support page.<br><br>
            Best regards,<br>
            The Wellness Platform Team
          </p>
        </div>
      </div>
    `,
    text: `
      Welcome to Wellness Platform!
      
      Your email has been verified and your account is now active!
      
      Get started by completing your health profile at:
      ${process.env.FRONTEND_URL}/profile
      
      Best regards,
      The Wellness Platform Team
    `
  }),

  twoFactorCode: (code) => ({
    subject: 'Your 2FA Code - Wellness Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Two-Factor Authentication</h1>
        </div>
        <div style="padding: 20px; background-color: #f3f4f6;">
          <p>Your verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <h1 style="background-color: white; padding: 20px; border-radius: 5px; 
                       letter-spacing: 5px; font-size: 36px;">
              ${code}
            </h1>
          </div>
          <p><strong>This code will expire in 5 minutes.</strong></p>
          <p style="color: #ef4444;">Never share this code with anyone.</p>
        </div>
      </div>
    `,
    text: `Your 2FA code is: ${code}. This code will expire in 5 minutes.`
  })
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const transporter = createTransporter();
    const emailContent = emailTemplates[template](...data);
    
    const mailOptions = {
      from: `"Wellness Platform" <${process.env.EMAIL_USER || 'noreply@wellness.com'}>`,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Log Ethereal URL in development
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

// Specific email sending functions
const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  return sendEmail(email, 'verification', [name, verificationUrl]);
};

const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail(email, 'passwordReset', [name, resetUrl]);
};

const sendWelcomeEmail = async (email, name) => {
  return sendEmail(email, 'welcome', [name]);
};

const send2FACodeEmail = async (email, code) => {
  return sendEmail(email, 'twoFactorCode', [code]);
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  send2FACodeEmail,
  sendEmail
};