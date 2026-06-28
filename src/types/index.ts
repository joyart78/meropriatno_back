export interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface EnvConfig {
  port: number;
  mongoUri: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramProxy: string;
}
