import {
    OCRResponse,
    AsyncJobStatusResponse,
    AsyncJobResultResponse,
    AuthResponse,
    UserProfileResponse
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export const DEFAULT_PSM_OPTIONS = [
    { value: 3, label: '3 - Fully Automatic Page Segmentation (Default)' },
    { value: 1, label: '1 - Automatic Page Segmentation with OSD' },
    { value: 4, label: '4 - Assume Single Column of Text' },
    { value: 6, label: '6 - Assume Single Uniform Block of Text' },
    { value: 11, label: '11 - Sparse Text (Find as much text as possible)' },
    { value: 12, label: '12 - Sparse Text with OSD' }
];

export const PREPROCESS_OPTIONS = [
    { value: 'auto', label: 'Auto (Deskew, Denoise & Adaptive Threshold)' },
    { value: 'grayscale', label: 'Grayscale & Contrast Boost' },
    { value: 'threshold', label: 'Otsu Binarization' },
    { value: 'none', label: 'None (Raw Image)' }
];

export async function fetchSupportedLanguages(): Promise<{ code: string; name: string }[]> {
    try {
        const response = await fetch(`${API_BASE}/api/v1/languages`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.languages || [];
    } catch {
        return [];
    }
}

export async function submitOCRRequest(
    file: File,
    language: string = 'eng',
    psm: number = 3,
    preprocessMode: string = 'auto',
    onProgress?: (progress: number) => void,
    captchaToken?: string
): Promise<OCRResponse> {
    if (onProgress) onProgress(30);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('psm', psm.toString());
    formData.append('preprocess_mode', preprocessMode);
    if (captchaToken) {
        formData.append('captcha_token', captchaToken);
    }

    const response = await fetch(`${API_BASE}/api/v1/ocr`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (onProgress) onProgress(100);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error (${response.status})`);
    }

    return response.json();
}

export async function submitAsyncJob(
    file: File,
    language: string = 'eng',
    psm: number = 3,
    preprocessMode: string = 'auto',
    onProgress?: (progress: number) => void,
    captchaToken?: string
): Promise<{ jobId: string; filename: string; status: string; message: string }> {
    if (onProgress) onProgress(40);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('psm', psm.toString());
    formData.append('preprocess_mode', preprocessMode);

    const response = await fetch(`${API_BASE}/api/v1/jobs`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    if (onProgress) onProgress(100);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to submit OCR job (${response.status})`);
    }

    return response.json();
}

export async function fetchJobStatus(jobId: string): Promise<AsyncJobStatusResponse> {
    const response = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch job status (${response.status})`);
    }
    return response.json();
}

export async function fetchJobResult(jobId: string): Promise<AsyncJobResultResponse> {
    const response = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/result`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch job results (${response.status})`);
    }
    return response.json();
}

export async function cancelJob(jobId: string): Promise<{ jobId: string; status: string; message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to cancel job (${response.status})`);
    }
    return response.json();
}

export async function fetchRecentJobs(): Promise<AsyncJobStatusResponse[]> {
    const response = await fetch(`${API_BASE}/api/v1/jobs`, {
        method: 'GET',
        credentials: 'include',
    });

    if (!response.ok) {
        return [];
    }
    return response.json();
}

// Phase 3 Auth & User Services
export async function registerUser(email: string, password: string, captchaToken?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, captchaToken }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Registration failed (${response.status})`);
    }
    return response.json();
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Login failed (${response.status})`);
    }
    return response.json();
}

export async function logoutUser(): Promise<{ message: string }> {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
    const response = await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });
    return response.json().catch(() => ({ message: 'Logged out' }));
}

export async function verifyEmailToken(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Verification failed');
    }
    return response.json();
}

export async function resendVerificationEmail(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to resend verification email.');
    }
    return response.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Request failed');
    }
    return response.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Reset failed');
    }
    return response.json();
}

export async function getCurrentUserProfile(): Promise<UserProfileResponse> {
    const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch user profile');
    }
    return response.json();
}

export async function cancelProSubscription(): Promise<{ message: string; user: UserProfileResponse['user'] }> {
    const response = await fetch(`${API_BASE}/api/v1/auth/cancel-pro`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to cancel Pro subscription');
    }
    return response.json();
}

export async function exportUserData(): Promise<Blob> {
    const response = await fetch(`${API_BASE}/api/v1/auth/export-data`, {
        method: 'GET',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to export user data');
    }
    return response.blob();
}

export async function deleteAccount(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete account');
    }
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
    return response.json();
}

// Phase 4 Admin Portal API Services
export async function getAdminStats(): Promise<import('../types').AdminStats> {
    const response = await fetch(`${API_BASE}/api/v1/admin/stats`, {
        credentials: 'include'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch admin stats');
    }
    const data = await response.json();
    return data.stats || data;
}

export async function getAdminUsers(): Promise<import('../types').AdminUser[]> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users`, {
        credentials: 'include'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch admin users list');
    }
    const data = await response.json();
    return data.users || [];
}

export async function banUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isBanned: true })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to ban user');
    }
    return response.json();
}

export async function unbanUser(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isBanned: false })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to unban user');
    }
    return response.json();
}

export async function updateUserTier(userId: string, tier: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planTier: tier })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update user tier');
    }
    return response.json();
}

export async function verifyUserManually(userId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isVerified: true })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to manually verify user');
    }
    return response.json();
}

export async function adminResendVerification(userId: string): Promise<{ message: string; verificationUrl: string }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to resend verification email');
    }
    return response.json();
}

export async function getSystemSettings(): Promise<import('../types').SystemSettings> {
    const response = await fetch(`${API_BASE}/api/v1/admin/settings`, {
        credentials: 'include'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch system settings');
    }
    const data = await response.json();
    return data.settings || data;
}

export async function updateSystemSettings(settings: import('../types').SystemSettings): Promise<{ message: string }> {
    for (const [key, value] of Object.entries(settings)) {
        await fetch(`${API_BASE}/api/v1/admin/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ key, value: String(value) }),
        });
    }

    return { message: 'Settings updated successfully!' };
}

export async function getAuditLogs(): Promise<import('../types').AuditLogItem[]> {
    const response = await fetch(`${API_BASE}/api/v1/admin/audit-logs`, {
        credentials: 'include'
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch audit logs');
    }
    const data = await response.json();
    return data.logs || [];
}

export async function testStripeConnection(): Promise<import('../types').StripeDiagnosticResponse> {
    const response = await fetch(`${API_BASE}/api/v1/admin/billing/test-connection`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to test Stripe connection');
    }
    return response.json();
}

export async function testSmtpConnection(): Promise<{ success: boolean; recipient: string; host: string; message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/smtp/test-connection`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to test SMTP connection');
    }
    return response.json();
}

export async function testSentryConnection(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/sentry/test-connection`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to test Sentry integration');
    }
    return response.json();
}

// Phase 4 Stripe Billing Services
export async function createCheckoutSession(): Promise<{ checkoutUrl: string; sessionId?: string; alreadySubscribed?: boolean; message?: string }> {
    const response = await fetch(`${API_BASE}/api/v1/billing/create-checkout-session`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create checkout session (${response.status})`);
    }
    return response.json();
}

export async function createPortalSession(): Promise<{ portalUrl: string }> {
    const response = await fetch(`${API_BASE}/api/v1/billing/create-portal-session`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to access customer portal (${response.status})`);
    }
    return response.json();
}

// Phase 6 Admin Operations
export async function resetUserQuota(userId: string): Promise<{ message: string; userId: string; conversionsReset: number }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/reset-quota`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to reset user quota');
    }
    return response.json();
}

export async function getAdminJobs(status?: string, limit: number = 50, offset: number = 0): Promise<import('../types').AdminJobsResponse> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status_filter', status);
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const response = await fetch(`${API_BASE}/api/v1/admin/jobs?${params.toString()}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch OCR jobs');
    }
    return response.json();
}

export async function getQueueStats(): Promise<import('../types').QueueStatsResponse> {
    const response = await fetch(`${API_BASE}/api/v1/admin/queue-stats`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch queue stats');
    }
    return response.json();
}

export async function triggerExpiredCleanup(): Promise<{ message: string; purgedCount: number }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/cleanup/trigger`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to trigger expired cleanup');
    }
    return response.json();
}

export async function getPublicAdConfig(): Promise<import('../types').PublicAdConfig> {
    try {
        const response = await fetch(`${API_BASE}/api/v1/config/ads`);
        if (!response.ok) {
            return { adsenseEnabled: false, clientId: '', slotBelowUpload: '', slotBelowResults: '' };
        }
        return await response.json();
    } catch {
        return { adsenseEnabled: false, clientId: '', slotBelowUpload: '', slotBelowResults: '' };
    }
}

// Contact Us & Support Response API Services
export async function submitContactMessage(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    captchaToken?: string;
}): Promise<{ message: string; messageId: string }> {
    const response = await fetch(`${API_BASE}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit contact message.');
    }
    return response.json();
}

export async function getAdminContactMessages(
    status?: string,
    search?: string,
    limit: number = 50,
    offset: number = 0
): Promise<import('../types').AdminContactMessagesResponse> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status_filter', status);
    if (search && search.trim()) params.append('search', search.trim());
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const response = await fetch(`${API_BASE}/api/v1/admin/contact-messages?${params.toString()}`, {
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch contact inquiries');
    }
    return response.json();
}

export async function replyToContactMessage(
    messageId: string,
    replyMessage: string,
    subject?: string
): Promise<{ message: string; contactMessage: import('../types').ContactMessage }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/contact-messages/${messageId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ replyMessage, subject }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send reply to inquiry');
    }
    return response.json();
}

export async function updateContactMessage(
    messageId: string,
    status?: string,
    adminNotes?: string
): Promise<{ message: string; contactMessage: import('../types').ContactMessage }> {
    const response = await fetch(`${API_BASE}/api/v1/admin/contact-messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, adminNotes }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update contact inquiry');
    }
    return response.json();
}





export async function getPublicCaptchaConfig(): Promise<{
    captchaEnabled: boolean;
    captchaProvider: string;
    captchaSiteKey: string;
}> {
    try {
        const response = await fetch(`${API_BASE}/api/v1/config/captcha`, {
            cache: 'no-store'
        });
        if (!response.ok) {
            return { captchaEnabled: false, captchaProvider: 'turnstile', captchaSiteKey: '' };
        }
        return await response.json();
    } catch {
        return { captchaEnabled: false, captchaProvider: 'turnstile', captchaSiteKey: '' };
    }
}


export interface PlanConfigResponse {
    anonymous: {
        dailyConversions: number;
        maxFileMb: number;
        maxPdfPages: number;
    };
    free: {
        dailyConversions: number;
        maxFileMb: number;
        maxPdfPages: number;
    };
    pro: {
        dailyConversions: number;
        maxFileMb: number;
        maxPdfPages: number;
        displayPrice: string;
        currency: string;
    };
}

export async function getPublicPlanConfig(): Promise<PlanConfigResponse> {
    try {
        const response = await fetch(`${API_BASE}/api/v1/config/plans`, {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error();
        return await response.json();
    } catch {
        return {
            anonymous: { dailyConversions: 3, maxFileMb: 10, maxPdfPages: 5 },
            free: { dailyConversions: 3, maxFileMb: 10, maxPdfPages: 5 },
            pro: { dailyConversions: 100, maxFileMb: 50, maxPdfPages: 100, displayPrice: '5.00', currency: 'USD' }
        };
    }
}
