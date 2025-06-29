import Router from 'koa-router';
import { authenticateApiKey, requireAdmin } from '../middleware/auth';
import { ApiKeyController } from '../controllers/ApiKeyController';
import { HealthController } from '../controllers/HealthController';
import { ReviewController } from '../controllers/ReviewController';
import { DeployController } from '../controllers/DeployController';

const router = new Router();

// Health endpoint (no auth required)
router.get('/health', HealthController.health);

// Pull request review endpoint (auth required, no admin needed)
router.post('/api/review', authenticateApiKey, ReviewController.reviewPullRequest);

// Deployment endpoints (admin only)
router.post('/api/deploy', authenticateApiKey, requireAdmin, DeployController.deploy);
router.get('/api/deploy/status', authenticateApiKey, requireAdmin, DeployController.deployStatus);

// API Key management endpoints (admin only)
router.post('/api/keys', authenticateApiKey, requireAdmin, ApiKeyController.createKey);
router.get('/api/keys', authenticateApiKey, requireAdmin, ApiKeyController.getAllKeys);
router.delete('/api/keys/:key', authenticateApiKey, requireAdmin, ApiKeyController.deleteKey);

export default router;