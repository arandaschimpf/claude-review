import { Context } from 'koa';

export class HealthController {
  static async health(ctx: Context) {
    ctx.status = 200;
    ctx.body = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "claude-review",
    };
  }
}