import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    const transportOpts: Record<string, unknown> = {
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
    };

    if (user && pass) {
      transportOpts.auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(transportOpts as nodemailer.TransportOptions);
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: 'Verify your LifeLedger account',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">LifeLedger</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Your Digital Life, Organized</p>
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 16px;">Verify your email address</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                Thanks for creating an account. Please verify your email address by clicking the button below.
                This link expires in <strong>24 hours</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" style="background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: 'Reset your LifeLedger password',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">LifeLedger</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Your Digital Life, Organized</p>
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 16px;">Reset your password</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                We received a request to reset your password. Click the button below to create a new one.
                This link expires in <strong>15 minutes</strong>.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
    }
  }

  async sendExpiryWarningEmail(
    email: string,
    documentTitle: string,
    expiryDate: string,
    daysRemaining: number,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const urgencyColor =
      daysRemaining <= 7 ? '#ef4444' : daysRemaining <= 30 ? '#f59e0b' : '#6366f1';

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `⏰ ${documentTitle} expires in ${daysRemaining} days`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">LifeLedger</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Your Digital Life, Organized</p>
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: ${urgencyColor}15; border-radius: 50%; width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">
                  ⏰
                </div>
              </div>
              <h2 style="color: #1a1a2e; font-size: 20px; margin: 0 0 16px; text-align: center;">Document Expiry Warning</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
                Your document <strong>"${documentTitle}"</strong> will expire on
                <strong style="color: ${urgencyColor};">${formattedDate}</strong>.
              </p>
              <div style="background: ${urgencyColor}10; border-left: 4px solid ${urgencyColor}; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                <p style="color: ${urgencyColor}; font-weight: 600; margin: 0; font-size: 18px;">
                  ${daysRemaining} days remaining
                </p>
              </div>
              <p style="color: #4b5563; line-height: 1.6; margin: 16px 0 24px;">
                We recommend renewing this document before it expires to avoid any inconvenience.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/dashboard" style="background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  View in LifeLedger
                </a>
              </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
              You can manage your notification preferences in your LifeLedger settings.
            </p>
          </div>
        `,
      });

      this.logger.log(`Expiry warning email sent to ${email} for "${documentTitle}"`);
    } catch (error) {
      this.logger.error(`Failed to send expiry warning email to ${email}`, error);
    }
  }

  async sendDocumentExpiredEmail(
    email: string,
    documentTitle: string,
    expiryDate: string,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `🚨 ${documentTitle} has expired`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">LifeLedger</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Your Digital Life, Organized</p>
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: #fef2f2; border-radius: 50%; width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">
                  🚨
                </div>
              </div>
              <h2 style="color: #dc2626; font-size: 20px; margin: 0 0 16px; text-align: center;">Document Expired</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
                Your document <strong>"${documentTitle}"</strong> expired on
                <strong style="color: #dc2626;">${formattedDate}</strong>.
              </p>
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                <p style="color: #dc2626; font-weight: 600; margin: 0;">
                  This document is now expired
                </p>
                <p style="color: #7f1d1d; margin: 4px 0 0; font-size: 13px;">
                  Please renew it as soon as possible.
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/dashboard" style="background: #dc2626; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Take Action Now
                </a>
              </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
              You can manage your notification preferences in your LifeLedger settings.
            </p>
          </div>
        `,
      });

      this.logger.log(`Document expired email sent to ${email} for "${documentTitle}"`);
    } catch (error) {
      this.logger.error(`Failed to send document expired email to ${email}`, error);
    }
  }

  async sendSecurityAlertEmail(
    email: string,
    alertTitle: string,
    alertMessage: string,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `🔒 Security Alert: ${alertTitle}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">LifeLedger</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Your Digital Life, Organized</p>
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: #fef2f2; border-radius: 50%; width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px;">
                  🔒
                </div>
              </div>
              <h2 style="color: #dc2626; font-size: 20px; margin: 0 0 16px; text-align: center;">${alertTitle}</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px;">
                ${alertMessage}
              </p>
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
                <p style="color: #dc2626; font-weight: 600; margin: 0; font-size: 14px;">
                  If this wasn't you, please secure your account immediately.
                </p>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/settings/sessions" style="background: #dc2626; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Review Account Activity
                </a>
              </div>
            </div>
          </div>
        `,
      });

      this.logger.log(`Security alert email sent to ${email}: "${alertTitle}"`);
    } catch (error) {
      this.logger.error(`Failed to send security alert email to ${email}`, error);
    }
  }

  async sendTrustedContactAdditionEmail(
    email: string,
    name: string,
    ownerName: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `🛡️ You've been designated as a trusted contact by ${ownerName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">LifeLedger</h1>
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Hello ${name},</h2>
              <p>${ownerName} has designated you as a Trusted Contact on LifeLedger.</p>
              <p>This means you can request secure, read-only emergency access to their critical documents if they become incapacitated. Access is protected by a waiting period and full auditing.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send trusted contact email to ${email}`, error);
    }
  }

  async sendEmergencyRequestEmail(
    email: string,
    requesterName: string,
    waitingPeriod: number,
    requestId: string,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `🚨 Action Required: Emergency access requested by ${requesterName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">LifeLedger</h1>
            </div>
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Emergency Access Request</h2>
              <p>Your trusted contact <strong>${requesterName}</strong> has requested emergency access to your vault.</p>
              <p>A waiting period of <strong>${waitingPeriod} days</strong> has started. If you do not respond, the request will automatically escalate.</p>
              <p>If you approve or want to deny this request immediately, please go to your dashboard.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/dashboard/emergency/requests" style="background: #ef4444; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Review Request
                </a>
              </div>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send emergency request email to ${email}`, error);
    }
  }

  async sendRequestConfirmationEmail(
    email: string,
    name: string,
    ownerName: string,
    waitingPeriod: number,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `🚨 Emergency request submitted for ${ownerName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Request Received</h2>
              <p>Hello ${name}, your request to access the emergency vault of <strong>${ownerName}</strong> has been submitted.</p>
              <p>A secure waiting period of <strong>${waitingPeriod} days</strong> has started. We will notify you once access is granted or if the request is escalated.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send request confirmation email to ${email}`, error);
    }
  }

  async sendRequestApprovedEmail(
    email: string,
    name: string,
    ownerName: string,
    grantId: string,
    expiresAt: Date,
  ): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    const accessUrl = `${appUrl}/emergency/access?token=${grantId}`;
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `✅ Emergency access request APPROVED for ${ownerName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Access Granted</h2>
              <p>Hello ${name}, your emergency access request for <strong>${ownerName}</strong> has been approved.</p>
              <p>You can access the documents using the secure link below. This session is active until <strong>${expiresAt.toLocaleString()}</strong>.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${accessUrl}" style="background: #10b981; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Access Vault Documents
                </a>
              </div>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send approval email to ${email}`, error);
    }
  }

  async sendRequestRejectedEmail(email: string, name: string, ownerName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `❌ Emergency access request rejected for ${ownerName}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Request Declined</h2>
              <p>Hello ${name}, your emergency access request for <strong>${ownerName}</strong> was rejected.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send rejection email to ${email}`, error);
    }
  }

  async sendSessionStartedEmail(email: string, name: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `🚨 Security Notice: Emergency session started by ${name}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Session Active</h2>
              <p>Your trusted contact <strong>${name}</strong> has started their emergency access session to view your documents.</p>
              <p>If this was unauthorized, you can end the session from your dashboard immediately.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send session started email to ${email}`, error);
    }
  }

  async sendEscalationNoticeEmail(email: string, name: string, requestId: string): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `⚠️ Urgent: Emergency request from ${name} has ESCALATED`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Request Escalated</h2>
              <p>The waiting period for the emergency request submitted by <strong>${name}</strong> has expired with no response from you.</p>
              <p>The request status is now <strong>ESCALATED</strong>. It is undergoing manual review, and no access has been granted automatically.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${appUrl}/dashboard/emergency/requests" style="background: #f59e0b; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                  Resolve Request
                </a>
              </div>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send escalation email to ${email}`, error);
    }
  }

  async sendEscalationRequesterNoticeEmail(
    email: string,
    name: string,
    ownerName: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `⚠️ Emergency request for ${ownerName} has escalated`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Waiting Period Expired</h2>
              <p>Hello ${name}, the waiting period for your request to access the emergency vault of <strong>${ownerName}</strong> has ended.</p>
              <p>The request is now <strong>ESCALATED</strong> and awaits manual review. Access is not granted automatically.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send requester escalation email to ${email}`, error);
    }
  }

  async sendWaitingPeriodReminderEmail(
    email: string,
    name: string,
    daysRemaining: number,
    requestId: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM', 'noreply@lifeledger.local'),
        to: email,
        subject: `⏰ Reminder: Emergency request from ${name} will escalate in ${daysRemaining} days`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
              <h2>Waiting Period Reminder</h2>
              <p>This is a reminder that <strong>${name}</strong> has requested emergency access to your vault.</p>
              <p>The waiting period will end and the request will escalate in <strong>${daysRemaining} days</strong>. Please log in to approve or reject the request.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send reminder email to ${email}`, error);
    }
  }
}
