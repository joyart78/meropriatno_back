import 'dotenv/config';
import type { EnvConfig } from '../types';

export function getEnv(): EnvConfig {
  const missing: string[] = [];

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM;
  const mailTo = process.env.MAIL_TO;

  if (!smtpHost) missing.push('SMTP_HOST');
  if (!smtpUser) missing.push('SMTP_USER');
  if (!smtpPass) missing.push('SMTP_PASS');
  if (!mailFrom) missing.push('MAIL_FROM');
  if (!mailTo) missing.push('MAIL_TO');

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missing.join(', ')}\n` +
        'Copy .env.example to .env and fill in the values.'
    );
  }

  return {
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/meropriyatno',
    smtpHost: smtpHost || '',
    smtpPort: Number(process.env.SMTP_PORT) || 465,
    smtpSecure: process.env.SMTP_SECURE !== 'false',
    smtpUser: smtpUser || '',
    smtpPass: smtpPass || '',
    mailFrom: mailFrom || '',
    mailTo: mailTo || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  };
}
