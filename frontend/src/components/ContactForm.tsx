'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { submitContactMessage } from '../services/api';

export const ContactForm: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await submitContactMessage({
                name: name.trim(),
                email: email.trim(),
                subject: subject.trim(),
                message: message.trim(),
            });

            setSuccessMessage(res.message || 'Your inquiry has been submitted! Our support team will respond shortly.');
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
        } catch (err: any) {
            setError(err.message || 'Failed to submit contact message. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (successMessage) {
        return (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 animate-in fade-in duration-300">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-emerald-900">Message Received!</h3>
                    <p className="text-sm text-emerald-800 leading-relaxed max-w-md mx-auto">
                        {successMessage}
                    </p>
                    <p className="text-xs text-emerald-600 pt-2">
                        We sent a receipt confirmation to your email. An administrator will reply directly to you.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setSuccessMessage(null)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-100/50 border border-emerald-300 font-medium text-xs rounded-xl shadow-sm transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Send Another Inquiry</span>
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                        <span className="font-semibold block">Submission Error</span>
                        <span className="text-xs">{error}</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-800 mb-1">
                        Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="contact-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                <div>
                    <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-800 mb-1">
                        Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="contact-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="contact-subject" className="block text-sm font-semibold text-slate-800 mb-1">
                    Subject <span className="text-red-500">*</span>
                </label>
                <input
                    id="contact-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question about ScanText API / Enterprise Support"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>

            <div>
                <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-800 mb-1">
                    Message <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="contact-message"
                    rows={4}
                    required
                    minLength={10}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe how we can help you with your OCR workflow, document processing questions, or integration requirements..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                    Please provide sufficient detail so our team can investigate your question effectively.
                </span>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Message...</span>
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                    </>
                )}
            </button>
        </form>
    );
};
