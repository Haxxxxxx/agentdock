import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onHeliusWebhook } from "./webhookHandler";
import { approvalApp } from "./approvalApi";

// ─── Initialize Firebase Admin ──────────────────────────────

admin.initializeApp();

// ─── Exports ────────────────────────────────────────────────

// Helius webhook endpoint
// URL: https://<region>-<project>.cloudfunctions.net/heliusWebhook
export { onHeliusWebhook };

// Approval REST API (Express)
// URL: https://<region>-<project>.cloudfunctions.net/api/api/...
// Note: the function name "api" + Express routes means paths are /api/api/...
// We name the function "approvalApi" so the routes become:
// https://<region>-<project>.cloudfunctions.net/approvalApi/api/agents/register
// https://<region>-<project>.cloudfunctions.net/approvalApi/api/approvals/request
// https://<region>-<project>.cloudfunctions.net/approvalApi/api/approvals/:id/status
// https://<region>-<project>.cloudfunctions.net/approvalApi/api/policies/:agentId
export const approvalApi = onRequest(
  {
    cors: true,
    maxInstances: 20,
  },
  approvalApp
);
