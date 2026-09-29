import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import reportRoutes from './routes/report.routes.js';
import metaRoutes from './routes/meta.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';
import { pool } from './config/db.js';
import { MySqlSessionStore } from './config/mysql-session-store.js';

const app = express();
const sessionStore = env.NODE_ENV === 'test' ? undefined : new MySqlSessionStore();

if (env.TRUST_PROXY) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(pinoHttp({
  redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password', 'res.headers.set-cookie'],
  autoLogging: env.NODE_ENV !== 'test'
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } }));
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(session({
  name: 'lnc.sid',
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.SESSION_MAX_AGE_MS
  }
}));

app.get('/api/health', async (_request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok' });
  } catch (error) { next(error); }
});
app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

if (env.NODE_ENV === 'production') {
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.resolve(serverDir, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*splat', (request, response, next) => {
    if (request.path.startsWith('/api/')) return next();
    response.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
