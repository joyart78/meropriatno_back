export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface EnvConfig {
  port: number;
  mongoUri: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  mailFrom: string;
  mailTo: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramProxy: string;
}
