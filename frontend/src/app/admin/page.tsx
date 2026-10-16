'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import {
    getCurrentUserProfile,
    getAdminStats,
    getAdminUsers,
    banUser,
    unbanUser,
    updateUserTier,
    getSystemSettings,
    updateSystemSettings,
    getAuditLogs,
    testStripeConnection,
    testSmtpConnection,
    resetUserQuota,
    getAdminJobs,
    getQueueStats,
    triggerExpiredCleanup,
    getAdminContactMessages,
    replyToContactMessage,
    updateContactMessage
} from '../../services/api';
import { AdminStats, AdminUser, SystemSettings, AuditLogItem, User, StripeDiagnosticResponse, AdminOCRJob, QueueStatsResponse, ContactMessage } from '../../types';
import {
    ShieldAlert, Users, Settings, Mail, FileText, Activity,
    Search, CheckCircle, XCircle, ShieldCheck, UserCheck, RefreshCw, Loader2, Save, Info, HelpCircle, ExternalLink,
    Terminal, CreditCard, Server, Copy, Check, BookOpen, Clock, PlayCircle, Key, AlertTriangle, Lock, DollarSign,
    RotateCcw, Trash2, Cpu, Database, MessageSquare, Send, MessageCircle
} from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'jobs' | 'settings' | 'support' | 'mailbox' | 'apidocs' | 'guide' | 'logs'>('stats');

    // Data States
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [queueStats, setQueueStats] = useState<QueueStatsResponse | null>(null);
    const [usersList, setUsersList] = useState<AdminUser[]>([]);
    const [jobsList, setJobsList] = useState<AdminOCRJob[]>([]);
    const [jobsTotal, setJobsTotal] = useState<number>(0);
    const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');
    const [resettingQuotaUserId, setResettingQuotaUserId] = useState<string | null>(null);
    const [purgingExpired, setPurgingExpired] = useState<boolean>(false);
    const [purgeResultMsg, setPurgeResultMsg] = useState<string | null>(null);
    const [settingsData, setSettingsData] = useState<SystemSettings | null>(null);
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [settingsSaveMsg, setSettingsSaveMsg] = useState<string | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    // Contact Inquiries State
    const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
    const [contactCounts, setContactCounts] = useState<{ new: number; inProgress: number; replied: number; closed: number; total: number } | null>(null);
    const [contactStatusFilter, setContactStatusFilter] = useState<string>('all');
    const [contactSearch, setContactSearch] = useState<string>('');
    const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
    const [replyText, setReplyText] = useState<string>('');
    const [replySubject, setReplySubject] = useState<string>('');
    const [sendingReply, setSendingReply] = useState<boolean>(false);
    const [replyStatusMsg, setReplyStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Stripe Diagnostics State
    const [testingStripe, setTestingStripe] = useState(false);
    const [stripeDiag, setStripeDiag] = useState<StripeDiagnosticResponse | null>(null);

    const handleTestStripe = async () => {
        setTestingStripe(true);
        setStripeDiag(null);
        try {
            const res = await testStripeConnection();
            setStripeDiag(res);
        } catch (err: any) {
            setStripeDiag({
                connected: false,
                error: err.message || 'Failed to ping Stripe API'
            });
        } finally {
            setTestingStripe(false);
        }
    };

    // SMTP Diagnostics State
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [smtpDiag, setSmtpDiag] = useState<{ success: boolean; recipient?: string; host?: string; message: string } | null>(null);

    const handleTestSmtp = async () => {
        setTestingSmtp(true);
        setSmtpDiag(null);
        try {
            const res = await testSmtpConnection();
            setSmtpDiag(res);
        } catch (err: any) {
            setSmtpDiag({
                success: false,
                message: err.message || 'Failed to ping SMTP server'
            });
        } finally {
            setTestingSmtp(false);
        }
    };

    // Guide Tab States
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
    const [guideCategory, setGuideCategory] = useState<'all' | 'stripe' | 'moderation' | 'email' | 'infra' | 'testing' | 'adsense'>('all');

    const copyToClipboard = (text: string, id: string) => {
        if (typeof window !== 'undefined' && navigator?.clipboard) {
            navigator.clipboard.writeText(text);
            setCopiedCmd(id);
            setTimeout(() => setCopiedCmd(null), 2500);
        }
    };

    // Check Auth Status on Mount
    useEffect(() => {
        getCurrentUserProfile()
            .then(res => {
                setUser(res.user);
            })
            .catch(() => {
                setUser(null);
            })
            .finally(() => {
                setAuthLoading(false);
            });
    }, []);

    // Route Protection & Data Loading
    useEffect(() => {
        if (!authLoading) {
            if (!user || !user.isAdmin) {
                router.replace('/');
            } else {
                fetchTabContent();
            }
        }
    }, [user, authLoading, activeTab]);

    const fetchTabContent = async () => {
        setLoadingData(true);
        try {
            if (activeTab === 'stats') {
                const [statsData, qData] = await Promise.all([
                    getAdminStats(),
                    getQueueStats().catch(() => null)
                ]);
                setStats(statsData);
                setQueueStats(qData);
            } else if (activeTab === 'users') {
                const data = await getAdminUsers();
                setUsersList(data);
            } else if (activeTab === 'jobs') {
                const data = await getAdminJobs(jobStatusFilter);
                setJobsList(data.jobs || []);
                setJobsTotal(data.total || 0);
            } else if (activeTab === 'settings') {
                const data = await getSystemSettings();
                setSettingsData(data);
            } else if (activeTab === 'support') {
                const data = await getAdminContactMessages(contactStatusFilter, contactSearch);
                setContactMessages(data.messages || []);
                setContactCounts(data.counts || null);
            } else if (activeTab === 'logs') {
                const data = await getAuditLogs();
                setLogs(data);
            }

            // Keep support counts fresh for the tab badge
            getAdminContactMessages('all').then(d => setContactCounts(d.counts)).catch(() => {});
        } catch (err) {
            console.error('Failed to load admin data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const openReplyModal = (msg: ContactMessage) => {
        setSelectedContact(msg);
        setReplySubject(`Re: ${msg.subject}`);
        setReplyText('');
        setReplyStatusMsg(null);
    };

    const handleSendReply = async () => {
        if (!selectedContact || !replyText.trim()) return;
        setSendingReply(true);
        setReplyStatusMsg(null);
        try {
            const res = await replyToContactMessage(selectedContact.id, replyText.trim(), replySubject.trim() || undefined);
            setReplyStatusMsg({ type: 'success', text: res.message || 'Reply sent successfully via email!' });
            setContactMessages(prev => prev.map(m => m.id === selectedContact.id ? res.contactMessage : m));
            setSelectedContact(res.contactMessage);
            const fresh = await getAdminContactMessages(contactStatusFilter, contactSearch);
            setContactCounts(fresh.counts);
        } catch (err: any) {
            setReplyStatusMsg({ type: 'error', text: err.message || 'Failed to dispatch reply email' });
        } finally {
            setSendingReply(false);
        }
    };

    const handleUpdateContactStatus = async (messageId: string, newStatus: string) => {
        try {
            const res = await updateContactMessage(messageId, newStatus);
            setContactMessages(prev => prev.map(m => m.id === messageId ? res.contactMessage : m));
            if (selectedContact && selectedContact.id === messageId) {
                setSelectedContact(res.contactMessage);
            }
            const fresh = await getAdminContactMessages(contactStatusFilter, contactSearch);
            setContactCounts(fresh.counts);
        } catch (err: any) {
            alert(err.message || 'Failed to update inquiry status');
        }
    };

    const handleResetQuota = async (userId: string, email: string) => {
        if (!confirm(`Are you sure you want to reset today's daily conversion usage for ${email}?`)) {
            return;
        }
        setResettingQuotaUserId(userId);
        try {
            const res = await resetUserQuota(userId);
            alert(res.message || `Successfully reset quota for ${email}.`);
            fetchTabContent();
        } catch (err: any) {
            alert(err.message || 'Failed to reset quota');
        } finally {
            setResettingQuotaUserId(null);
        }
    };

    const handleTriggerCleanup = async () => {
        setPurgingExpired(true);
        setPurgeResultMsg(null);
        try {
            const res = await triggerExpiredCleanup();
            setPurgeResultMsg(res.message);
            fetchTabContent();
        } catch (err: any) {
            setPurgeResultMsg(err.message || 'Failed to trigger cleanup');
        } finally {
            setPurgingExpired(false);
        }
    };

    const handleBanToggle = async (userId: string, isBanned: boolean) => {
        try {
            if (isBanned) {
                await unbanUser(userId);
            } else {
                await banUser(userId);
            }
            fetchTabContent();
        } catch (err: any) {
            alert(err.message || 'Failed to update user ban status');
        }
    };

    const handleTierChange = async (userId: string, currentTier: string) => {
        const newTier = currentTier === 'pro' ? 'free' : 'pro';
        try {
            await updateUserTier(userId, newTier);
            fetchTabContent();
        } catch (err: any) {
            alert(err.message || 'Failed to update user tier');
        }
    };

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settingsData) return;
        setSavingSettings(true);
        setSettingsSaveMsg(null);
        try {
            const res = await updateSystemSettings(settingsData);
            setSettingsSaveMsg(res.message || 'Settings updated successfully!');
        } catch (err: any) {
            alert(err.message || 'Failed to update settings');
        } finally {
            setSavingSettings(false);
        }
    };

    if (authLoading || (!user?.isAdmin)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="flex items-center gap-3 font-semibold text-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    Verifying Admin Credentials...
                </div>
            </div>
        );
    }

    const filteredUsers = usersList.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.id.includes(searchQuery)
    );

    return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
            <Header />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-950/80 border border-violet-800/50 rounded-full text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Restricted Admin Console
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">System Control Panel</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Moderate users, update platform configurations, inspect security audit logs, and access the system mailbox.
                        </p>
                    </div>

                    <button
                        onClick={fetchTabContent}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-sm font-medium transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none border-b border-slate-800/80">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'stats'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <Activity className="w-4 h-4" />
                        Overview Stats
                    </button>

                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'users'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        User Moderation
                    </button>

                    <button
                        onClick={() => setActiveTab('jobs')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'jobs'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <Server className="w-4 h-4" />
                        OCR Jobs &amp; Failures
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'settings'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        System Settings
                    </button>

                    <button
                        onClick={() => setActiveTab('mailbox')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'mailbox'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <Mail className="w-4 h-4" />
                        System Mailbox (Mailpit)
                    </button>

                    <button
                        onClick={() => setActiveTab('support')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'support'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Support Inquiries
                        {contactCounts && contactCounts.new > 0 && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                                {contactCounts.new}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('apidocs')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'apidocs'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        API Documentation
                    </button>

                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'guide'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <BookOpen className="w-4 h-4 text-violet-400" />
                        Admin How-To Runbook
                    </button>

                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'logs'
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Security Audit Logs
                    </button>
                </div>

                {/* TAB 1: OVERVIEW STATS */}
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</span>
                                <div className="text-3xl font-extrabold text-white mt-2">{stats?.totalUsers ?? '...'}</div>
                                <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {stats?.verifiedUsers ?? 0} Email Verified
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pro Subscribers</span>
                                <div className="text-3xl font-extrabold text-violet-400 mt-2">{stats?.proUsers ?? '...'}</div>
                                <div className="text-xs text-slate-400 mt-2">
                                    {stats?.freeUsers ?? 0} Free Tier Accounts
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total OCR Jobs</span>
                                <div className="text-3xl font-extrabold text-white mt-2">{stats?.totalJobsProcessed ?? '...'}</div>
                                <div className="text-xs text-indigo-400 mt-2">
                                    {stats?.todayConversions ?? 0} Processed Today
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Banned Accounts</span>
                                <div className="text-3xl font-extrabold text-rose-400 mt-2">{stats?.bannedUsers ?? '...'}</div>
                                <div className="text-xs text-rose-400/80 mt-2 flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Account Restrictions Active
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-400" />
                                    Platform Health &amp; Queue Operations
                                </h3>
                                <button
                                    onClick={handleTriggerCleanup}
                                    disabled={purgingExpired}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all disabled:opacity-50"
                                >
                                    <Trash2 className={`w-3.5 h-3.5 ${purgingExpired ? 'animate-spin text-rose-400' : ''}`} />
                                    {purgingExpired ? 'Purging...' : 'Run Zero-Retention Cleanup'}
                                </button>
                            </div>

                            {purgeResultMsg && (
                                <div className="mb-3 p-2.5 bg-emerald-950/80 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 shrink-0" />
                                    <span>{purgeResultMsg}</span>
                                </div>
                            )}

                            <div className="text-sm text-slate-400 space-y-2">
                                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                                    <span>Server System Time (UTC):</span>
                                    <span className="font-mono text-slate-200">{stats?.serverTime ? new Date(stats.serverTime).toUTCString() : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                                    <span>Celery Background Queue Depth:</span>
                                    <span className="font-mono text-violet-400 font-semibold">{queueStats?.celeryQueueLength ?? 0} tasks queued</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                                    <span>Active OCR Processing Jobs:</span>
                                    <span className="font-mono text-amber-400 font-semibold">{queueStats?.processingJobs ?? 0} in progress</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                                    <span>Failed Job Operations:</span>
                                    <span className="font-mono text-rose-400 font-semibold">{stats?.failedJobs ?? 0} failed</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Microservice Stack Health:</span>
                                    <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        FastAPI, Redis ({queueStats?.redisConnected ? 'Online' : 'Connected'}), Celery, Postgres (All Healthy)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: USER MODERATION */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by email address or ID..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                            </div>
                            <span className="text-xs text-slate-400 font-medium">
                                Showing {filteredUsers.length} of {usersList.length} users
                            </span>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">User Email</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Plan Tier</th>
                                            <th className="px-6 py-4">Role</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/80">
                                        {filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                                    {u.email}
                                                    {u.isVerified && (
                                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.isBanned ? (
                                                        <span className="px-2.5 py-1 bg-rose-950/80 text-rose-300 border border-rose-800/60 rounded-full text-xs font-semibold">
                                                            Banned
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded-full text-xs font-semibold">
                                                            Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${u.planTier === 'pro'
                                                        ? 'bg-violet-950/80 text-violet-300 border-violet-800/60'
                                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                                        }`}>
                                                        {u.planTier}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.isAdmin ? (
                                                        <span className="text-amber-400 font-semibold flex items-center gap-1 text-xs">
                                                            <ShieldCheck className="w-3.5 h-3.5" /> Admin
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">Standard</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleBanToggle(u.id, u.isBanned)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${u.isBanned
                                                            ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                                                            : 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800'
                                                            }`}
                                                    >
                                                        {u.isBanned ? 'Unban Account' : 'Ban Account'}
                                                    </button>

                                                    <button
                                                        onClick={() => handleTierChange(u.id, u.planTier)}
                                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-all"
                                                    >
                                                        Toggle {u.planTier === 'pro' ? 'Free' : 'Pro'}
                                                    </button>

                                                    <button
                                                        onClick={() => handleResetQuota(u.id, u.email)}
                                                        disabled={resettingQuotaUserId === u.id}
                                                        className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 rounded-lg text-xs font-medium border border-indigo-800 transition-all disabled:opacity-50 inline-flex items-center gap-1"
                                                        title="Reset today's daily conversion usage quota to 0"
                                                    >
                                                        <RotateCcw className={`w-3 h-3 ${resettingQuotaUserId === u.id ? 'animate-spin' : ''}`} />
                                                        {resettingQuotaUserId === u.id ? 'Resetting...' : 'Reset Quota'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: OCR JOBS & FAILURES (PHASE 6) */}
                {activeTab === 'jobs' && (
                    <div className="space-y-6">
                        {/* Zero-Retention Privacy Banner */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-800/50 rounded-full text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Zero-Retention Active
                                </div>
                                <h3 className="text-xl font-extrabold text-white">OCR Job Processing &amp; Health Operations</h3>
                                <p className="text-slate-400 text-xs mt-1">
                                    Raw user documents and extracted OCR text results are strictly excluded by default from administrator views.
                                </p>
                            </div>

                            <button
                                onClick={handleTriggerCleanup}
                                disabled={purgingExpired}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 rounded-xl text-rose-200 text-xs font-semibold transition-all disabled:opacity-50"
                            >
                                <Trash2 className={`w-4 h-4 ${purgingExpired ? 'animate-spin' : ''}`} />
                                {purgingExpired ? 'Purging...' : 'Run Zero-Retention Cleanup Now'}
                            </button>
                        </div>

                        {purgeResultMsg && (
                            <div className="p-3 bg-emerald-950/80 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                <span>{purgeResultMsg}</span>
                            </div>
                        )}

                        {/* Status Filters & Queue Metrics */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                {['all', 'queued', 'processing', 'completed', 'failed', 'expired'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            setJobStatusFilter(s);
                                            getAdminJobs(s).then(res => {
                                                setJobsList(res.jobs || []);
                                                setJobsTotal(res.total || 0);
                                            });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${jobStatusFilter === s
                                            ? 'bg-violet-600 text-white shadow'
                                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                                <span>Queue Depth: <strong className="text-violet-400">{queueStats?.celeryQueueLength ?? 0}</strong></span>
                                <span>Processing: <strong className="text-amber-400">{queueStats?.processingJobs ?? 0}</strong></span>
                                <span>Total Listed: <strong className="text-white">{jobsTotal}</strong></span>
                            </div>
                        </div>

                        {/* Jobs Table */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Job ID</th>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Type / Pages</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Duration</th>
                                            <th className="px-6 py-4">Created At</th>
                                            <th className="px-6 py-4">Error Diagnostics</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                                        {jobsList.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-sans">
                                                    No OCR jobs match the selected filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            jobsList.map(j => (
                                                <tr key={j.jobId} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-slate-200">
                                                        <span className="truncate block max-w-[140px]" title={j.jobId}>
                                                            {j.jobId.slice(0, 8)}...
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-sans text-slate-300">
                                                        {j.userEmail || 'Anonymous'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="uppercase text-violet-400">{j.fileType}</span>
                                                        <span className="text-slate-500 ml-1">({j.processedPages}/{j.pageCount || 1}p)</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${j.status === 'completed' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' :
                                                            j.status === 'processing' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 animate-pulse' :
                                                            j.status === 'failed' ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60' :
                                                            j.status === 'expired' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                                                            'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                                                        }`}>
                                                            {j.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-300">
                                                        {j.processingMs > 0 ? `${(j.processingMs / 1000).toFixed(2)}s` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-[11px] font-sans">
                                                        {new Date(j.createdAt).toLocaleTimeString()}
                                                    </td>
                                                    <td className="px-6 py-4 font-sans text-xs">
                                                        {j.errorMessage ? (
                                                            <span className="text-rose-400 truncate block max-w-[220px]" title={j.errorMessage}>
                                                                {j.errorMessage}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-600">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: SYSTEM SETTINGS */}
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    <Settings className="w-6 h-6 text-violet-400" />
                                    Live System Configuration &amp; How-To Center
                                </h3>
                                <p className="text-xs text-slate-300 mt-1">
                                    Dynamically update platform quotas, Stripe billing keys, SMTP mailers, and OAuth credentials with integrated step-by-step how-to instructions.
                                </p>
                            </div>
                            <button
                                onClick={handleSettingsSubmit}
                                disabled={savingSettings}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs shadow-lg transition-all disabled:opacity-50 self-start md:self-auto"
                            >
                                <Save className="w-4 h-4" />
                                {savingSettings ? 'Saving...' : 'Save All Settings'}
                            </button>
                        </div>

                        {settingsSaveMsg && (
                            <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm rounded-xl flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                                <span>{settingsSaveMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSettingsSubmit} className="space-y-6">

                            {/* SECTION 1: TIERED QUOTAS & CONVERSION LIMITS */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-indigo-400" />
                                        1. Tiered Quotas &amp; File Size Limits (Free &amp; Pro Tiers)
                                    </h4>
                                    <span className="px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded text-[11px] font-medium">
                                        Quota Middleware
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Anonymous Quota (Per Day)
                                        </label>
                                        <input
                                            type="number"
                                            value={settingsData?.ANONYMOUS_DAILY_CONVERSIONS ?? 3}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, ANONYMOUS_DAILY_CONVERSIONS: e.target.value } : null)}
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-slate-500">Unauthenticated IP limit</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Free Plan Daily Quota
                                        </label>
                                        <input
                                            type="number"
                                            value={settingsData?.FREE_DAILY_CONVERSIONS ?? 3}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, FREE_DAILY_CONVERSIONS: e.target.value } : null)}
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-slate-500">Logged-in free accounts</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Free Max File Size (MB)
                                        </label>
                                        <input
                                            type="number"
                                            value={settingsData?.FREE_MAX_FILE_MB ?? 10}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, FREE_MAX_FILE_MB: e.target.value } : null)}
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-slate-500">Free tier upload cap</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Free Max PDF Pages
                                        </label>
                                        <input
                                            type="number"
                                            value={settingsData?.FREE_MAX_PDF_PAGES ?? 5}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, FREE_MAX_PDF_PAGES: e.target.value } : null)}
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-slate-500">Pages per document</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                                            Pro Plan Daily Quota
                                        </label>
                                        <input
                                            type="number"
                                            value={settingsData?.PRO_DAILY_CONVERSIONS ?? 100}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, PRO_DAILY_CONVERSIONS: e.target.value } : null)}
                                            className="w-full px-4 py-2 bg-slate-950 border border-violet-800/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-violet-400/80">Pro conversions / 24h</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                                            Pro Max File Size (MB)
                                        </label>
                                        <input
                                            type="number"
                                            value={settingsData?.PRO_MAX_FILE_MB ?? 50}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, PRO_MAX_FILE_MB: e.target.value } : null)}
                                            className="w-full px-4 py-2 bg-slate-950 border border-violet-800/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-violet-400/80">Pro file size limit</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
                                            Pro Max PDF Pages
                                        </label>
                                        <input
                                            type="number"
                                            value={settingsData?.PRO_MAX_PDF_PAGES ?? 100}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, PRO_MAX_PDF_PAGES: e.target.value } : null)}
                                            className="w-full px-4 py-2 bg-slate-950 border border-violet-800/60 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-violet-400/80">Pro PDF page limit</span>
                                    </div>
                                </div>

                                {/* Step-by-Step How-To Box for Quotas */}
                                <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                                    <div className="font-bold text-indigo-400 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />
                                        <span>How-To: Plan Quotas &amp; Tier Overrides</span>
                                    </div>
                                    <p className="text-slate-400 leading-relaxed">
                                        Quotas are enforced by <code className="text-slate-200">app/api/quota_middleware.py</code> on every synchronous and asynchronous OCR request. When a Free or unauthenticated user exceeds their daily allowance, the API returns <code className="text-rose-400">429 Too Many Requests</code> with the exact seconds until reset.
                                    </p>
                                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                                        <strong>Admin Override:</strong> You can manually grant VIP Pro tier access to any account without Stripe payment by opening the <strong>User Moderation</strong> tab above and clicking <strong>Toggle Free / Pro</strong>.
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: STRIPE BILLING & SUBSCRIPTIONS CENTER */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                                    <div>
                                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                                            <CreditCard className="w-5 h-5 text-violet-400" />
                                            2. Stripe Billing Policies, Subscriptions &amp; Credentials
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Manage subscription pricing, discount codes, customer portal settings, and diagnose live Stripe API connectivity.
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-0.5 bg-violet-950/80 text-violet-300 border border-violet-800/60 rounded text-[11px] font-medium self-start sm:self-auto">
                                        Phase 4 Stripe Billing
                                    </span>
                                </div>

                                {/* Stripe Diagnostic Banner & Test Connection Probe */}
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-200">Stripe Connection Diagnostic:</span>
                                            {stripeDiag?.connected ? (
                                                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-full text-[11px] font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                    Connected ({stripeDiag.mode?.toUpperCase()} Mode)
                                                </span>
                                            ) : stripeDiag?.error ? (
                                                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800/80 rounded-full text-[11px] font-semibold flex items-center gap-1">
                                                    <XCircle className="w-3 h-3 text-rose-400" />
                                                    Connection Error
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-[11px] font-semibold">
                                                    Status: Ready to Test
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            {stripeDiag?.connected ? (
                                                <span className="text-emerald-400">
                                                    {stripeDiag.message || 'API Authenticated successfully.'}{' '}
                                                    {stripeDiag.priceDisplay && <strong className="text-white">&bull; Verified Price: {stripeDiag.priceDisplay}</strong>}
                                                </span>
                                            ) : stripeDiag?.error ? (
                                                <span className="text-rose-400">{stripeDiag.error}</span>
                                            ) : (
                                                'Test live Stripe API keys and verify whether your Price ID exists in Stripe without making real charges.'
                                            )}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleTestStripe}
                                        disabled={testingStripe}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50 shrink-0 self-start sm:self-auto"
                                    >
                                        {testingStripe ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                                        {testingStripe ? 'Testing Connection...' : 'Test Stripe Connection'}
                                    </button>
                                </div>

                                {/* Part A: Business Billing Policies & Pricing */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                                        <DollarSign className="w-4 h-4 text-emerald-400" />
                                        <span>Business Billing &amp; Plan Parameters</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Pro Monthly Price ID <span className="text-slate-500">(price_...)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.STRIPE_PRO_MONTHLY_PRICE_ID ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_PRO_MONTHLY_PRICE_ID: e.target.value } : null)}
                                                placeholder="price_1Qxxxxxxxxxxxxxxxxxxxxxx"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Stripe recurring Price ID</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Display Price <span className="text-slate-500">(e.g., 19.00)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.STRIPE_DISPLAY_PRICE ?? '19.00'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_DISPLAY_PRICE: e.target.value } : null)}
                                                placeholder="19.00"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Price rendered on /pricing</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Billing Currency
                                            </label>
                                            <select
                                                value={settingsData?.STRIPE_CURRENCY ?? 'USD'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_CURRENCY: e.target.value } : null)}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            >
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="GBP">GBP (£)</option>
                                                <option value="CAD">CAD ($)</option>
                                                <option value="AUD">AUD ($)</option>
                                            </select>
                                            <span className="text-[10px] text-slate-500">ISO currency code</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Promotion Codes on Checkout
                                            </label>
                                            <select
                                                value={settingsData?.STRIPE_ALLOW_PROMO_CODES === 'false' ? 'false' : 'true'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_ALLOW_PROMO_CODES: e.target.value } : null)}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            >
                                                <option value="true">Enabled (Allow Coupons)</option>
                                                <option value="false">Disabled (No Coupons)</option>
                                            </select>
                                            <span className="text-[10px] text-slate-500">Customer checkout coupon input</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Payment Failure Grace Period (Days)
                                            </label>
                                            <input
                                                type="number"
                                                value={settingsData?.STRIPE_GRACE_PERIOD_DAYS ?? 3}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_GRACE_PERIOD_DAYS: e.target.value } : null)}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Days before downgrading past_due</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Portal Self-Service Cancellation
                                            </label>
                                            <select
                                                value={settingsData?.STRIPE_PORTAL_ALLOW_CANCEL === 'false' ? 'false' : 'true'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_PORTAL_ALLOW_CANCEL: e.target.value } : null)}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            >
                                                <option value="true">Allowed in Portal</option>
                                                <option value="false">Requires Contacting Support</option>
                                            </select>
                                            <span className="text-[10px] text-slate-500">Customer Portal policy</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Customer Portal Return URL
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.STRIPE_PORTAL_RETURN_URL ?? '/dashboard'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_PORTAL_RETURN_URL: e.target.value } : null)}
                                                placeholder="/dashboard"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Redirect after portal exit</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Part B: Infrastructure API Credentials (Protected & Masked) */}
                                <div className="space-y-3 pt-4 border-t border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                                            <Lock className="w-4 h-4 text-violet-400" />
                                            <span>Infrastructure API Credentials (Masked for Security)</span>
                                        </div>
                                        <span className="text-[10px] text-emerald-400 font-medium">
                                            Zero Plaintext Exposure
                                        </span>
                                    </div>

                                    <div className="p-3 bg-violet-950/40 border border-violet-800/40 rounded-xl text-[11px] text-violet-300 leading-relaxed">
                                        <strong>Security Note:</strong> High-privilege Stripe secret keys are stored in <code className="text-white">infrastructure/.env</code> and masked in this console. Submitting values containing asterisks (<code className="text-white">••••</code>) will preserve existing keys untouched. Enter a new key only if you are rotating secrets.
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Stripe Secret Key <span className="text-slate-500">(Masked)</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={settingsData?.STRIPE_SECRET_KEY ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_SECRET_KEY: e.target.value } : null)}
                                                placeholder="sk_test_••••••••••••••••"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Server-side secret key</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Stripe Webhook Secret <span className="text-slate-500">(Masked)</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={settingsData?.STRIPE_WEBHOOK_SECRET ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_WEBHOOK_SECRET: e.target.value } : null)}
                                                placeholder="whsec_••••••••••••••••"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">HMAC signature secret</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Stripe Publishable Key <span className="text-slate-500">(pk_test_...)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.STRIPE_PUBLISHABLE_KEY ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRIPE_PUBLISHABLE_KEY: e.target.value } : null)}
                                                placeholder="pk_test_51xxxxxxxxxxxxxxxxxxxxxxxx"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Client-safe public key</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Step-by-Step How-To Box for Stripe */}
                                <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-4 text-xs">
                                    {/* Part A: Create Product in Stripe Dashboard */}
                                    <div className="space-y-2">
                                        <div className="font-bold text-violet-400 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <HelpCircle className="w-4 h-4 text-violet-400" />
                                                Step-by-Step: Create Subscription Plan in Stripe Dashboard
                                            </span>
                                            <a
                                                href="https://dashboard.stripe.com/test/products"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-[11px] text-violet-400 hover:text-violet-300 underline flex items-center gap-1 font-semibold"
                                            >
                                                <span>Open Stripe Products</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>

                                        <p className="text-[11px] text-slate-300 leading-relaxed">
                                            Stripe requires a real recurring Price ID (<code className="text-violet-300">price_1Q...</code>) to initiate Checkout sessions. Follow these steps to generate one in 60 seconds:
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-[10.5px]">
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                                                <div className="font-semibold text-emerald-400">1. Toggle Test Mode</div>
                                                <p className="text-slate-400 text-[10px]">
                                                    Open <a href="https://dashboard.stripe.com/test/products" target="_blank" rel="noreferrer" className="text-violet-400 underline">Stripe Dashboard</a> and ensure the <strong>Test mode</strong> toggle is ON in top-right.
                                                </p>
                                            </div>

                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                                                <div className="font-semibold text-emerald-400">2. Add Product</div>
                                                <p className="text-slate-400 text-[10px]">
                                                    Click <strong>+ Add product</strong> &bull; Name: <code className="text-slate-200">ScanText OCR Pro</code>.
                                                </p>
                                            </div>

                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                                                <div className="font-semibold text-emerald-400">3. Set Pricing</div>
                                                <p className="text-slate-400 text-[10px]">
                                                    Model: <strong>Standard</strong> &bull; Price: <code className="text-slate-200">$19.00</code> &bull; Period: <strong>Monthly (Recurring)</strong>.
                                                </p>
                                            </div>

                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                                                <div className="font-semibold text-emerald-400">4. Copy Price ID</div>
                                                <p className="text-slate-400 text-[10px]">
                                                    Click <strong>Save product</strong> &bull; Copy the <code className="text-emerald-400">price_1Q...</code> ID into <strong>Pro Monthly Price ID</strong> above.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-2.5 bg-violet-950/40 border border-violet-800/40 rounded-lg text-[10.5px] text-violet-300 flex items-center justify-between gap-2">
                                            <span>
                                                <strong>Dynamic Payment Methods:</strong> Payment methods (Credit cards, Apple Pay, Google Pay) are managed automatically from your <a href="https://dashboard.stripe.com/settings/payment_methods" target="_blank" rel="noreferrer" className="text-white underline font-medium">Stripe Payment Methods Settings</a> with zero extra code.
                                            </span>
                                            <a href="https://dashboard.stripe.com/settings/payment_methods" target="_blank" rel="noreferrer" className="text-violet-300 hover:text-white shrink-0">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Part B: Local Webhook CLI Testing */}
                                    <div className="pt-3 border-t border-slate-800 space-y-2">
                                        <div className="font-bold text-violet-400 flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Terminal className="w-4 h-4 text-violet-400" />
                                                Local Webhook Forwarding with Stripe CLI
                                            </span>
                                            <span className="text-[10px] text-slate-500">Live Webhook Testing</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                                <div className="font-semibold text-emerald-400">Step 1: Authenticate CLI</div>
                                                <p className="text-slate-400 text-[10px]">Log in with your Stripe test mode account:</p>
                                                <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded font-mono text-emerald-400 text-[10px]">
                                                    <span>stripe login</span>
                                                    <button type="button" onClick={() => copyToClipboard('stripe login', 'cfg-stripe-login')} className="text-slate-400 hover:text-white">
                                                        {copiedCmd === 'cfg-stripe-login' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                                <div className="font-semibold text-emerald-400">Step 2: Forward Webhooks</div>
                                                <p className="text-slate-400 text-[10px]">Stream events to local backend:</p>
                                                <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded font-mono text-emerald-400 text-[10px]">
                                                    <span className="truncate">stripe listen --forward-to localhost/api/v1/stripe/webhook</span>
                                                    <button type="button" onClick={() => copyToClipboard('stripe listen --forward-to localhost/api/v1/stripe/webhook', 'cfg-stripe-listen')} className="text-slate-400 hover:text-white shrink-0 ml-1">
                                                        {copiedCmd === 'cfg-stripe-listen' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5">
                                                <div className="font-semibold text-emerald-400">Step 3: Trigger Pro Upgrade</div>
                                                <p className="text-slate-400 text-[10px]">Simulate checkout completion:</p>
                                                <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded font-mono text-emerald-400 text-[10px]">
                                                    <span className="truncate">stripe trigger checkout.session.completed</span>
                                                    <button type="button" onClick={() => copyToClipboard('stripe trigger checkout.session.completed', 'cfg-stripe-trig')} className="text-slate-400 hover:text-white shrink-0 ml-1">
                                                        {copiedCmd === 'cfg-stripe-trig' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-slate-400">
                                            For production, open <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer" className="text-violet-400 underline font-medium">Stripe Dashboard &gt; Webhooks</a>, set endpoint URL to <code className="text-emerald-400">https://yourdomain.com/api/v1/stripe/webhook</code>, listen for <code className="text-slate-200">checkout.session.completed</code>, <code className="text-slate-200">customer.subscription.created/updated/deleted</code>, and <code className="text-slate-200">invoice.paid/payment_failed</code>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: SMTP MAILER CONFIGURATION */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-emerald-400" />
                                        3. SMTP Mailer Infrastructure (Mailpit &bull; SendGrid &bull; Gmail)
                                    </h4>
                                    <span className="px-2.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded text-[11px] font-medium">
                                        Email Delivery
                                    </span>
                                </div>

                                {/* SMTP Diagnostic Banner & Test Connection Probe */}
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-200">Mailer Diagnostic:</span>
                                            {smtpDiag?.success ? (
                                                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded-full text-[11px] font-semibold flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                    Connected &amp; Sent
                                                </span>
                                            ) : smtpDiag?.message ? (
                                                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800/80 rounded-full text-[11px] font-semibold flex items-center gap-1">
                                                    <XCircle className="w-3 h-3 text-rose-400" />
                                                    Delivery Error
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-[11px] font-semibold">
                                                    Status: Ready to Test
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            {smtpDiag?.success ? (
                                                <span className="text-emerald-400">
                                                    {smtpDiag.message} &bull; Check inbox for <strong>{smtpDiag.recipient}</strong>
                                                </span>
                                            ) : smtpDiag?.message ? (
                                                <span className="text-rose-400 font-mono text-[10px] break-all">{smtpDiag.message}</span>
                                            ) : (
                                                'Send a live test verification email to your administrator inbox to verify SMTP credentials and TLS handshakes.'
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleTestSmtp}
                                        disabled={testingSmtp}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-white font-medium rounded-xl text-xs transition-all disabled:opacity-50 shrink-0 self-start sm:self-auto"
                                    >
                                        {testingSmtp ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                                <span>Sending Test Email...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>Send Test Email to Admin</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            SMTP Host <span className="text-slate-500">(mailpit in dev, or smtp.sendgrid.net, smtp.gmail.com)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={settingsData?.SMTP_HOST ?? ''}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, SMTP_HOST: e.target.value } : null)}
                                            placeholder="mailpit"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                SMTP Port <span className="text-slate-500">(1025 dev / 587 prod TLS)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.SMTP_PORT ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, SMTP_PORT: e.target.value } : null)}
                                                placeholder="1025"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                From Email <span className="text-slate-500">(Sender address)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.EMAILS_FROM_EMAIL ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, EMAILS_FROM_EMAIL: e.target.value } : null)}
                                                placeholder="noreply@scantext.io"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                SMTP User <span className="text-slate-500">(apikey, your-email@gmail.com, etc.)</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.SMTP_USER ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, SMTP_USER: e.target.value } : null)}
                                                placeholder="apikey"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                SMTP Password <span className="text-slate-500">(16-char App Password or API Key)</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={settingsData?.SMTP_PASSWORD ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, SMTP_PASSWORD: e.target.value } : null)}
                                                placeholder="•••• •••• •••• ••••"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Step-by-Step How-To Box for SMTP */}
                                <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 text-xs">
                                    <div className="font-bold text-emerald-400 flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <HelpCircle className="w-4 h-4 text-emerald-400" />
                                            How-To: Step-by-Step Email Mailer Setup &amp; Live Verification
                                        </span>
                                        <span className="text-[10px] text-slate-500">Zero Password Rejection</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                        {/* Option A */}
                                        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-1.5 flex flex-col justify-between">
                                            <div>
                                                <div className="font-semibold text-emerald-400">Option A: Local Dev (Mailpit)</div>
                                                <p className="text-slate-400 text-[10px] leading-relaxed mb-2">
                                                    Default local catcher. Captures all registration and reset emails without sending to real inboxes.
                                                </p>
                                                <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[10px] text-slate-300 space-y-0.5">
                                                    <div>Host: <span className="text-emerald-400">mailpit</span></div>
                                                    <div>Port: <span className="text-emerald-400">1025</span></div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-emerald-400 font-medium pt-2">
                                                View emails live in the System Mailbox tab above.
                                            </p>
                                        </div>

                                        {/* Option B: Gmail */}
                                        <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-2 col-span-1 md:col-span-2">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                                                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                                                    Option B: Real Gmail Delivery via Google App Password (Step-by-Step)
                                                </div>
                                                <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
                                                    Required for Gmail
                                                </span>
                                            </div>
                                            
                                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                                Google disabled standard passwords for SMTP in 2022. You must generate a 16-character <strong>Google App Password</strong>:
                                            </p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-300">
                                                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
                                                    <span className="font-bold text-white flex items-center gap-1">
                                                        <span>1.</span> Google Account Security
                                                    </span>
                                                    <p className="text-slate-400 text-[9.5px]">
                                                        Open <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-medium">Google Security Settings</a> and ensure <strong>2-Step Verification</strong> is ON.
                                                    </p>
                                                </div>

                                                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1">
                                                    <span className="font-bold text-white flex items-center gap-1">
                                                        <span>2.</span> Generate App Password
                                                    </span>
                                                    <p className="text-slate-400 text-[9.5px]">
                                                        Search "App passwords" or visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-medium">myaccount.google.com/apppasswords</a>. Enter name <code className="text-slate-200">ScanText OCR</code>, click <strong>Create</strong>, and copy the 16-letter code.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] text-slate-300 space-y-1.5">
                                                <span className="font-bold text-white">3. Enter Values in Section 3 Above:</span>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[9px] text-slate-300">
                                                    <div>Host: <span className="text-emerald-400">smtp.gmail.com</span></div>
                                                    <div>Port: <span className="text-emerald-400">587</span></div>
                                                    <div>User: <span className="text-emerald-400">your_email@gmail.com</span></div>
                                                    <div>From: <span className="text-emerald-400">your_email@gmail.com</span></div>
                                                </div>
                                                <p className="text-[9.5px] text-slate-400">
                                                    Paste the 16-character code (without spaces) into <strong>SMTP Password</strong> &bull; Click <strong>Save All Settings</strong>.
                                                </p>
                                            </div>

                                            <div className="bg-emerald-950/40 p-2.5 rounded border border-emerald-800/40 text-[10px] text-emerald-300 flex items-center justify-between gap-2">
                                                <span>
                                                    <strong>4. Test with Live Diagnostic Tool:</strong> Click <strong>Send Test Email to Admin</strong> above. <span className="text-emerald-400 font-bold">Green</span> = delivered to your inbox; <span className="text-rose-400 font-bold">Red</span> = prints exact server response.
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: GOOGLE OAUTH 2.0 CREDENTIALS */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                        4. Google OAuth 2.0 Single Sign-On
                                    </h4>
                                    <span className="px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded text-[11px] font-medium">
                                        OAuth 2.0
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Google Client ID <span className="text-slate-500">(xxx.apps.googleusercontent.com)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={settingsData?.GOOGLE_CLIENT_ID ?? ''}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, GOOGLE_CLIENT_ID: e.target.value } : null)}
                                            placeholder="123456789-abc.apps.googleusercontent.com"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Google Client Secret <span className="text-slate-500">(GOCSPX-xxx)</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={settingsData?.GOOGLE_CLIENT_SECRET ?? ''}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, GOOGLE_CLIENT_SECRET: e.target.value } : null)}
                                            placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Authorized Redirect URI <span className="text-amber-400 font-semibold">(Must match Google Cloud Console exactly)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={settingsData?.GOOGLE_REDIRECT_URI ?? 'http://localhost/api/v1/auth/google/callback'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, GOOGLE_REDIRECT_URI: e.target.value } : null)}
                                                className="w-full pl-4 pr-12 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(settingsData?.GOOGLE_REDIRECT_URI ?? 'http://localhost/api/v1/auth/google/callback', 'cfg-g-uri')}
                                                className="absolute top-1.5 right-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                                title="Copy redirect URI"
                                            >
                                                {copiedCmd === 'cfg-g-uri' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Step-by-Step How-To Box for Google OAuth */}
                                <div className="mt-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                                    <div className="font-bold text-indigo-400 flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4" />
                                        <span>How-To: Step-by-Step Google Cloud Console Setup</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] pt-1">
                                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                                            <span className="font-bold text-white">1. Create Project</span>
                                            <p className="text-slate-400 text-[10px]">Open console.cloud.google.com and create project "ScanText OCR".</p>
                                        </div>
                                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                                            <span className="font-bold text-white">2. Consent Screen</span>
                                            <p className="text-slate-400 text-[10px]">Under APIs &amp; Services &gt; OAuth consent screen, select External &amp; enter support email.</p>
                                        </div>
                                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                                            <span className="font-bold text-white">3. Create Credentials</span>
                                            <p className="text-slate-400 text-[10px]">Credentials &gt; + Create Credentials &gt; OAuth client ID &gt; Web application. Paste redirect URI.</p>
                                        </div>
                                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                                            <span className="font-bold text-emerald-400">4. Save &amp; Live</span>
                                            <p className="text-slate-400 text-[10px]">Paste Client ID &amp; Secret above, then click Save All Settings. Live instantly!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 5: ABUSE PROTECTION & CONFIGURABLE CAPTCHA */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                                        5. Abuse Protection &amp; Configurable CAPTCHA
                                    </h4>
                                    <span className="px-2.5 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded text-[11px] font-medium">
                                        Bot &amp; Abuse Defense
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                                            <input
                                                type="checkbox"
                                                id="captcha_enabled"
                                                checked={String(settingsData?.CAPTCHA_ENABLED).toLowerCase() === 'true'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, CAPTCHA_ENABLED: String(e.target.checked) } : null)}
                                                className="w-4 h-4 text-violet-600 rounded bg-slate-900 border-slate-700 focus:ring-violet-500 cursor-pointer"
                                            />
                                            <label htmlFor="captcha_enabled" className="text-xs font-semibold text-slate-200 cursor-pointer">
                                                Enforce CAPTCHA on Anonymous Uploads &amp; Registration
                                            </label>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                CAPTCHA Provider
                                            </label>
                                            <select
                                                value={settingsData?.CAPTCHA_PROVIDER || 'turnstile'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, CAPTCHA_PROVIDER: e.target.value } : null)}
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            >
                                                <option value="turnstile">Cloudflare Turnstile (Privacy-friendly, Free)</option>
                                                <option value="recaptcha">Google reCAPTCHA v2 / v3</option>
                                                <option value="hcaptcha">hCaptcha</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                CAPTCHA Site Key (Public)
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.CAPTCHA_SITE_KEY ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, CAPTCHA_SITE_KEY: e.target.value } : null)}
                                                placeholder="0x4AAAAAA..."
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                CAPTCHA Secret Key (Server Verification)
                                            </label>
                                            <input
                                                type="password"
                                                value={settingsData?.CAPTCHA_SECRET_KEY ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, CAPTCHA_SECRET_KEY: e.target.value } : null)}
                                                placeholder="0x4AAAAAA..."
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Zero-leakage secret masking active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 6: ERROR MONITORING & OBSERVABILITY */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-indigo-400" />
                                        6. Error Monitoring &amp; Structured Application Logs
                                    </h4>
                                    <span className="px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded text-[11px] font-medium">
                                        Sentry &amp; Logs
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                            Sentry DSN Integration URL
                                        </label>
                                        <input
                                            type="password"
                                            value={settingsData?.SENTRY_DSN ?? ''}
                                            onChange={e => setSettingsData(prev => prev ? { ...prev, SENTRY_DSN: e.target.value } : null)}
                                            placeholder="https://xxx@o0.ingest.sentry.io/0"
                                            className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                                        />
                                        <span className="text-[10px] text-slate-500">Leave blank for local console error logging</span>
                                    </div>

                                    <div className="flex flex-col justify-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="structured_logging"
                                                checked={String(settingsData?.STRUCTURED_LOGGING).toLowerCase() === 'true'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, STRUCTURED_LOGGING: String(e.target.checked) } : null)}
                                                className="w-4 h-4 text-violet-600 rounded bg-slate-900 border-slate-700 focus:ring-violet-500 cursor-pointer"
                                            />
                                            <label htmlFor="structured_logging" className="text-xs font-semibold text-slate-200 cursor-pointer">
                                                Enable Production Structured JSON Logging
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-2">
                                            Redacts passwords, Stripe keys, and JWT tokens automatically with RedactingLogFilter.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 7: GOOGLE ADSENSE MONETIZATION (FREE TIER) */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-emerald-400" />
                                        7. Google AdSense Monetization (Free Tier Only)
                                    </h4>
                                    <span className="px-2.5 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded text-[11px] font-medium">
                                        Ad-Safe Free Tier
                                    </span>
                                </div>

                                <div className="p-3 bg-violet-950/40 border border-violet-800/40 rounded-xl text-xs text-violet-300 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>
                                        <strong>Strict Pro Tier Suppression:</strong> Paid Pro subscribers never see ads, ad scripts, or trackers. Ads only render for Free and Anonymous users in compliant positions strictly below upload forms and completed results.
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                                            <input
                                                type="checkbox"
                                                id="adsense_enabled"
                                                checked={String(settingsData?.ADSENSE_ENABLED).toLowerCase() === 'true'}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, ADSENSE_ENABLED: String(e.target.checked) } : null)}
                                                className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
                                            />
                                            <label htmlFor="adsense_enabled" className="text-xs font-semibold text-slate-200 cursor-pointer">
                                                Enable Live Google AdSense (Renders Real Ads on Free Tier)
                                            </label>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Google AdSense Publisher ID
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.ADSENSE_CLIENT_ID ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, ADSENSE_CLIENT_ID: e.target.value } : null)}
                                                placeholder="ca-pub-1234567890123456"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Found in your AdSense Account &gt; Account Information</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Below-Upload Ad Slot ID (Responsive Banner)
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.ADSENSE_SLOT_BELOW_UPLOAD ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, ADSENSE_SLOT_BELOW_UPLOAD: e.target.value } : null)}
                                                placeholder="1234567890"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Display ad unit placed directly below the dropzone</span>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                Below-Results Ad Slot ID (Responsive Banner)
                                            </label>
                                            <input
                                                type="text"
                                                value={settingsData?.ADSENSE_SLOT_BELOW_RESULTS ?? ''}
                                                onChange={e => setSettingsData(prev => prev ? { ...prev, ADSENSE_SLOT_BELOW_RESULTS: e.target.value } : null)}
                                                placeholder="9876543210"
                                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <span className="text-[10px] text-slate-500">Display ad unit placed below extracted text results</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Option 1: Live via Admin Console Step-by-Step Guide */}
                                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
                                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                                            Option 1: Live via Admin Console (Recommended Step-by-Step)
                                        </div>
                                        <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60">
                                            Instant PostgreSQL Sync
                                        </span>
                                    </div>

                                    <p className="text-slate-400 text-[10px] leading-relaxed">
                                        Enable and manage real Google AdSense units directly through this interface with zero container restarts or code changes:
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[10.5px] text-slate-300">
                                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-emerald-600/80 text-white flex items-center justify-center font-bold text-[9px] shrink-0">1</span>
                                                <span>Admin Console</span>
                                            </div>
                                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                                Open <code className="text-emerald-400">/admin</code> &gt; <strong>System Settings</strong> &gt; scroll to <strong>7. Google AdSense Monetization</strong>.
                                            </p>
                                        </div>

                                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-emerald-600/80 text-white flex items-center justify-center font-bold text-[9px] shrink-0">2</span>
                                                <span>Enable Real Ads</span>
                                            </div>
                                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                                Check <strong>Enable Live Google AdSense</strong> to activate live Google AdSense ad delivery for Free and Anonymous users.
                                            </p>
                                        </div>

                                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-emerald-600/80 text-white flex items-center justify-center font-bold text-[9px] shrink-0">3</span>
                                                <span>Publisher &amp; Slots</span>
                                            </div>
                                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                                Paste your AdSense Publisher ID (<code className="text-emerald-400">ca-pub-...</code>) and numeric responsive banner slot IDs from your AdSense dashboard.
                                            </p>
                                        </div>

                                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-emerald-600/80 text-white flex items-center justify-center font-bold text-[9px] shrink-0">4</span>
                                                <span>Save All Settings</span>
                                            </div>
                                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                                Click <strong>Save All Settings</strong> at the top. The settings are saved in PostgreSQL and take effect immediately.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-[10.5px] text-emerald-300 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span><strong>Strict Compliance Guarantee:</strong> Pro subscribers never receive ad scripts or network calls. Placements are restricted strictly below upload and results (zero accidental clicks).</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 8: OPERATIONS & DEVELOPER RUNBOOKS */}
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                        <Terminal className="w-5 h-5 text-amber-400" />
                                        8. Operations Runbooks &amp; Quick Commands
                                    </h4>
                                    <span className="px-2.5 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded text-[11px] font-medium">
                                        Developer Runbook
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    {/* Celery Commands */}
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                        <div className="font-bold text-amber-400 flex items-center gap-2">
                                            <Server className="w-4 h-4" />
                                            <span>Celery &amp; Cleanup Tasks</span>
                                        </div>
                                        <p className="text-slate-400 text-[11px]">
                                            Monitor background OCR jobs and the 15-minute file expiration cleanup:
                                        </p>
                                        <div className="space-y-1.5 font-mono text-[10px]">
                                            <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                                                <span className="truncate text-emerald-300">docker-compose logs -f celery_worker</span>
                                                <button type="button" onClick={() => copyToClipboard('docker-compose logs -f celery_worker', 'cfg-cw')} className="p-0.5 text-slate-400 hover:text-white">
                                                    {copiedCmd === 'cfg-cw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                                                <span className="truncate text-emerald-300">docker-compose logs -f celery_beat</span>
                                                <button type="button" onClick={() => copyToClipboard('docker-compose logs -f celery_beat', 'cfg-cb')} className="p-0.5 text-slate-400 hover:text-white">
                                                    {copiedCmd === 'cfg-cb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Automated Tests Commands */}
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                        <div className="font-bold text-rose-400 flex items-center gap-2">
                                            <PlayCircle className="w-4 h-4" />
                                            <span>Run Automated Tests</span>
                                        </div>
                                        <p className="text-slate-400 text-[11px]">
                                            Run all 40 automated tests across OCR, Auth, Quotas, and Stripe:
                                        </p>
                                        <div className="space-y-1.5 font-mono text-[10px]">
                                            <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                                                <span className="truncate text-emerald-300">cd backend; .\venv\Scripts\Activate.ps1</span>
                                                <button type="button" onClick={() => copyToClipboard('cd backend; .\\venv\\Scripts\\Activate.ps1', 'cfg-venv')} className="p-0.5 text-slate-400 hover:text-white">
                                                    {copiedCmd === 'cfg-venv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                                                <span className="truncate text-emerald-300">pytest tests/ -v</span>
                                                <button type="button" onClick={() => copyToClipboard('pytest tests/ -v', 'cfg-py')} className="p-0.5 text-slate-400 hover:text-white">
                                                    {copiedCmd === 'cfg-py' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Swagger API Explorer */}
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                                        <div className="font-bold text-indigo-400 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            <span>Interactive Swagger Docs</span>
                                        </div>
                                        <p className="text-slate-400 text-[11px]">
                                            Test live REST endpoints directly in Swagger with your admin session:
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('apidocs')}
                                            className="w-full mt-2 py-2 px-3 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/80 rounded-lg text-xs font-medium text-center transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Open API Documentation Tab
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button at Bottom */}
                            <button
                                type="submit"
                                disabled={savingSettings}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all disabled:opacity-50 text-sm"
                            >
                                <Save className="w-4 h-4" />
                                {savingSettings ? 'Saving Settings...' : 'Save All System Configuration Changes'}
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB 4: SYSTEM MAILBOX (MAILPIT PROTECTED) */}
                {activeTab === 'mailbox' && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[750px]">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-violet-400" />
                                    System Mailbox (Internal Mailpit)
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Strictly protected under Admin authentication. View account activation links & password reset tokens live.
                                </p>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded-full text-xs font-semibold">
                                Protected Admin Route
                            </span>
                        </div>

                        <div className="flex-1 w-full rounded-xl overflow-hidden border border-slate-800 bg-white">
                            <iframe
                                src="/mail/"
                                className="w-full h-full border-0"
                                title="Mailpit System Mailbox"
                            />
                        </div>
                    </div>
                )}

                {/* TAB 5: API DOCUMENTATION */}
                {activeTab === 'apidocs' && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[750px]">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                    Interactive REST API Documentation (OpenAPI / Swagger)
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Interactive backend API endpoint schemas, request bodies, and responses.
                                </p>
                            </div>
                            <span className="px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded-full text-xs font-semibold">
                                Protected Admin View
                            </span>
                        </div>

                        <div className="flex-1 w-full rounded-xl overflow-hidden border border-slate-800 bg-white">
                            <iframe
                                src="/api/v1/docs"
                                className="w-full h-full border-0"
                                title="Swagger API Documentation"
                            />
                        </div>
                    </div>
                )}

                {/* TAB 6: ADMIN HOW-TO RUNBOOK & OPERATIONS GUIDE */}
                {activeTab === 'guide' && (
                    <div className="space-y-6">
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                                    <BookOpen className="w-6 h-6 text-violet-400" />
                                    Admin Operations &amp; How-To Runbook
                                </h3>
                                <p className="text-xs text-slate-300 mt-1">
                                    Interactive step-by-step procedures for Stripe billing, user moderation, email verification, Celery worker monitoring, automated test execution, and API debugging.
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full text-xs font-semibold self-start md:self-auto">
                                8 Standard Operating Procedures
                            </span>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {[
                                { id: 'all', label: 'All Runbooks (8)', icon: BookOpen },
                                { id: 'stripe', label: 'Stripe Subscriptions', icon: CreditCard },
                                { id: 'moderation', label: 'User Moderation', icon: Users },
                                { id: 'email', label: 'Email & Auth', icon: Mail },
                                { id: 'infra', label: 'Celery & Redis', icon: Server },
                                { id: 'testing', label: 'Automated Tests', icon: PlayCircle },
                                { id: 'adsense', label: 'AdSense & Ads', icon: DollarSign },
                            ].map(cat => {
                                const IconComponent = cat.icon;
                                const isSelected = guideCategory === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setGuideCategory(cat.id as any)}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap border ${isSelected
                                            ? 'bg-violet-600/30 border-violet-500/60 text-violet-200 shadow-sm'
                                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                                            }`}
                                    >
                                        <IconComponent className="w-3.5 h-3.5" />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* GRID OF HOW-TO RUNBOOKS */}
                        <div className="space-y-6">

                            {/* RUNBOOK 1: STRIPE SUBSCRIPTIONS & WEBHOOKS WITH STRIPE CLI */}
                            {(guideCategory === 'all' || guideCategory === 'stripe') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <CreditCard className="w-5 h-5 text-violet-400" />
                                            1. How to Test Stripe Subscriptions &amp; Webhooks Locally
                                        </h4>
                                        <span className="px-3 py-1 bg-violet-950/80 text-violet-300 border border-violet-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            Phase 4 Billing &bull; Stripe CLI
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Test the entire Stripe Checkout subscription lifecycle, HMAC webhook signature verification, and automatic tier upgrades locally using the official Stripe CLI without charging a real credit card.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">Install &amp; Authenticate CLI</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Install the Stripe CLI (<code className="text-violet-300">scoop install stripe</code> or download from stripe.com), then authenticate your developer account:
                                                </p>
                                                <div className="relative group">
                                                    <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px] overflow-x-auto">stripe login</pre>
                                                    <button
                                                        onClick={() => copyToClipboard('stripe login', 'stripe-login')}
                                                        className="absolute top-2 right-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 opacity-80 hover:opacity-100"
                                                        title="Copy command"
                                                    >
                                                        {copiedCmd === 'stripe-login' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Pairs browser with Stripe test mode</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">Forward Webhooks Locally</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Forward inbound Stripe webhook events directly to the backend webhook handler:
                                                </p>
                                                <div className="relative group">
                                                    <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">stripe listen --forward-to localhost/api/v1/stripe/webhook</pre>
                                                    <button
                                                        onClick={() => copyToClipboard('stripe listen --forward-to localhost/api/v1/stripe/webhook', 'stripe-listen')}
                                                        className="absolute top-2 right-2 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 opacity-80 hover:opacity-100"
                                                        title="Copy command"
                                                    >
                                                        {copiedCmd === 'stripe-listen' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-amber-400 mt-2">
                                                Copy printed <code className="text-slate-200">whsec_...</code> into <code className="text-slate-200">STRIPE_WEBHOOK_SECRET</code> in <code className="text-slate-200">.env</code>.
                                            </p>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Trigger Test Events</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Simulate subscription creation, cancellations, and renewals via CLI triggers:
                                                </p>
                                                <div className="space-y-1.5 font-mono text-[10px]">
                                                    <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                                                        <span className="text-emerald-300 truncate">stripe trigger checkout.session.completed</span>
                                                        <button onClick={() => copyToClipboard('stripe trigger checkout.session.completed', 'trig-checkout')} className="p-0.5 text-slate-400 hover:text-white">
                                                            {copiedCmd === 'trig-checkout' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800">
                                                        <span className="text-rose-300 truncate">stripe trigger customer.subscription.deleted</span>
                                                        <button onClick={() => copyToClipboard('stripe trigger customer.subscription.deleted', 'trig-cancel')} className="p-0.5 text-slate-400 hover:text-white">
                                                            {copiedCmd === 'trig-cancel' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Tested for strict idempotency</span>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Verify Quota &amp; Limits</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Check user account in <strong>User Moderation</strong> or <code className="text-violet-300">/dashboard</code>.
                                                </p>
                                                <ul className="text-slate-300 space-y-1 text-[11px]">
                                                    <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                                        Plan: <strong className="uppercase">Pro ($19/mo)</strong>
                                                    </li>
                                                    <li className="flex items-center gap-1.5 text-slate-400">
                                                        &bull; 100 conversions / day
                                                    </li>
                                                    <li className="flex items-center gap-1.5 text-slate-400">
                                                        &bull; 50 MB max file &bull; 100 PDF pages
                                                    </li>
                                                    <li className="flex items-center gap-1.5 text-slate-400">
                                                        &bull; Zero ads &bull; Batch enabled
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-300 font-medium text-[10px] text-center">
                                                Self-Service Customer Portal Enabled
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RUNBOOK 2: USER MODERATION & PRO TIER OVERRIDES */}
                            {(guideCategory === 'all' || guideCategory === 'moderation') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <Users className="w-5 h-5 text-indigo-400" />
                                            2. How to Moderate Accounts &amp; Override Subscription Tiers
                                        </h4>
                                        <span className="px-3 py-1 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            Account Administration
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Administrators can search accounts, immediately revoke active JWT sessions for malicious actors, and manually grant VIP Pro tier access without requiring credit card checkout.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">Search &amp; Locate User</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed">
                                                    Switch to the <strong>User Moderation</strong> tab above. Type the user's email address (e.g. <code className="text-slate-200">user@company.com</code>) or UUID into the search box to filter in real-time.
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Live search filter with instant UI updates</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">Manual VIP Pro Upgrade</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Click <strong>Toggle Free / Pro</strong> on any user row.
                                                </p>
                                                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                                                    Instantly promotes user to <strong className="text-violet-400">Pro Plan</strong> with 100 conversions/day, 50MB files, and no ads without charging Stripe.
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-emerald-400">Click again anytime to revert to Free</span>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Immediate Account Ban</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Click <strong>Ban Account</strong> on abusive or compromised users.
                                                </p>
                                                <div className="bg-rose-950/40 p-2 rounded-lg border border-rose-900/60 text-[11px] text-rose-300">
                                                    Active JWT sessions are rejected immediately. All OCR conversion attempts return <code className="text-rose-200">403 Forbidden</code>.
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-rose-400">Click Unban Account to restore access</span>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Review Audit Trail</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed">
                                                    Navigate to <strong>Security Audit Logs</strong> to inspect the immutable log entry documenting:
                                                </p>
                                                <ul className="text-slate-300 space-y-1 text-[11px] mt-1">
                                                    <li>&bull; Admin email &amp; timestamp</li>
                                                    <li>&bull; Target user ID &amp; email</li>
                                                    <li>&bull; Action type (<code className="text-violet-300">BAN_USER</code>, <code className="text-violet-300">TIER_UPDATE</code>)</li>
                                                    <li>&bull; Originating IP address</li>
                                                </ul>
                                            </div>
                                            <div className="p-2 bg-indigo-950/60 border border-indigo-800/60 rounded-lg text-indigo-300 font-medium text-[10px] text-center">
                                                Immutable Database Audit Trail
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RUNBOOK 3: MAILPIT & EMAIL VERIFICATION WORKFLOW */}
                            {(guideCategory === 'all' || guideCategory === 'email') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <Mail className="w-5 h-5 text-emerald-400" />
                                            3. How to Inspect Activation Links &amp; Reset Tokens in Mailpit
                                        </h4>
                                        <span className="px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            Zero External Email Leaks
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Mailpit intercepts all outgoing platform emails (verification codes, password reset tokens, and notifications) locally in development so you never send real emails to live customer inboxes.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">Open System Mailbox</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Click the <strong>System Mailbox (Mailpit)</strong> tab above to view the embedded inbox directly, or open:
                                                </p>
                                                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px]">
                                                    http://localhost/mail/
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Secured behind admin cookie check</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">Locate Captured Email</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed">
                                                    When a user registers on <code className="text-violet-300">/register</code> or requests a password reset on <code className="text-violet-300">/forgot-password</code>, the message appears in the list within 50 milliseconds.
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-emerald-400">Shows sender, recipient, and subject</span>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Extract Token or Link</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed">
                                                    Click the email to view the styled HTML rendering. Click the <strong>Verify Account</strong> button or copy the 32-byte secure token to verify the user account directly in your browser.
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Tokens are cryptographically generated &amp; single-use</span>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Switch to Production</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-1">
                                                    To deliver live emails in production, navigate to <strong>System Settings</strong>:
                                                </p>
                                                <ul className="text-slate-400 text-[10px] space-y-0.5 font-mono">
                                                    <li>Host: <span className="text-slate-200">smtp.sendgrid.net</span></li>
                                                    <li>Port: <span className="text-slate-200">587</span> (Auto-TLS)</li>
                                                    <li>User: <span className="text-slate-200">apikey</span></li>
                                                </ul>
                                            </div>
                                            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-[10px] text-center">
                                                Or use Gmail 16-character App Password
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RUNBOOK 4: CELERY WORKERS & PERIODIC CLEANUP TASKS */}
                            {(guideCategory === 'all' || guideCategory === 'infra') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <Server className="w-5 h-5 text-amber-400" />
                                            4. How to Monitor Celery Background Workers &amp; Periodic Cleanup
                                        </h4>
                                        <span className="px-3 py-1 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            Asynchronous Pipeline
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        The asynchronous pipeline offloads heavy multi-page PDF processing to distributed Celery workers and runs automated background tasks to enforce 24-hour file expiration and data privacy.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">Stream OCR Worker Logs</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Inspect real-time OCR execution, task ID dispatch, and execution durations:
                                                </p>
                                                <div className="relative group">
                                                    <pre className="bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">docker-compose logs -f celery_worker</pre>
                                                    <button
                                                        onClick={() => copyToClipboard('docker-compose logs -f celery_worker', 'log-celery')}
                                                        className="absolute top-1.5 right-1.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 opacity-80 hover:opacity-100"
                                                    >
                                                        {copiedCmd === 'log-celery' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Reports task state: PENDING, PROGRESS, SUCCESS</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">Verify 15-Min File Cleanup</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Celery Beat triggers automatic cleanup of files older than 24 hours:
                                                </p>
                                                <div className="relative group">
                                                    <pre className="bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">docker-compose logs -f celery_beat</pre>
                                                    <button
                                                        onClick={() => copyToClipboard('docker-compose logs -f celery_beat', 'log-beat')}
                                                        className="absolute top-1.5 right-1.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 opacity-80 hover:opacity-100"
                                                    >
                                                        {copiedCmd === 'log-beat' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-emerald-400 mt-2">
                                                Executes <code className="text-slate-200">cleanup_expired_files_task</code> every 900 seconds
                                            </p>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Inspect Redis Broker</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Check broker connectivity and active job queue depth:
                                                </p>
                                                <div className="space-y-1 font-mono text-[10px]">
                                                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300">
                                                        docker-compose exec redis redis-cli ping
                                                    </div>
                                                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300">
                                                        docker-compose exec redis redis-cli llen celery
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Expect PONG and queue depth 0 when idle</span>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Restart Workers</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    After applying OCR code changes or updates to Celery tasks:
                                                </p>
                                                <div className="relative group">
                                                    <pre className="bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">docker-compose restart celery_worker celery_beat</pre>
                                                    <button
                                                        onClick={() => copyToClipboard('docker-compose restart celery_worker celery_beat', 'restart-workers')}
                                                        className="absolute top-1.5 right-1.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 opacity-80 hover:opacity-100"
                                                    >
                                                        {copiedCmd === 'restart-workers' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-300 font-medium text-[10px] text-center">
                                                Zero Downtime Background Workers
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RUNBOOK 5: AUTOMATED TESTING SUITE (40 TESTS) */}
                            {(guideCategory === 'all' || guideCategory === 'testing') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <PlayCircle className="w-5 h-5 text-rose-400" />
                                            5. How to Run the 40-Test Verification Suite Locally
                                        </h4>
                                        <span className="px-3 py-1 bg-rose-950/80 text-rose-300 border border-rose-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            40 / 40 Tests Passing (100%)
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        The test suite covers file validation, OCR processing, asynchronous Celery tasks, Phase 3 authentication/rate limits, and Phase 4 Stripe subscriptions and webhook idempotency.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">Activate Python Venv</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Open PowerShell in the project root and activate the backend virtual environment:
                                                </p>
                                                <div className="relative group">
                                                    <pre className="bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[10px] overflow-x-auto whitespace-pre-wrap break-all">cd backend; .\venv\Scripts\Activate.ps1</pre>
                                                    <button
                                                        onClick={() => copyToClipboard('cd backend; .\\venv\\Scripts\\Activate.ps1', 'venv-act')}
                                                        className="absolute top-1.5 right-1.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 opacity-80 hover:opacity-100"
                                                    >
                                                        {copiedCmd === 'venv-act' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Loads pytest, FastAPI, Stripe SDK</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">Run Full Test Suite</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Execute all 40 tests with verbose status reporting:
                                                </p>
                                                <div className="relative group">
                                                    <pre className="bg-slate-900 p-2 rounded-lg border border-slate-800 font-mono text-emerald-400 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">pytest tests/ -v</pre>
                                                    <button
                                                        onClick={() => copyToClipboard('pytest tests/ -v', 'run-tests')}
                                                        className="absolute top-1.5 right-1.5 p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 opacity-80 hover:opacity-100"
                                                    >
                                                        {copiedCmd === 'run-tests' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-emerald-400 mt-2">40 passed in ~3.8 seconds</span>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Run Specific Modules</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Target individual subsystems during development:
                                                </p>
                                                <div className="space-y-1 font-mono text-[10px]">
                                                    <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800 text-violet-300">
                                                        <span className="truncate">pytest tests/test_phase4_billing.py -v</span>
                                                        <button onClick={() => copyToClipboard('pytest tests/test_phase4_billing.py -v', 'test-p4')} className="p-0.5 text-slate-400 hover:text-white">
                                                            {copiedCmd === 'test-p4' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-slate-900 p-1.5 rounded border border-slate-800 text-indigo-300">
                                                        <span className="truncate">pytest tests/test_phase3_auth.py -v</span>
                                                        <button onClick={() => copyToClipboard('pytest tests/test_phase3_auth.py -v', 'test-p3')} className="p-0.5 text-slate-400 hover:text-white">
                                                            {copiedCmd === 'test-p3' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Fast unit-level feedback loops</span>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Zero Side Effects</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed">
                                                    All Stripe webhooks, payment signatures, and OCR calls are mocked. Test transactions rollback cleanly without modifying your local PostgreSQL database.
                                                </p>
                                            </div>
                                            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-300 font-medium text-[10px] text-center">
                                                Safe to run anytime in development
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RUNBOOK 6: GOOGLE OAUTH 2.0 CLOUD CONSOLE SETUP */}
                            {(guideCategory === 'all' || guideCategory === 'email') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                            6. How to Configure Google OAuth 2.0 Single Sign-On
                                        </h4>
                                        <span className="px-3 py-1 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            Google Cloud Console
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        Follow these steps to generate production Google OAuth client credentials and enable 1-click Google authentication on the login page.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">Create Cloud Project</h5>
                                                </div>
                                                <ol className="list-decimal list-inside text-slate-400 space-y-1.5 leading-relaxed">
                                                    <li>Open <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-violet-400 underline font-medium">console.cloud.google.com</a>.</li>
                                                    <li>Log in with your Google account.</li>
                                                    <li>Click project dropdown &gt; <strong>New Project</strong>.</li>
                                                    <li>Name: <code className="text-slate-200">ScanText OCR</code> &gt; Create.</li>
                                                </ol>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Free tier Google Cloud project</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">OAuth Consent Screen</h5>
                                                </div>
                                                <ol className="list-decimal list-inside text-slate-400 space-y-1.5 leading-relaxed">
                                                    <li>Click <strong>APIs &amp; Services</strong> &gt; <strong>OAuth consent screen</strong>.</li>
                                                    <li>Select <strong>External</strong> &gt; Create.</li>
                                                    <li>Enter App Name (<code className="text-slate-200">ScanText OCR</code>) &amp; your support email.</li>
                                                    <li>Click <strong>Save and Continue</strong>.</li>
                                                </ol>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Configures branded login popup</span>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Generate Web Client ID</h5>
                                                </div>
                                                <ol className="list-decimal list-inside text-slate-400 space-y-1 leading-relaxed">
                                                    <li>Click <strong>Credentials</strong> &gt; <strong>+ Create Credentials</strong> &gt; <strong>OAuth client ID</strong>.</li>
                                                    <li>Application type: <strong>Web application</strong>.</li>
                                                    <li>Add Authorized Redirect URI:</li>
                                                </ol>
                                                <div className="relative group mt-1.5">
                                                    <code className="block p-1.5 bg-slate-900 rounded border border-slate-800 text-emerald-400 font-mono text-[10px] break-all">
                                                        http://localhost/api/v1/auth/google/callback
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard('http://localhost/api/v1/auth/google/callback', 'g-uri')}
                                                        className="absolute top-1 right-1 p-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                                    >
                                                        {copiedCmd === 'g-uri' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-amber-400">Must match exactly or Google rejects</span>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Save in System Settings</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Copy Client ID &amp; Secret into <strong>System Settings</strong> above, then click <strong>Save Configuration Changes</strong>.
                                                </p>
                                                <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-300 font-medium text-[11px] text-center">
                                                    🎉 Google 1-Click Sign-In Active Instantly
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500">No Docker or container restart needed</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RUNBOOK 7: INTERACTIVE SWAGGER OPENAPI DEBUGGING */}
                            {(guideCategory === 'all' || guideCategory === 'infra' || guideCategory === 'stripe') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <FileText className="w-5 h-5 text-indigo-400" />
                                            7. How to Test &amp; Debug Endpoints in Interactive Swagger
                                        </h4>
                                        <span className="px-3 py-1 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            OpenAPI 3.1 &bull; REST API
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        FastAPI automatically generates interactive Swagger documentation for all backend endpoints. Test API payloads, headers, and responses in a real-time UI.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">Open API Documentation</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Click the <strong>API Documentation</strong> tab above to view the embedded Swagger UI, or navigate to:
                                                </p>
                                                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-indigo-300 text-[11px]">
                                                    http://localhost/api/v1/docs
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Interactive live OpenAPI sandbox</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">Session Authentication</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed">
                                                    Since you are logged into the Admin Console, your HttpOnly <code className="text-violet-300">access_token</code> session cookie is automatically passed with Swagger requests.
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-emerald-400">Authenticated as Admin automatically</span>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Test Billing Checkout</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-1">
                                                    Expand <code className="text-violet-300">POST /api/v1/billing/create-checkout-session</code>.
                                                </p>
                                                <p className="text-slate-400 leading-relaxed">
                                                    Click <strong>Try it out</strong> &gt; <strong>Execute</strong>. Verify that a <code className="text-emerald-400">200 OK</code> response is returned with the Stripe Hosted Checkout URL.
                                                </p>
                                            </div>
                                            <span className="text-[10px] text-slate-500">Also test /create-portal-session</span>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Test OCR Multipart</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed">
                                                    Expand <code className="text-indigo-300">POST /api/v1/ocr/process-file</code> to upload test PNG/JPEG/PDF files directly through Swagger, verifying synchronous and asynchronous pipelines.
                                                </p>
                                            </div>
                                            <div className="p-2 bg-indigo-950/60 border border-indigo-800/60 rounded-lg text-indigo-300 font-medium text-[10px] text-center">
                                                Complete REST API Specifications
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RUNBOOK 8: GOOGLE ADSENSE MONETIZATION & LIVE SETUP */}
                            {(guideCategory === 'all' || guideCategory === 'adsense') && (
                                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
                                        <h4 className="text-lg font-bold text-white flex items-center gap-2.5">
                                            <DollarSign className="w-5 h-5 text-emerald-400" />
                                            8. How to Configure &amp; Monetize with Google AdSense (Live via Admin Console)
                                        </h4>
                                        <span className="px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 rounded-full text-xs font-semibold self-start sm:self-auto">
                                            Ad-Safe Monetization &bull; Option 1 Recommended
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        ScanText OCR features a production-ready Google AdSense monetization integration built for strict Google Publisher Policy compliance: 100% suppression for paid Pro users, strict isolation from CTA action buttons to prevent accidental clicks, and dynamic database-driven activation via the Admin Console.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                                        {/* Step 1 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                                                    <h5 className="font-bold text-white text-sm">AdSense Approval &amp; SEO Content</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Ensure your domain serves original static guides, privacy policy, and root <code className="text-slate-200">ads.txt</code> before submitting:
                                                </p>
                                                <ul className="text-slate-400 text-[10.5px] space-y-1">
                                                    <li>&bull; <a href="/how-to-extract-text-from-image" target="_blank" className="text-emerald-400 underline">/how-to-extract-text-from-image</a></li>
                                                    <li>&bull; <a href="/privacy" target="_blank" className="text-emerald-400 underline">/privacy</a> &amp; <a href="/terms" target="_blank" className="text-emerald-400 underline">/terms</a> &bull; <a href="/contact" target="_blank" className="text-emerald-400 underline">/contact</a></li>
                                                    <li>&bull; Verified root <code className="text-slate-200">/ads.txt</code></li>
                                                </ul>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Satisfies AdSense Site Approval requirements</span>
                                        </div>

                                        {/* Step 2 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                                                    <h5 className="font-bold text-white text-sm">Create Display Ad Units</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    In your <a href="https://www.google.com/adsense" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-medium">Google AdSense Dashboard</a>:
                                                </p>
                                                <ol className="list-decimal list-inside text-slate-400 space-y-1 leading-relaxed text-[10.5px]">
                                                    <li>Navigate to <strong>Ads &gt; By ad unit &gt; Display ads</strong>.</li>
                                                    <li>Create Unit 1: <code className="text-slate-200">Below Upload Dropzone</code> (Responsive).</li>
                                                    <li>Create Unit 2: <code className="text-slate-200">Below Results Preview</code> (Responsive).</li>
                                                    <li>Copy numeric slot IDs (e.g. <code className="text-emerald-400">1234567890</code>).</li>
                                                </ol>
                                            </div>
                                            <span className="text-[10px] text-slate-500 mt-2">Responsive banner display units</span>
                                        </div>

                                        {/* Step 3 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                                                    <h5 className="font-bold text-white text-sm">Save in System Settings</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-1">
                                                    Open <strong>System Settings &gt; Section 7</strong>:
                                                </p>
                                                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 space-y-1 font-mono text-[9.5px] text-slate-300">
                                                    <div>Enable Live AdSense: <span className="text-emerald-400">[Checked]</span></div>
                                                    <div>Publisher ID: <span className="text-emerald-400">ca-pub-1234567890123456</span></div>
                                                    <div>Below-Upload Slot: <span className="text-emerald-400">1234567890</span></div>
                                                    <div>Below-Results Slot: <span className="text-emerald-400">9876543210</span></div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Click <strong>Save All Settings</strong>. Saved to PostgreSQL instantly.
                                                </p>
                                            </div>
                                            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-300 font-medium text-[10px] text-center">
                                                Zero Container Restarts Needed
                                            </div>
                                        </div>

                                        {/* Step 4 */}
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">4</span>
                                                    <h5 className="font-bold text-white text-sm">Verify Suppression &amp; Policy</h5>
                                                </div>
                                                <p className="text-slate-400 leading-relaxed mb-2">
                                                    Validate policy requirements across tiers:
                                                </p>
                                                <ul className="text-slate-300 space-y-1 text-[10.5px]">
                                                    <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
                                                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                                        Pro Tier: 100% ad &amp; script suppression
                                                    </li>
                                                    <li className="flex items-center gap-1.5 text-slate-400">
                                                        &bull; Free / Anon: Displays compliant banner
                                                    </li>
                                                    <li className="flex items-center gap-1.5 text-slate-400">
                                                        &bull; CSP headers permit pagead2 / googleads
                                                    </li>
                                                    <li className="flex items-center gap-1.5 text-slate-400">
                                                        &bull; Cookie Consent banner controls consent
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="p-2 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-300 font-medium text-[10px] text-center">
                                                100% Accidental-Click-Proof Architecture
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* TAB: SUPPORT INQUIRIES & RESPONSE */}
                {activeTab === 'support' && (
                    <div className="space-y-6">
                        {/* Summary KPI Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            <button
                                onClick={() => { setContactStatusFilter('all'); fetchTabContent(); }}
                                className={`p-4 rounded-2xl border text-left transition-all ${contactStatusFilter === 'all'
                                    ? 'bg-violet-950/70 border-violet-700 shadow-lg shadow-violet-950'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">All Inquiries</span>
                                <span className="text-2xl font-bold text-white mt-1 block">{contactCounts?.total ?? contactMessages.length}</span>
                            </button>

                            <button
                                onClick={() => { setContactStatusFilter('new'); fetchTabContent(); }}
                                className={`p-4 rounded-2xl border text-left transition-all ${contactStatusFilter === 'new'
                                    ? 'bg-amber-950/70 border-amber-600 shadow-lg shadow-amber-950'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <span className="text-xs font-semibold text-amber-400 block uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                    New Inquiries
                                </span>
                                <span className="text-2xl font-bold text-amber-300 mt-1 block">{contactCounts?.new ?? 0}</span>
                            </button>

                            <button
                                onClick={() => { setContactStatusFilter('in_progress'); fetchTabContent(); }}
                                className={`p-4 rounded-2xl border text-left transition-all ${contactStatusFilter === 'in_progress'
                                    ? 'bg-blue-950/70 border-blue-700 shadow-lg shadow-blue-950'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <span className="text-xs font-semibold text-blue-400 block uppercase tracking-wider">In Progress</span>
                                <span className="text-2xl font-bold text-blue-300 mt-1 block">{contactCounts?.inProgress ?? 0}</span>
                            </button>

                            <button
                                onClick={() => { setContactStatusFilter('replied'); fetchTabContent(); }}
                                className={`p-4 rounded-2xl border text-left transition-all ${contactStatusFilter === 'replied'
                                    ? 'bg-emerald-950/70 border-emerald-700 shadow-lg shadow-emerald-950'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <span className="text-xs font-semibold text-emerald-400 block uppercase tracking-wider">Replied</span>
                                <span className="text-2xl font-bold text-emerald-300 mt-1 block">{contactCounts?.replied ?? 0}</span>
                            </button>

                            <button
                                onClick={() => { setContactStatusFilter('closed'); fetchTabContent(); }}
                                className={`p-4 rounded-2xl border text-left transition-all ${contactStatusFilter === 'closed'
                                    ? 'bg-slate-800 border-slate-600 shadow-lg'
                                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                }`}
                            >
                                <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Closed</span>
                                <span className="text-2xl font-bold text-slate-300 mt-1 block">{contactCounts?.closed ?? 0}</span>
                            </button>
                        </div>

                        {/* Search and Filters Bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                <input
                                    type="text"
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') fetchTabContent(); }}
                                    placeholder="Search by sender name, email, or subject..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-600 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchTabContent()}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
                                    Filter / Refresh
                                </button>
                            </div>
                        </div>

                        {/* Messages List Table */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-base font-bold text-white">Support Inquiries</h3>
                                    <p className="text-xs text-slate-400">Incoming inquiries from the public Contact Us form (/contact)</p>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">
                                    Showing {contactMessages.length} inquiries
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                    <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Sender &amp; Contact</th>
                                            <th className="px-6 py-4">Subject</th>
                                            <th className="px-6 py-4">Submitted</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/80">
                                        {contactMessages.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                                                    No inquiries found matching current filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            contactMessages.map(msg => (
                                                <tr key={msg.id} className="hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                            msg.status === 'new'
                                                                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/60'
                                                                : msg.status === 'in_progress'
                                                                    ? 'bg-blue-950/80 text-blue-300 border border-blue-600/60'
                                                                    : msg.status === 'replied'
                                                                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                                                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                        }`}>
                                                            {msg.status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>}
                                                            {msg.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-white">{msg.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono">{msg.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-200">
                                                        <div className="truncate max-w-[280px]" title={msg.subject}>{msg.subject}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[320px]">{msg.message}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                                                        {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => openReplyModal(msg)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/80 hover:bg-violet-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                                        >
                                                            <Send className="w-3.5 h-3.5" />
                                                            <span>View &amp; Reply</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Interactive Message Inspection & Email Reply Modal */}
                        {selectedContact && (
                            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
                                    {/* Modal Header */}
                                    <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase ${
                                                    selectedContact.status === 'new'
                                                        ? 'bg-amber-950 text-amber-300 border border-amber-600'
                                                        : selectedContact.status === 'replied'
                                                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                                                            : 'bg-slate-800 text-slate-300'
                                                }`}>
                                                    {selectedContact.status}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono">ID: {selectedContact.id.slice(0, 8)}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white">{selectedContact.subject}</h3>
                                        </div>

                                        <button
                                            onClick={() => setSelectedContact(null)}
                                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            <XCircle className="w-6 h-6" />
                                        </button>
                                    </div>

                                    {replyStatusMsg && (
                                        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${
                                            replyStatusMsg.type === 'success'
                                                ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                                                : 'bg-red-950/80 border border-red-700 text-red-200'
                                        }`}>
                                            {replyStatusMsg.type === 'success' ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                            )}
                                            <span>{replyStatusMsg.text}</span>
                                        </div>
                                    )}

                                    {/* Sender Details Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs">
                                        <div>
                                            <span className="text-slate-500 block">Sender Name</span>
                                            <span className="font-semibold text-slate-200">{selectedContact.name}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Email Address</span>
                                            <span className="font-mono text-slate-200">{selectedContact.email}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">IP Address</span>
                                            <span className="font-mono text-slate-400">{selectedContact.ipAddress || 'Unknown'}</span>
                                        </div>
                                    </div>

                                    {/* Original Customer Message */}
                                    <div className="space-y-1.5">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Customer Message</span>
                                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedContact.message}
                                        </div>
                                    </div>

                                    {/* Previous Staff Reply History if already replied */}
                                    {selectedContact.replyMessage && (
                                        <div className="space-y-1.5">
                                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Staff Reply Sent ({selectedContact.repliedBy}) &bull; {selectedContact.repliedAt ? new Date(selectedContact.repliedAt).toUTCString() : ''}
                                            </span>
                                            <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-2xl text-emerald-200 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                                                <div className="text-emerald-400 font-bold mb-1 font-sans">Subject: {selectedContact.replySubject}</div>
                                                {selectedContact.replyMessage}
                                            </div>
                                        </div>
                                    )}

                                    {/* Email Reply Composer Form */}
                                    <div className="space-y-4 pt-2 border-t border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-violet-400" />
                                                <span>Send Email Response via SMTP</span>
                                            </h4>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateContactStatus(selectedContact.id, 'closed')}
                                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    Mark Closed
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateContactStatus(selectedContact.id, 'in_progress')}
                                                    className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-800 text-blue-300 text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    Mark In Progress
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 mb-1">Response Subject</label>
                                                <input
                                                    type="text"
                                                    value={replySubject}
                                                    onChange={(e) => setReplySubject(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-600"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 mb-1">Reply Message</label>
                                                <textarea
                                                    rows={4}
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder={`Type your reply to ${selectedContact.name}... It will be formatted into an official HTML email and dispatched to ${selectedContact.email} immediately.`}
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-violet-600 resize-y"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-[11px] text-slate-500">
                                                Dispatched via configured SMTP server ({settingsData?.SMTP_HOST || 'local mailer'}).
                                            </span>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedContact(null)}
                                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                                                >
                                                    Close
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSendReply}
                                                    disabled={sendingReply || !replyText.trim()}
                                                    className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950 transition-all"
                                                >
                                                    {sendingReply ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            <span>Sending via SMTP...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-3.5 h-3.5" />
                                                            <span>Send Email Reply</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 5: SECURITY AUDIT LOGS */}
                {activeTab === 'logs' && (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 bg-slate-950 border-b border-slate-800">
                            <h3 className="text-base font-bold text-white">Administrative Security Audit Trail</h3>
                            <p className="text-xs text-slate-400">Immutable record of admin events, bans, and setting changes</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Timestamp (UTC)</th>
                                        <th className="px-6 py-4">Admin Email</th>
                                        <th className="px-6 py-4">Action Event</th>
                                        <th className="px-6 py-4">Details</th>
                                        <th className="px-6 py-4">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-sans">
                                                No audit log entries recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-800/30">
                                                <td className="px-6 py-4 text-slate-400">
                                                    {new Date(log.createdAt).toUTCString()}
                                                </td>
                                                <td className="px-6 py-4 text-white font-sans font-medium">
                                                    {log.userEmail}
                                                </td>
                                                <td className="px-6 py-4 text-violet-400 font-semibold">
                                                    {log.action}
                                                </td>
                                                <td className="px-6 py-4 text-slate-300 font-sans">
                                                    {log.details}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    {log.ipAddress}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
