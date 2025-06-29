import { Context } from 'koa';
import { exec } from 'child_process';
import fs from 'fs';

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
      // Skip permissions since we're running as non-root user for automation
      const command = `claude-code -p --dangerously-skip-permissions "$(cat /app/prompt.txt) ${url}"`;
      
      console.log(`[PR Review] Starting review for URL: ${url}`);
      console.log(`[PR Review] Command: ${command}`);
      console.log(`[PR Review] Working directory: ${process.cwd()}`);
      console.log(`[PR Review] User: ${process.env.USER || 'unknown'}`);
      
      // Execute without waiting for completion
      exec(command, { 
        cwd: '/app',
        env: { 
          ...process.env,
          HOME: '/home/claude',
          USER: 'claude'
        },
        timeout: 300000 // 5 minutes timeout
      }, (error, stdout, stderr) => {
        console.log(`[PR Review] Command completed for ${url}`);
        
        if (error) {
          console.error(`[PR Review] ERROR: ${error.message}`);
          console.error(`[PR Review] Error code: ${error.code}`);
          console.error(`[PR Review] Signal: ${error.signal}`);
        }
        
        if (stderr) {
          console.error(`[PR Review] STDERR:\n${stderr}`);
        }
        
        if (stdout) {
          console.log(`[PR Review] STDOUT:\n${stdout}`);
        }
        
        if (!error && !stderr) {
          console.log(`[PR Review] SUCCESS: Review completed for ${url}`);
        }
      });

      ctx.status = 202;
      ctx.body = { 
        message: "Pull request review initiated successfully",
        url: url,
        status: "processing",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[PR Review] Exception initiating review for ${url}:`, error);
      ctx.status = 500;
      ctx.body = { error: "Failed to initiate pull request review" };
    }
  }

  static async testSetup(ctx: Context) {
    try {
      const diagnostics: any = {
        timestamp: new Date().toISOString(),
        environment: {
          cwd: process.cwd(),
          user: process.env.USER || 'unknown',
          home: process.env.HOME || 'unknown'
        },
        files: {},
        claude: {}
      };

      // Check if prompt.txt exists and is readable
      try {
        const promptContent = fs.readFileSync('/app/prompt.txt', 'utf-8');
        diagnostics.files.promptTxt = {
          exists: true,
          size: promptContent.length,
          preview: promptContent.substring(0, 100) + '...'
        };
      } catch (error: any) {
        diagnostics.files.promptTxt = {
          exists: false,
          error: error.message
        };
      }

      // Test Claude CLI basic command
      exec('claude-code --version', { 
        cwd: '/app',
        env: { 
          ...process.env,
          HOME: '/home/claude',
          USER: 'claude'
        },
        timeout: 10000
      }, (error, stdout) => {
        if (error) {
          diagnostics.claude.version = { error: error.message };
        } else {
          diagnostics.claude.version = { success: true, output: stdout.trim() };
        }
        console.log('[Test Setup] Diagnostics:', JSON.stringify(diagnostics, null, 2));
      });

      ctx.body = {
        message: "Diagnostics initiated - check logs for results",
        diagnostics: diagnostics
      };
    } catch (error) {
      console.error('[Test Setup] Error:', error);
      ctx.status = 500;
      ctx.body = { error: "Failed to run diagnostics" };
    }
  }
}