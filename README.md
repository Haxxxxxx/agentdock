# AgentDock

**The human layer for AI agents on Solana.**

AgentDock is a React Native mobile control center that gives humans real-time oversight of their autonomous AI agents operating on Solana. Monitor wallets, approve transactions, enforce spending policies, and track on-chain activity -- all from your phone.

---

## Problem

AI agents are increasingly executing on-chain transactions autonomously -- trading, swapping, staking, and interacting with DeFi protocols on Solana. But there's no human-friendly interface to:

- **See what agents are doing** in real time
- **Set guardrails** on how much they can spend
- **Approve or deny** high-value transactions before they execute
- **Get alerted** when an agent acts outside its policy

Without oversight, a misconfigured agent can drain a wallet in seconds.

## Solution

AgentDock sits between your AI agents and the Solana blockchain as a governance layer:

1. **Agents register** via REST API and receive an API key
2. **Before executing** a transaction, agents submit an approval request
3. **The policy engine** auto-approves low-risk transactions or escalates to the human
4. **The human** reviews, approves, or denies from the mobile app
5. **Helius webhooks** stream on-chain activity back to the dashboard in real time

```
                                   Solana
                                     |
                              Helius Webhooks
                                     |
Agent ──► REST API ──► Policy Engine ──► Firestore ──► Mobile App (React Native)
              |                                              |
         Cloud Functions                              Human Approval
              |                                              |
         Auto-approve ◄────────── Policy Rules ◄──────── Policy Editor
```

## Solana Integration

AgentDock uses Solana as its source of truth for all agent financial activity:

- **`@solana/web3.js`** -- Real-time SOL and SPL token balance queries via `Connection.getBalance()` and `getParsedTokenAccountsByOwner()`
- **Helius Enhanced Transactions API** -- Parses raw Solana transactions into human-readable descriptions (transfers, swaps, staking, NFT operations)
- **Helius Webhooks** -- Streams on-chain events to Cloud Functions in real time, which store transactions in Firestore and trigger push notifications
- **Policy Engine** -- Evaluates agent transactions against configurable spending policies (daily limits, per-tx caps, program allowlists) before they hit the chain
- **Devnet-first** -- All development and demos use Solana devnet by default

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo SDK 52 |
| State Management | Zustand + AsyncStorage persistence |
| Backend | Firebase Cloud Functions (Node.js/Express) |
| Database | Cloud Firestore (real-time sync) |
| Auth | Firebase Authentication |
| Blockchain | Solana via @solana/web3.js |
| Indexer | Helius Enhanced Transactions + Webhooks |
| Charts | react-native-chart-kit + react-native-svg |
| Navigation | React Navigation (Stack + Bottom Tabs) |

## Features

### Dashboard
- Aggregate SOL/USDC balances across all agents
- Agent status indicators (active / paused / offline)
- Pending approval count badge
- Pull-to-refresh balance updates

### Agent Detail
- Per-agent SOL and USDC balance
- 7-day spending chart with daily breakdown
- Policy summary (limits, thresholds)
- Recent transaction history with type indicators

### Transaction Feed
- Real-time transaction stream per agent
- Transaction type classification (transfer, swap, stake, program interaction)
- Fee tracking and amount display
- Powered by Helius enhanced transaction parsing

### Approval Queue
- Pending approval requests from agents
- One-tap approve/deny with policy context
- Expiration countdown
- Push notifications for new requests (when FCM configured)

### Policy Editor
- Per-agent spending policies
- Daily aggregate limit (SOL)
- Per-transaction limit (SOL)
- Approval threshold -- auto-approve below, require human above
- Program allowlist for trusted contracts

### Settings
- Account management
- Notification preferences
- Demo mode for instant exploration

## Agent REST API

Agents interact with AgentDock via 4 REST endpoints on Firebase Cloud Functions:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/agents/register` | None | Register agent, get API key |
| `POST` | `/api/approvals/request` | Bearer | Submit tx for approval |
| `GET` | `/api/approvals/:id/status` | Bearer | Poll approval status |
| `GET` | `/api/policies/:agentId` | Bearer | Read active spending policy |

### Example: Request Approval

```bash
curl -X POST https://us-central1-<project>.cloudfunctions.net/approvalApi/api/approvals/request \
  -H "Authorization: Bearer <AGENT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Swap 2 SOL for USDC on Jupiter",
    "txType": "swap",
    "estimatedSolCost": 2.0,
    "targetProgram": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  }'
```

**Response** (auto-approved by policy engine):
```json
{
  "approvalId": "abc123",
  "status": "approved",
  "autoApproved": true,
  "reason": "Transaction within policy limits. Auto-approved."
}
```

**Response** (requires human approval):
```json
{
  "approvalId": "def456",
  "status": "pending",
  "autoApproved": false,
  "reason": "Transaction amount 2.0 SOL exceeds approval threshold of 0.1 SOL."
}
```

## Policy Engine

The policy engine (`policyEngine.ts`) evaluates every transaction request through a chain of checks:

1. **No policy** -- Fail-safe: always require human approval
2. **Per-transaction limit** -- Reject if amount exceeds per-tx cap
3. **Daily aggregate limit** -- Reject if cumulative daily spending would exceed threshold
4. **Program allowlist** -- Reject if target program is not in the allowlist (when configured)
5. **Approval threshold** -- Require human approval above the configured SOL threshold

Transactions that pass all checks are auto-approved. All others are held for human review in the mobile app.

## Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (or iOS/Android simulator)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/colosseum-agent-hackathon.git
cd colosseum-agent-hackathon

# Install dependencies
cd agentdock
npm install

# Configure environment
cp ../.env.example ../.env
# Edit .env with your Firebase and Helius credentials

# Start the development server
npx expo start
```

### Try Demo Mode

Don't have Firebase or Helius keys? No problem:

1. Run `npx expo start`
2. Open in Expo Go or simulator
3. Tap **"Try Demo Mode"** on the login screen
4. Explore the full app with 3 pre-configured demo agents

Demo mode populates the app with realistic agent data, transactions, and spending charts without requiring any backend configuration.

## Project Structure

```
colosseum-agent-hackathon/
  .env.example              # Environment variable template
  firebase.json             # Firebase project config
  firestore.rules           # Firestore security rules
  firestore.indexes.json    # Composite indexes
  agentdock/
    App.tsx                 # Root component
    app.json                # Expo config
    src/
      config/
        firebase.ts         # Firebase init (Auth + Firestore)
      screens/
        OnboardingScreen    # Login / Sign up / Demo mode
        DashboardScreen     # Agent overview + balances
        AgentDetailScreen   # Per-agent detail + chart
        TransactionFeedScreen  # Transaction list
        ApprovalScreen      # Approve/deny queue
        SettingsScreen      # User preferences
      components/
        AgentCard           # Agent summary card
        ApprovalCard        # Approval request card
        PolicyEditor        # Spending policy form
        SpendingChart       # 7-day bar chart
        TransactionItem     # Transaction row
      services/
        firebase.ts         # Firestore CRUD operations
        solana.ts           # @solana/web3.js balance queries
        helius.ts           # Helius enhanced transactions
        agentBridge.ts      # REST API client
      store/
        useAgentStore.ts    # Zustand state management
      theme/
        colors.ts           # Design tokens
        index.ts            # Theme exports
      types/
        index.ts            # TypeScript interfaces
    functions/
      src/
        index.ts            # Cloud Functions entry point
        approvalApi.ts      # Express REST API (4 endpoints)
        policyEngine.ts     # Transaction policy evaluation
        webhookHandler.ts   # Helius webhook processor
```

## License

MIT
