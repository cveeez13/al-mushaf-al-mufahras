'use client';

/**
 * useAdmin — Hook for admin dashboard state and CRUD operations.
 *
 * Provides:
 * - Auth state (isAdmin, login, logout, setup)
 * - Topic override CRUD (change verse classification)
 * - Sub-topic management (create, delete under main topics)
 * - Audit log (tracks all admin actions)
 * - Statistics (classification confidence, override counts, etc.)
 * - Data validation on all mutations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isAdminConfigured, setupAdmin, login as authLogin, logout as authLogout,
  getSession, isAdmin as checkIsAdmin, refreshSession, type Role,
} from './adminAuth';
import { dbGet, dbGetAll, dbPut, dbDelete, dbCount, STORES } from './offlineDB';

// ─── Types ────────────────────────────────────────────────────

export interface TopicOverride {
  verse_key: string;          // e.g. "2:255"
  original_topic_id: number;  // 1-7
  new_topic_id: number;       // 1-7
  reason: string;
  updatedAt: string;
  updatedBy: string;          // 'admin'
}

export interface SubTopic {
  id: string;                 // "1-a", "3-b", etc.
  parent_topic_id: number;    // 1-7
  name_ar: string;
  name_en: string;
  color_shade: string;        // hex lighter/darker variant
  verse_keys: string[];       // assigned verses
  createdAt: string;
}

export interface AuditEntry {
  id?: number;
  action: 'override_topic' | 'revert_override' | 'create_subtopic' | 'delete_subtopic' | 'assign_subtopic' | 'login' | 'logout' | 'export' | 'import';
  target: string;             // verse_key or subtopic id
  details: string;
  timestamp: string;
  role: Role;
}

export interface AdminStats {
  totalOverrides: number;
  totalSubTopics: number;
  totalAuditEntries: number;
  overridesByTopic: Record<number, number>;
  confidenceBreakdown: { high: number; medium: number; low: number };
}

// ─── Validation ───────────────────────────────────────────────

function validateVerseKey(key: string): boolean {
  const match = key.match(/^(\d+):(\d+)$/);
  if (!match) return false;
  const surah = parseInt(match[1]);
  const ayah = parseInt(match[2]);
  return surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= 286;
}

function validateTopicId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= 7;
}

function sanitizeText(text: string): string {
  return text.replace(/[<>]/g, '').trim().slice(0, 500);
}

// ─── Hook ─────────────────────────────────────────────────────

export function useAdmin() {
  const [role, setRole] = useState<Role>('viewer');
  const [configured, setConfigured] = useState(false);
  const [overrides, setOverrides] = useState<TopicOverride[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalOverrides: 0, totalSubTopics: 0, totalAuditEntries: 0,
    overridesByTopic: {}, confidenceBreakdown: { high: 0, medium: 0, low: 0 },
  });

  // ─── Load state on mount ────────────────────────────────────

  useEffect(() => {
    setConfigured(isAdminConfigured());
    const session = getSession();
    if (session) {
      setRole(session.role);
      refreshSession();
    }
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [ov, st, al] = await Promise.all([
        dbGetAll<TopicOverride>(STORES.TOPIC_OVERRIDES),
        dbGetAll<SubTopic>(STORES.SUB_TOPICS),
        dbGetAll<AuditEntry>(STORES.AUDIT_LOG),
      ]);
      setOverrides(ov);
      setSubTopics(st);
      setAuditLog(al.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));

      // Compute stats
      const overridesByTopic: Record<number, number> = {};
      for (const o of ov) {
        overridesByTopic[o.new_topic_id] = (overridesByTopic[o.new_topic_id] || 0) + 1;
      }
      setStats({
        totalOverrides: ov.length,
        totalSubTopics: st.length,
        totalAuditEntries: al.length,
        overridesByTopic,
        confidenceBreakdown: { high: 448, medium: 3257, low: 2531 },
      });
    } catch (err) {
      console.error('[useAdmin] loadData failed:', err);
    }
  }, []);

  // ─── Auth operations ────────────────────────────────────────

  const setup = useCallback(async (passphrase: string): Promise<boolean> => {
    const ok = await setupAdmin(passphrase);
    if (ok) {
      setConfigured(true);
      await addAudit('login', 'system', 'Admin account configured');
    }
    return ok;
  }, []);

  const login = useCallback(async (passphrase: string): Promise<boolean> => {
    const session = await authLogin(passphrase);
    if (session) {
      setRole('admin');
      await addAudit('login', 'system', 'Admin logged in');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await addAudit('logout', 'system', 'Admin logged out');
    authLogout();
    setRole('viewer');
  }, []);

  // ─── Audit log ──────────────────────────────────────────────

  const addAudit = useCallback(async (
    action: AuditEntry['action'], target: string, details: string
  ) => {
    const entry: AuditEntry = {
      action, target, details: sanitizeText(details),
      timestamp: new Date().toISOString(),
      role: checkIsAdmin() ? 'admin' : 'viewer',
    };
    await dbPut(STORES.AUDIT_LOG, entry);
    setAuditLog(prev => [entry, ...prev]);
  }, []);

  // ─── Topic Override CRUD ────────────────────────────────────

  const overrideTopic = useCallback(async (
    verseKey: string, originalTopicId: number, newTopicId: number, reason: string
  ): Promise<boolean> => {
    if (!checkIsAdmin()) return false;
    if (!validateVerseKey(verseKey)) return false;
    if (!validateTopicId(originalTopicId) || !validateTopicId(newTopicId)) return false;
    if (originalTopicId === newTopicId) return false;

    const override: TopicOverride = {
      verse_key: verseKey,
      original_topic_id: originalTopicId,
      new_topic_id: newTopicId,
      reason: sanitizeText(reason),
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
    };

    await dbPut(STORES.TOPIC_OVERRIDES, override);
    await addAudit('override_topic', verseKey,
      `Changed topic ${originalTopicId} → ${newTopicId}: ${reason}`);
    await loadData();
    return true;
  }, [addAudit, loadData]);

  const revertOverride = useCallback(async (verseKey: string): Promise<boolean> => {
    if (!checkIsAdmin()) return false;
    if (!validateVerseKey(verseKey)) return false;

    const existing = await dbGet<TopicOverride>(STORES.TOPIC_OVERRIDES, verseKey);
    if (!existing) return false;

    await dbDelete(STORES.TOPIC_OVERRIDES, verseKey);
    await addAudit('revert_override', verseKey,
      `Reverted topic from ${existing.new_topic_id} back to ${existing.original_topic_id}`);
    await loadData();
    return true;
  }, [addAudit, loadData]);

  const getOverrideForVerse = useCallback((verseKey: string): TopicOverride | undefined => {
    return overrides.find(o => o.verse_key === verseKey);
  }, [overrides]);

  // ─── Sub-topic CRUD ─────────────────────────────────────────

  const createSubTopic = useCallback(async (
    parentTopicId: number, nameAr: string, nameEn: string, colorShade: string
  ): Promise<boolean> => {
    if (!checkIsAdmin()) return false;
    if (!validateTopicId(parentTopicId)) return false;
    if (!nameAr.trim() || !nameEn.trim()) return false;

    // Generate unique ID: "{parent}-{timestamp_short}"
    const id = `${parentTopicId}-${Date.now().toString(36)}`;
    const subTopic: SubTopic = {
      id,
      parent_topic_id: parentTopicId,
      name_ar: sanitizeText(nameAr),
      name_en: sanitizeText(nameEn),
      color_shade: colorShade.match(/^#[0-9a-fA-F]{6}$/) ? colorShade : '#999999',
      verse_keys: [],
      createdAt: new Date().toISOString(),
    };

    await dbPut(STORES.SUB_TOPICS, subTopic);
    await addAudit('create_subtopic', id, `Created sub-topic: ${nameEn} under topic ${parentTopicId}`);
    await loadData();
    return true;
  }, [addAudit, loadData]);

  const deleteSubTopic = useCallback(async (id: string): Promise<boolean> => {
    if (!checkIsAdmin()) return false;
    await dbDelete(STORES.SUB_TOPICS, id);
    await addAudit('delete_subtopic', id, `Deleted sub-topic ${id}`);
    await loadData();
    return true;
  }, [addAudit, loadData]);

  const assignVerseToSubTopic = useCallback(async (
    subTopicId: string, verseKey: string
  ): Promise<boolean> => {
    if (!checkIsAdmin()) return false;
    if (!validateVerseKey(verseKey)) return false;

    const sub = await dbGet<SubTopic>(STORES.SUB_TOPICS, subTopicId);
    if (!sub) return false;
    if (sub.verse_keys.includes(verseKey)) return false;

    sub.verse_keys = [...sub.verse_keys, verseKey];
    await dbPut(STORES.SUB_TOPICS, sub);
    await addAudit('assign_subtopic', verseKey, `Assigned to sub-topic ${subTopicId}`);
    await loadData();
    return true;
  }, [addAudit, loadData]);

  // ─── Export admin data ──────────────────────────────────────

  const exportAdminData = useCallback(async (): Promise<string> => {
    const data = { overrides, subTopics, auditLog, exportedAt: new Date().toISOString() };
    await addAudit('export', 'system', 'Admin data exported');
    return JSON.stringify(data, null, 2);
  }, [overrides, subTopics, auditLog, addAudit]);

  return {
    // Auth
    role, configured, isAdmin: role === 'admin',
    setup, login, logout,
    // CRUD
    overrides, overrideTopic, revertOverride, getOverrideForVerse,
    subTopics, createSubTopic, deleteSubTopic, assignVerseToSubTopic,
    auditLog,
    stats,
    // Export
    exportAdminData,
    loadData,
  };
}
