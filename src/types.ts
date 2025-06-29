export interface ApiKey {
  _id?: string;
  key: string;
  name: string;
  isAdmin: boolean;
  createdAt: Date;
  createdBy?: string; // The key that created this key (for audit trail)
}