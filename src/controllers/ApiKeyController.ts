import { AuthenticatedContext } from '../middleware/auth';
import { apiKeyService } from '../services/ApiKeyService';

export class ApiKeyController {
  static async createKey(ctx: AuthenticatedContext) {
    const { name } = ctx.request.body as { name: string };
    
    if (!name) {
      ctx.status = 400;
      ctx.body = { error: "Name is required" };
      return;
    }

    try {
      const newKey = await apiKeyService.createApiKey(name, false, ctx.apiKey);
      ctx.status = 201;
      ctx.body = { 
        message: "API key created successfully",
        key: newKey.key,
        name: newKey.name,
        createdAt: newKey.createdAt
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: "Failed to create API key" };
    }
  }

  static async getAllKeys(ctx: AuthenticatedContext) {
    try {
      const keys = await apiKeyService.getAllKeys();
      ctx.body = keys.map(key => ({
        name: key.name,
        key: key.key,
        isAdmin: key.isAdmin,
        createdAt: key.createdAt,
        createdBy: key.createdBy
      }));
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: "Failed to retrieve API keys" };
    }
  }

  static async deleteKey(ctx: AuthenticatedContext) {
    const { key } = ctx.params;
    
    try {
      const deleted = await apiKeyService.deleteKey(key);
      if (deleted) {
        ctx.body = { message: "API key deleted successfully" };
      } else {
        ctx.status = 404;
        ctx.body = { error: "API key not found" };
      }
    } catch (error) {
      ctx.status = 500;
      ctx.body = { error: "Failed to delete API key" };
    }
  }
}