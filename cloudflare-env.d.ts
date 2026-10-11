declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AGENT_LEARNING_TOKEN?: string;
    AGENT_LEARNING_OWNER_ID?: string;
    BUCKET?: R2Bucket;
  }
}
