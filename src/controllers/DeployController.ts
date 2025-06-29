import { AuthenticatedContext } from '../middleware/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DeployController {
  static async deploy(ctx: AuthenticatedContext) {
    try {
      ctx.status = 202;
      ctx.body = { 
        message: "Deployment initiated", 
        status: "processing" 
      };

      // Execute update script asynchronously
      exec('/usr/local/bin/update.sh', (error, stdout, stderr) => {
        if (error) {
          console.error(`Deployment failed: ${error}`);
          console.error(`stderr: ${stderr}`);
        } else {
          console.log(`Deployment successful:`);
          console.log(stdout);
        }
        
        if (stderr) {
          console.warn(`Deployment warnings: ${stderr}`);
        }
      });

    } catch (error) {
      console.error('Error initiating deployment:', error);
      ctx.status = 500;
      ctx.body = { error: "Failed to initiate deployment" };
    }
  }

  static async deployStatus(ctx: AuthenticatedContext) {
    try {
      // Check PM2 status to see if app is running
      const { stdout } = await execAsync('npx pm2 jlist');
      const processes = JSON.parse(stdout);
      const claudeReview = processes.find((p: any) => p.name === 'claude-review');
      
      if (!claudeReview) {
        ctx.body = { status: 'stopped', message: 'Application not running' };
        return;
      }

      ctx.body = {
        status: claudeReview.pm2_env.status,
        uptime: claudeReview.pm2_env.pm_uptime,
        restarts: claudeReview.pm2_env.restart_time,
        memory: claudeReview.monit.memory,
        cpu: claudeReview.monit.cpu
      };
    } catch (error) {
      console.error('Error getting deployment status:', error);
      ctx.status = 500;
      ctx.body = { error: "Failed to get deployment status" };
    }
  }
}