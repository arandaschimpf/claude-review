import { Context, Next } from 'koa';
import { apiKeyService } from '../services/ApiKeyService';

export interface AuthenticatedContext extends Context {
  apiKey?: string;
  isAdmin?: boolean;
}

export const authenticateApiKey = async (ctx: AuthenticatedContext, next: Next) => {
  const apiKey = ctx.headers['x-api-key'] as string;
  
  if (!apiKey) {
    ctx.status = 401;
    ctx.body = { error: 'API key required' };
    return;
  }

  const isValid = await apiKeyService.isValidKey(apiKey);
  if (!isValid) {
    ctx.status = 401;
    ctx.body = { error: 'Invalid API key' };
    return;
  }

  ctx.apiKey = apiKey;
  ctx.isAdmin = await apiKeyService.isAdminKey(apiKey);
  
  await next();
};

export const requireAdmin = async (ctx: AuthenticatedContext, next: Next) => {
  if (!ctx.isAdmin) {
    ctx.status = 403;
    ctx.body = { error: 'Admin privileges required' };
    return;
  }
  
  await next();
};