import https from 'https';
import type { ContactFormData } from '../types/index.js';
import { ContactSubmission } from '../models/ContactSubmission.js';

let botToken = '';
let allowedChatId = '';
let lastUpdateId = 0;

export function initTelegramBot(token: string, chatId: string): void {
  if (!token || !chatId) return;

  botToken = token;
  allowedChatId = chatId;

  pollUpdates();
  console.log('Telegram bot started');
}

function pollUpdates(): void {
  const url = new URL(`https://api.telegram.org/bot${botToken}/getUpdates`);
  url.searchParams.set('timeout', '30');
  url.searchParams.set('offset', String(lastUpdateId + 1));

  https.get(url.toString(), (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.ok && json.result) {
          for (const update of json.result) {
            lastUpdateId = update.update_id;
            handleUpdate(update);
          }
        }
      } catch (err) {
        console.error('Telegram polling parse error:', err);
      }
      pollUpdates();
    });
  }).on('error', (err) => {
    console.error('Telegram polling error:', err.message);
    setTimeout(pollUpdates, 5000);
  });
}

function handleUpdate(update: any): void {
  const msg = update.message;
  if (!msg || !msg.text || !msg.chat) return;

  if (msg.chat.id.toString() !== allowedChatId) return;

  const text = msg.text.trim();

  if (text === '/start') {
    sendMessage('Привет! Я бот для уведомлений о заявках с сайта.\n\nИспользуй /list чтобы посмотреть последние заявки.');
    return;
  }

  if (text === '/list') {
    handleListCommand();
    return;
  }
}

async function handleListCommand(): Promise<void> {
  try {
    const submissions = await ContactSubmission.find().sort({ createdAt: -1 }).limit(5).lean();

    if (submissions.length === 0) {
      sendMessage('Заявок пока нет.');
      return;
    }

    const messages = submissions.map((s, i) => {
      const date = new Date(s.createdAt).toLocaleString('ru-RU');
      return `#${i + 1} — ${date}\n<b>Имя:</b> ${escapeHtml(s.name)}\n<b>Тел:</b> ${escapeHtml(s.phone)}\n<b>Email:</b> ${escapeHtml(s.email)}\n<b>Сообщение:</b> ${escapeHtml(s.message.substring(0, 100))}${s.message.length > 100 ? '...' : ''}`;
    });

    sendMessage(`<b>📋 Последние заявки:</b>\n\n${messages.join('\n\n━━━━━━━━━━━━━━━\n\n')}`);
  } catch (err) {
    console.error('Failed to fetch submissions:', err);
    sendMessage('Ошибка при получении заявок.');
  }
}

function sendMessage(text: string): void {
  if (!botToken || !allowedChatId) return;

  const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
  url.searchParams.set('chat_id', allowedChatId);
  url.searchParams.set('text', text);
  url.searchParams.set('parse_mode', 'HTML');

  https.get(url.toString(), (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const json = JSON.parse(data);
      if (!json.ok) {
        console.error('Telegram sendMessage error:', json);
      }
    });
  }).on('error', (err) => {
    console.error('Telegram sendMessage error:', err.message);
  });
}

export function sendTelegramNotification(data: ContactFormData): void {
  const text = `
📩 <b>Новая заявка с сайта</b>

<b>Имя:</b> ${escapeHtml(data.name)}
<b>Телефон:</b> ${escapeHtml(data.phone)}
<b>Email:</b> ${escapeHtml(data.email)}
<b>Сообщение:</b>
${escapeHtml(data.message)}
`.trim();

  sendMessage(text);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
