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
}
