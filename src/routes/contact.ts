import { Router, type Request, type Response } from 'express';
import type { ContactFormData } from '../types/index.js';
import { sendContactForm } from '../services/mail.js';
import { getEnv } from '../config/env.js';
import { ContactSubmission } from '../models/ContactSubmission.js';

const router = Router();

/**
 * @openapi
 * /api/contact:
 *   post:
 *     tags:
 *       - Contact
 *     summary: Отправить заявку с контактной формы
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, email, message]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Имя отправителя
 *               phone:
 *                 type: string
 *                 minLength: 5
 *                 description: Номер телефона
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email отправителя
 *               message:
 *                 type: string
 *                 minLength: 10
 *                 description: Текст сообщения
 *     responses:
 *       200:
 *         description: Заявка успешно отправлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Ошибка валидации
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Внутренняя ошибка сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/', async (req: Request, res: Response) => {
  const { name, phone, email, message } = req.body as ContactFormData;

  const errors: string[] = [];
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Имя должно содержать минимум 2 символа');
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
    errors.push('Телефон обязателен');
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push('Некорректный email');
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    errors.push('Сообщение должно содержать минимум 10 символов');
  }

  if (errors.length > 0) {
    res.status(400).json({ success: false, errors });
    return;
  }

  const data = { name: name.trim(), phone: phone.trim(), email: email.trim(), message: message.trim() };

  try {
    const config = getEnv();
    await sendContactForm(data, config);
    await ContactSubmission.create(data);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to send email:', err);
    res.status(500).json({ success: false, errors: ['Ошибка отправки. Попробуйте позже.'] });
  }
});

export default router;
