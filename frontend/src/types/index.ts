export interface LanguageOption {
    code: string;
    name: string;
}

export interface OCRResult {
    jobId: string;
    filename: string;
    language: string;
    text: string;
    processingMs: number;
}

export interface OCRResponse {
    jobId: string;
    filename: string;
    language: string;
    text: string;
    processingMs: number;
}

export type JobStatusType = 'queued' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';

export type ProcessingStage = 'idle' | 'uploading' | 'extracting' | 'polling' | 'complete' | 'failed';

export interface AsyncJobStatusResponse {
    jobId: string;
    userId?: string | null;
    filename: string;
    status: JobStatusType;
    fileType: string;
    language: string;
    psm: number;
    preprocessMode: string;
    pageCount: number;
    processedPages: number;
    errorMessage?: string | null;
    processingMs: number;
    createdAt: string;
    expiresAt?: string | null;
}

export interface AsyncJobResultResponse {
    jobId: string;
    filename: string;
    status: JobStatusType;
    language: string;
    pageCount: number;
    text: string;
    processingMs: number;
}

export interface User {
    id: string;
    email: string;
    isVerified: boolean;
    isAdmin: boolean;
    isBanned: boolean;
    planTier: 'free' | 'pro';
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    currentPeriodEnd?: string | null;
    hasAds?: boolean;
    createdAt: string;
}

export type AdminUser = User;

export interface QuotaStatus {
    planTier: 'free' | 'pro';
    conversionsUsedToday: number;
    maxDailyConversions: number;
    conversionsRemaining: number;
    maxFileMb: number;
    maxPdfPages: number;
    hasAds?: boolean;
    batchProcessing?: boolean;
}

export interface UserProfileResponse {
    user: User;
    quota: QuotaStatus;
}

export interface AuthResponse {
    message: string;
    accessToken?: string;
    tokenType?: string;
    user?: User;
}

export interface AdminStats {
    totalUsers: number;
    verifiedUsers: number;
    bannedUsers: number;
    proUsers: number;
    freeUsers: number;
    totalJobsProcessed: number;
    todayConversions: number;
    failedJobs: number;
    serverTime: string;
}

export interface SystemSettings {
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_USER: string;
    SMTP_PASSWORD?: string;
    EMAILS_FROM_EMAIL: string;
    ANONYMOUS_DAILY_CONVERSIONS: string;
    FREE_DAILY_CONVERSIONS: string;
    FREE_MAX_FILE_MB?: string;
    FREE_MAX_PDF_PAGES?: string;
    PRO_DAILY_CONVERSIONS?: string;
    PRO_MAX_FILE_MB?: string;
    PRO_MAX_PDF_PAGES?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_REDIRECT_URI?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_PUBLISHABLE_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_PRO_MONTHLY_PRICE_ID?: string;
    STRIPE_DISPLAY_PRICE?: string;
    STRIPE_CURRENCY?: string;
    STRIPE_ALLOW_PROMO_CODES?: string;
    STRIPE_GRACE_PERIOD_DAYS?: string;
    STRIPE_PORTAL_ALLOW_CANCEL?: string;
    STRIPE_PORTAL_RETURN_URL?: string;
    CAPTCHA_ENABLED?: string;
    CAPTCHA_PROVIDER?: string;
    CAPTCHA_SITE_KEY?: string;
    CAPTCHA_SECRET_KEY?: string;
    SENTRY_DSN?: string;
    STRUCTURED_LOGGING?: string;
    ADSENSE_ENABLED?: string;
    ADSENSE_CLIENT_ID?: string;
    ADSENSE_SLOT_BELOW_UPLOAD?: string;
    ADSENSE_SLOT_BELOW_RESULTS?: string;
}

export interface PublicAdConfig {
    adsenseEnabled: boolean;
    clientId: string;
    slotBelowUpload: string;
    slotBelowResults: string;
}

export interface StripeDiagnosticResponse {
    connected: boolean;
    mode?: 'test' | 'live' | 'unknown';
    priceValid?: boolean;
    priceDisplay?: string | null;
    currency?: string;
    message?: string;
    error?: string;
}

export interface AuditLogItem {
    id: string;
    userId?: string | null;
    userEmail: string;
    ipAddress: string;
    action: string;
    details: string;
    createdAt: string;
}

export interface AdminOCRJob {
    jobId: string;
    userId?: string | null;
    userEmail?: string;
    filename: string;
    status: JobStatusType;
    fileType: string;
    language: string;
    psm: number;
    preprocessMode: string;
    pageCount: number;
    processedPages: number;
    errorMessage?: string | null;
    processingMs: number;
    createdAt: string;
    expiresAt?: string | null;
}

export interface AdminJobsResponse {
    total: number;
    jobs: AdminOCRJob[];
}

export interface QueueStatsResponse {
    redisConnected: boolean;
    celeryQueueLength: number;
    processingJobs: number;
    queuedJobs: number;
}

export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    ipAddress?: string | null;
    userId?: string | null;
    status: 'new' | 'in_progress' | 'replied' | 'closed';
    adminNotes?: string | null;
    replySubject?: string | null;
    replyMessage?: string | null;
    repliedAt?: string | null;
    repliedBy?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminContactMessagesResponse {
    total: number;
    messages: ContactMessage[];
    counts: {
        new: number;
        inProgress: number;
        replied: number;
        closed: number;
        total: number;
    };
}

