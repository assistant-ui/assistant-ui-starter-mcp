import type { Config } from 'drizzle-kit';

export default {
  schema: './worker/db/schema.ts',
  out: './worker/db/migrations',
  dialect: 'sqlite', // or 'postgresql' | 'mysql' based on your D1 setup, assuming sqlite for now
  driver: 'd1-http', // For Cloudflare D1
  dbCredentials: {
    databaseId: "4fcd26a7-99bc-4dc0-9c65-bafd4f786bc7",
    accountId: "ad0d45931959d888de55865d02260ef8",
    token: "dXzVa51QI1sSBIV2rJICircKAP2w-XBArSCKgwRg,"
  },
} satisfies Config;
