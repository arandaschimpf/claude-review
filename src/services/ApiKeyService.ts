import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { ApiKey } from '../types';

class ApiKeyService {
  private db: Datastore<ApiKey>;

  constructor() {
    this.db = Datastore.create({
      filename: 'data/apikeys.db',
      autoload: true
    });
  }

  async createApiKey(name: string, isAdmin: boolean = false, createdBy?: string): Promise<ApiKey> {
    const apiKey: ApiKey = {
      key: uuidv4(),
      name,
      isAdmin,
      createdAt: new Date(),
      createdBy
    };

    const inserted = await this.db.insert(apiKey);
    return inserted;
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    return await this.db.findOne({ key });
  }

  async getAllKeys(): Promise<ApiKey[]> {
    return await this.db.find({});
  }

  async deleteKey(key: string): Promise<boolean> {
    const result = await this.db.remove({ key }, {});
    return result > 0;
  }

  async isValidKey(key: string): Promise<boolean> {
    const apiKey = await this.findByKey(key);
    return apiKey !== null;
  }

  async isAdminKey(key: string): Promise<boolean> {
    const apiKey = await this.findByKey(key);
    return apiKey?.isAdmin === true;
  }

  async initializeMasterKey(masterApiKey?: string): Promise<void> {
    if (masterApiKey) {
      const existingKey = await this.findByKey(masterApiKey);
      if (!existingKey) {
        // Create master key with the provided key value
        const apiKey: ApiKey = {
          key: masterApiKey,
          name: "Master Key",
          isAdmin: true,
          createdAt: new Date()
        };
        await this.db.insert(apiKey);
        console.log("Master API key initialized");
      }
    } else {
      console.warn("No MASTER_API_KEY provided in environment variables");
    }
  }
}

export const apiKeyService = new ApiKeyService();