import 'dotenv/config';
import type { EnvConfig } from '../types/index.js';

export function getEnv(): EnvConfig {
  return {
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/meropriyatno',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    telegramProxy: process.env.TELEGRAM_PROXY || '',
  };
}
