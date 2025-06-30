import { Context } from "koa";
import { spawn } from "child_process";
import fs from "fs";

export class ReviewController {
  private static promptCache = new Map<string, string>();

  private static validateGitHubPullRequestUrl(url: string): { valid: boolean; error?: string } {
    try {
      // Check for dangerous characters that could be used for command injection
      const dangerousChars = /[;&|`$(){}[\]\\'"<>]/;
      if (dangerousChars.test(url)) {
        return { valid: false, error: "URL contains invalid characters" };
      }

      // Parse and validate URL structure
      const parsedUrl = new URL(url);
      
      // Only allow HTTPS GitHub URLs
      if (parsedUrl.protocol !== "https:") {
        return { valid: false, error: "Only HTTPS URLs are allowed" };
      }

      if (parsedUrl.hostname !== "github.com") {
        return { valid: false, error: "Only GitHub URLs are allowed" };
      }

      // Validate pathname format: /owner/repo/pull/number
      const pathPattern = /^\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/pull\/\d+\/?$/;
      if (!pathPattern.test(parsedUrl.pathname)) {
        return { valid: false, error: "Invalid GitHub pull request URL format" };
      }

      // Additional length check to prevent extremely long URLs
      if (url.length > 500) {
        return { valid: false, error: "URL too long" };
      }

      return { valid: true };
    } catch (urlError) {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  private static getPromptContent(promptPath: string): string {
    try {
      // Return cached content if exists
      if (this.promptCache.has(promptPath)) {
        return this.promptCache.get(promptPath)!;
      }

      // Read and cache the prompt
      const content = fs.readFileSync(promptPath, "utf-8").trim();
      this.promptCache.set(promptPath, content);

      console.log(
        `[PR Review] Prompt cached from ${promptPath} (${content.length} chars)`
      );
      return content;
    } catch (error) {
      console.error(
        `[PR Review] Failed to read prompt file ${promptPath}:`,
        error
      );
      throw error;
    }
  }

  static async reviewPullRequest(ctx: Context) {
    const { url } = ctx.request.body as { url: string };

    if (!url) {
      ctx.status = 400;
      ctx.body = { error: "Pull request URL is required" };
      return;
    }

    // Validate GitHub pull request URL with security checks
    const validation = ReviewController.validateGitHubPullRequestUrl(url);
    if (!validation.valid) {
      ctx.status = 400;
      ctx.body = { error: validation.error };
      return;
    }

    try {
      // Detect if we're running in container vs local development
      const isContainer =
        process.cwd() === "/app" || fs.existsSync("/app/prompt.txt");
      const workingDir = isContainer ? "/app" : process.cwd();
      const promptPath = isContainer ? "/app/prompt.txt" : "./prompt.txt";
      const shellPath = isContainer ? "/bin/bash" : "/bin/sh";
      const app = isContainer ? "claude-code" : "claude";

      // Get cached prompt content and combine with URL
      const promptContent = ReviewController.getPromptContent(promptPath);
      const fullPrompt = `${promptContent} ${url}`;

      const args = ["-p", "--dangerously-skip-permissions", fullPrompt];

      console.log(`[PR Review] Starting review for URL: ${url}`);
      console.log(
        `[PR Review] Environment: ${isContainer ? "Container" : "Local"}`
      );
      console.log(`[PR Review] Command: ${app} ${args.join(" ")}`);
      console.log(`[PR Review] Working directory: ${process.cwd()}`);
      console.log(`[PR Review] Target working directory: ${workingDir}`);
      console.log(`[PR Review] User: ${process.env.USER || "unknown"}`);

      // Execute using spawn with enhanced error handling
      const childProcess = spawn(app, args, {
        cwd: workingDir,
        env: {
          ...process.env,
          HOME: isContainer ? "/home/claude" : process.env.HOME,
          USER: isContainer ? "claude" : process.env.USER,
          SHELL: shellPath,
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      // Close stdin immediately to prevent hanging
      childProcess.stdin.end();

      let stdout = "";
      let stderr = "";

      childProcess.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [PR Review] STDOUT: ${chunk}`);
      });

      childProcess.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderr += chunk;
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [PR Review] STDERR: ${chunk}`);
      });

      childProcess.on("close", (code, signal) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [PR Review] Command completed for ${url}`);
        console.log(
          `[${timestamp}] [PR Review] Process PID was: ${childProcess.pid}`
        );
        console.log(
          `[${timestamp}] [PR Review] Exit code: ${code}, Signal: ${signal}`
        );

        if (code !== 0) {
          console.error(
            `[${timestamp}] [PR Review] Process exited with non-zero code: ${code}`
          );
          if (signal) {
            console.error(
              `[${timestamp}] [PR Review] Process terminated by signal: ${signal}`
            );
          }
        }

        if (stderr && stderr.trim()) {
          console.error(
            `[${timestamp}] [PR Review] STDERR (${stderr.length} chars):`
          );
          console.error(stderr.substring(0, 5000)); // Limit stderr output
          if (stderr.length > 5000) {
            console.error(
              `[${timestamp}] [PR Review] ... (truncated ${
                stderr.length - 5000
              } more chars)`
            );
          }
        }

        if (stdout && stdout.trim()) {
          console.log(
            `[${timestamp}] [PR Review] STDOUT (${stdout.length} chars):`
          );
          console.log(stdout.substring(0, 5000)); // Limit stdout output
          if (stdout.length > 5000) {
            console.log(
              `[${timestamp}] [PR Review] ... (truncated ${
                stdout.length - 5000
              } more chars)`
            );
          }
        }

        if (code === 0) {
          if (!stdout || stdout.trim().length === 0) {
            console.warn(
              `[${timestamp}] [PR Review] WARNING: Command completed but no output received`
            );
          } else {
            console.log(
              `[${timestamp}] [PR Review] SUCCESS: Review completed for ${url}`
            );
          }
        }

        // Log completion summary
        console.log(
          `[${timestamp}] [PR Review] SUMMARY - URL: ${url}, Code: ${code}, Stdout: ${
            stdout?.length || 0
          } chars, Stderr: ${stderr?.length || 0} chars`
        );
      });

      childProcess.on("error", (error) => {
        const timestamp = new Date().toISOString();
        console.error(
          `[${timestamp}] [PR Review] Process error:`,
          error.message
        );
      });

      // Log the process PID for tracking
      console.log(`[PR Review] Started process PID: ${childProcess.pid}`);

      ctx.status = 202;
      ctx.body = {
        message: "Pull request review initiated successfully",
        url: url,
        status: "processing",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `[PR Review] Exception initiating review for ${url}:`,
        error
      );
      ctx.status = 500;
      ctx.body = { error: "Failed to initiate pull request review" };
    }
  }
}
