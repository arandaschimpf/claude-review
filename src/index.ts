import dotenv from "dotenv";
dotenv.config();

import Koa from "koa";
import bodyParser from "koa-bodyparser";
import router from "./routes";
import { apiKeyService } from "./services/ApiKeyService";

const app = new Koa();
const PORT = process.env.PORT || 8080;
const MASTER_API_KEY = process.env.MASTER_API_KEY;

// Middleware
app.use(bodyParser());

// Routes
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(PORT, async () => {
  await apiKeyService.initializeMasterKey(MASTER_API_KEY);
  console.log(`Server running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
});
