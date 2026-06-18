import nodemailer from 'nodemailer';
import type { ContactFormData } from '../types/index.js';
import type { EnvConfig } from '../types/index.js';

let transporter: nodemailer.Transporter | null = null;

export function initMail(config: EnvConfig) {
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

export async function sendContactForm(data: ContactFormData, config: EnvConfig) {
  if (!transporter) {
    throw new Error('Mail transporter not initialized');
  }

  const html = `
    <h2>Новая заявка с сайта Мероприятно</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:Arial,sans-serif">
      <tr>
        <td style="padding:10px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;width:120px">Имя</td>
        <td style="padding:10px;border:1px solid #ddd">${escapeHtml(data.name)}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9">Телефон</td>
        <td style="padding:10px;border:1px solid #ddd">${escapeHtml(data.phone)}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9">Email</td>
        <td style="padding:10px;border:1px solid #ddd">${escapeHtml(data.email)}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;vertical-align:top">Сообщение</td>
        <td style="padding:10px;border:1px solid #ddd;white-space:pre-wrap">${escapeHtml(data.message)}</td>
      </tr>
    </table>
  `;

  await transporter.sendMail({
    from: config.mailFrom,
    to: config.mailTo,
    subject: `Новая заявка с сайта Мероприятно — ${data.name}`,
    html,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
