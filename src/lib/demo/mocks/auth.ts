import { DEMO_ACCESS_TOKEN, DEMO_USER } from '../config';
import { get, post, type DemoRoute } from '../router';

const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

const session = () => ({
  accessToken: DEMO_ACCESS_TOKEN,
  accessTokenExpiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString(),
  user: DEMO_USER,
});

export const authRoutes: DemoRoute[] = [
  post('/auth/login', session),
  post('/auth/refresh', session),
  get('/auth/me', () => DEMO_USER),
  post('/auth/verify-secure-action', () => ({ success: true })),
];
