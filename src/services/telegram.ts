import https from 'https';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { ContactFormData } from '../types';
import { ContactSubmission } from '../models/ContactSubmission.js';

const PAGE_SIZE = 3;
let botToken = '';
let allowedChatIds: string[] = [];
let lastUpdateId = 0;
let apiAgent: https.Agent | undefined;
const chatPages = new Map<string, number>();

export function initTelegramBot(token: string, chatIds: string, proxyUrl?: string): void {
  if (!token || !chatIds) return;

  botToken = token;
  allowedChatIds = chatIds.split(',').map((id) => id.trim()).filter(Boolean);

  if (proxyUrl) {
    apiAgent = new SocksProxyAgent(proxyUrl);
    console.log('Telegram proxy configured:', proxyUrl);
  }

  testApiConnection();
  pollUpdates();
  setBotCommands();
  console.log('Telegram bot started');
}

function fetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const opts: https.RequestOptions = {};
    if (apiAgent) opts.agent = apiAgent;

    https.get(url, opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function testApiConnection(): void {
  fetch(`https://api.telegram.org/bot${botToken}/getMe`).then((json) => {
    if (json.ok) {
      console.log('Telegram API OK — bot:', json.result.username);
    } else {
      console.error('Telegram API error:', json);
    }
  }).catch((err: any) => {
    console.error('Telegram API unreachable:', err.code || err.message || err);
  });
}

function setBotCommands(): void {
  const commands = JSON.stringify([
    { command: 'start', description: 'Приветствие' },
    { command: 'list', description: 'Просмотр заявок' },
  ]);

  const url = new URL(`https://api.telegram.org/bot${botToken}/setMyCommands`);
  url.searchParams.set('commands', commands);

  fetch(url.toString()).then((json) => {
    if (!json.ok) console.error('Failed to set bot commands:', json);
  }).catch((err: any) => {
    console.error('setMyCommands error:', err.code || err.message || err);
  });
}

function pollUpdates(): void {
  const url = new URL(`https://api.telegram.org/bot${botToken}/getUpdates`);
  url.searchParams.set('timeout', '30');
  url.searchParams.set('offset', String(lastUpdateId + 1));

  fetch(url.toString()).then((json) => {
    if (json.ok && json.result) {
      for (const update of json.result) {
        lastUpdateId = update.update_id;
        handleUpdate(update);
      }
    }
    pollUpdates();
  }).catch((err: any) => {
    console.error('Telegram polling error:', err.code || err.message || err);
    setTimeout(pollUpdates, 15000);
  });
}

function handleUpdate(update: any): void {
  if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
    return;
  }

  const msg = update.message;
  if (!msg || !msg.text || !msg.chat) return;

  if (!allowedChatIds.includes(msg.chat.id.toString())) return;

  const chatId = msg.chat.id.toString();
  const text = msg.text.trim();

  if (text === '/start') {
    sendMessage('Привет! Я бот для уведомлений о заявках с сайта.\n\nИспользуй /list чтобы посмотреть заявки.', chatId);
    return;
  }

  if (text === '/list') {
    handleListCommand(chatId);
    return;
  }
}

function handleCallbackQuery(cb: any): void {
  const chatId = cb.message.chat.id.toString();
  if (!allowedChatIds.includes(chatId)) return;

  const page = Number(cb.data);

  if (!isNaN(page)) {
    chatPages.set(chatId, page);
    sendPage(chatId, cb.message.message_id, page);
  }

  answerCallbackQuery(cb.id);
}

function answerCallbackQuery(callbackQueryId: string): void {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery?callback_query_id=${callbackQueryId}`;
  fetch(url).catch(() => {});
}

function editMessageText(chatId: string, messageId: number, text: string, replyMarkup?: string): void {
  const url = new URL(`https://api.telegram.org/bot${botToken}/editMessageText`);
  url.searchParams.set('chat_id', chatId);
  url.searchParams.set('message_id', String(messageId));
  url.searchParams.set('text', text);
  url.searchParams.set('parse_mode', 'HTML');
  if (replyMarkup) {
    url.searchParams.set('reply_markup', replyMarkup);
  }

  fetch(url.toString()).catch((err: any) => {
    console.error('editMessageText error:', err.code || err.message || err);
  });
}

async function handleListCommand(chatId: string): Promise<void> {
  chatPages.set(chatId, 0);

  try {
    const total = await ContactSubmission.countDocuments();
    if (total === 0) {
      sendMessage('Заявок пока нет.', chatId);
      return;
    }

    sendPage(chatId, undefined, 0);
  } catch (err) {
    console.error('Failed to fetch submission count:', err);
    sendMessage('Ошибка при получении заявок.', chatId);
  }
}

async function sendPage(chatId: string, messageId: number | undefined, page: number): Promise<void> {
  try {
    const total = await ContactSubmission.countDocuments();
    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();

    if (submissions.length === 0) {
      if (messageId) {
        editMessageText(chatId, messageId, 'Заявок пока нет.');
      } else {
        sendMessage('Заявок пока нет.', chatId);
      }
      return;
    }

    const items = submissions.map((s, i) => {
      const num = page * PAGE_SIZE + i + 1;
      const date = new Date(s.createdAt).toLocaleString('ru-RU');
      return `<b>#${num}</b> — ${date}\n<b>Имя:</b> ${escapeHtml(s.name)}\n<b>Тел:</b> ${escapeHtml(s.phone)}\n<b>Email:</b> ${escapeHtml(s.email)}\n<b>Сообщение:</b> ${escapeHtml(s.message.substring(0, 100))}${s.message.length > 100 ? '...' : ''}`;
    });

    const text = `<b>📋 Заявки (страница ${page + 1}/${totalPages})</b>\n\n${items.join('\n\n━━━━━━━━━━━━━━━\n\n')}`;

    const keyboard = buildKeyboard(page, totalPages);

    if (messageId) {
      editMessageText(chatId, messageId, text, keyboard);
    } else {
      sendMessageWithKeyboard(chatId, text, keyboard);
    }
  } catch (err) {
    console.error('Failed to fetch submissions:', err);
    if (messageId) {
      editMessageText(chatId, messageId, 'Ошибка при получении заявок.');
    } else {
      sendMessage('Ошибка при получении заявок.', chatId);
    }
  }
}

function buildKeyboard(page: number, totalPages: number): string {
  const buttons: { text: string; callback_data: string }[][] = [];
  const row: { text: string; callback_data: string }[] = [];

  if (page > 0) {
    row.push({ text: '← Назад', callback_data: String(page - 1) });
  }
  if (page < totalPages - 1) {
    row.push({ text: 'Вперёд →', callback_data: String(page + 1) });
  }

  if (row.length > 0) {
    buttons.push(row);
  }

  return JSON.stringify({ inline_keyboard: buttons });
}

function sendMessageWithKeyboard(chatId: string, text: string, replyMarkup: string): void {
  const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
  url.searchParams.set('chat_id', chatId);
  url.searchParams.set('text', text);
  url.searchParams.set('parse_mode', 'HTML');
  url.searchParams.set('reply_markup', replyMarkup);

  fetch(url.toString()).catch((err: any) => {
    console.error('sendMessage keyboard error:', err.code || err.message || err);
  });
}

function sendMessage(text: string, chatId?: string): void {
  if (!botToken || allowedChatIds.length === 0) return;

  const targets = chatId ? [chatId] : allowedChatIds;

  for (const id of targets) {
    const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
    url.searchParams.set('chat_id', id);
    url.searchParams.set('text', text);
    url.searchParams.set('parse_mode', 'HTML');

    fetch(url.toString()).catch((err: any) => {
      console.error('Telegram sendMessage error:', err.code || err.message || err);
    });
  }
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
