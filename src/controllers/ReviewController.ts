import { Context } from 'koa';
import { exec } from 'child_process';

export class ReviewController {
  static async reviewPullRequest(ctx: Context) {
    const { url } = ctx.request.body as { url: string };
    
    if (!url) {
      ctx.status = 400;
      ctx.body = { error: "Pull request URL is required" };
      return;
    }

    // Basic URL validation
    if (!url.includes('github.com') || !url.includes('/pull/')) {
      ctx.status = 400;
      ctx.body = { error: "Invalid GitHub pull request URL" };
      return;
    }

    try {
      // Use shell command substitution to concatenate prompt.txt content with URL
      const command = `claude-code -p "$(cat /app/prompt.txt) ${url}"`;
      
      // Execute without waiting for completion
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Claude CLI execution error: ${error}`);
        }
        if (stderr) {
          console.error(`Claude CLI stderr: ${stderr}`);
        }
        if (stdout) {
          console.log(`Claude CLI stdout: ${stdout}`);
        }
      });

      ctx.status = 202;
      ctx.body = { 
        message: "Pull request review initiated successfully",
        url: url,
        status: "processing"
      };
    } catch (error) {
      console.error('Error initiating PR review:', error);
      ctx.status = 500;
      ctx.body = { error: "Failed to initiate pull request review" };
    }
  }
}