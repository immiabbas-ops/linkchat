import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT', 587),
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendOtp(email: string, code: string) {
    const from = this.config.get('SMTP_FROM', 'Link-Chat <noreply@linkchat.app>');

    if (!this.config.get('SMTP_USER')) {
      console.log(`[DEV OTP] ${email}: ${code}`);
      return { dev: true, code };
    }

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Your Link-Chat verification code',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h1 style="color:#6366f1;">Link-Chat</h1>
          <p>Your verification code is:</p>
          <h2 style="letter-spacing:8px;font-size:32px;">${code}</h2>
          <p style="color:#666;">This code expires in 10 minutes.</p>
        </div>
      `,
    });
  }
}
