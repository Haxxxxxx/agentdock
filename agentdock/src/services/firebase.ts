import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type {
  Agent,
  AgentTransaction,
  ApprovalRequest,
  SpendingPolicy,
  AppUser,
} from '../types';

// ─── Auth ────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void): Unsubscribe {
  return firebaseOnAuthStateChanged(auth, callback);
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

// ─── Users ───────────────────────────────────────────────────
export async function createUserDoc(user: FirebaseUser): Promise<AppUser> {
  const userData: AppUser = {
    id: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    createdAt: new Date().toISOString(),
    agentIds: [],
    notificationsEnabled: true,
  };
  await setDoc(doc(db, 'users', user.uid), userData);
  return userData;
}

export async function getUserDoc(userId: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

export async function updateUserDoc(userId: string, updates: Partial<AppUser>) {
  await updateDoc(doc(db, 'users', userId), updates);
}

// ─── Agents ──────────────────────────────────────────────────
export async function addAgent(agent: Agent) {
  await setDoc(doc(db, 'agents', agent.id), agent);
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const snap = await getDoc(doc(db, 'agents', agentId));
  return snap.exists() ? (snap.data() as Agent) : null;
}

export async function getUserAgents(userId: string): Promise<Agent[]> {
  const q = query(collection(db, 'agents'), where('ownerId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Agent);
}

export async function updateAgent(agentId: string, updates: Partial<Agent>) {
  await updateDoc(doc(db, 'agents', agentId), updates);
}

export async function deleteAgent(agentId: string) {
  await deleteDoc(doc(db, 'agents', agentId));
}

// ─── Transactions ────────────────────────────────────────────
export async function addTransaction(tx: AgentTransaction) {
  await setDoc(doc(db, 'transactions', tx.id), tx);
}

export async function getAgentTransactions(
  agentId: string,
  maxResults = 50
): Promise<AgentTransaction[]> {
  const q = query(
    collection(db, 'transactions'),
    where('agentId', '==', agentId),
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AgentTransaction);
}

export function subscribeToTransactions(
  agentId: string,
  callback: (txs: AgentTransaction[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'transactions'),
    where('agentId', '==', agentId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as AgentTransaction));
  });
}

// ─── Approvals ───────────────────────────────────────────────
export async function getPendingApprovals(userId: string): Promise<ApprovalRequest[]> {
  // Get all user's agent IDs, then query approvals
  const user = await getUserDoc(userId);
  if (!user || user.agentIds.length === 0) return [];

  const q = query(
    collection(db, 'approvals'),
    where('agentId', 'in', user.agentIds),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ApprovalRequest);
}

export async function respondToApproval(
  approvalId: string,
  status: 'approved' | 'denied'
) {
  await updateDoc(doc(db, 'approvals', approvalId), {
    status,
    respondedAt: new Date().toISOString(),
  });
}

export function subscribeToPendingApprovals(
  agentIds: string[],
  callback: (approvals: ApprovalRequest[]) => void
): Unsubscribe {
  if (agentIds.length === 0) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'approvals'),
    where('agentId', 'in', agentIds.slice(0, 10)), // Firestore 'in' limit is 10
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as ApprovalRequest));
  });
}

// ─── Policies ────────────────────────────────────────────────
export async function getPolicy(agentId: string): Promise<SpendingPolicy | null> {
  const snap = await getDoc(doc(db, 'policies', agentId));
  return snap.exists() ? (snap.data() as SpendingPolicy) : null;
}

export async function setPolicy(policy: SpendingPolicy) {
  await setDoc(doc(db, 'policies', policy.agentId), {
    ...policy,
    updatedAt: new Date().toISOString(),
  });
}
