import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { getEnv } from './config/env.js';
import { connectDB } from './config/database.js';
import { swaggerSpec } from './config/swagger.js';
import { initMail } from './services/mail.js';
import { initTelegramBot } from './services/telegram.js';
import contactRouter from './routes/contact.js';

const config = getEnv();
const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }));
app.use(express.json());

app.use('/api/contact', contactRouter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Проверка работоспособности сервера
 *     responses:
 *       200:
 *         description: Сервер работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

initMail(config);
initTelegramBot(config.telegramBotToken, config.telegramChatId);
connectDB(config.mongoUri);

app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}`);
  console.log(`API docs at http://localhost:${config.port}/api/docs`);
});
