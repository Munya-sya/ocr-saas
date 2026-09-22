'use client';

import React from 'react';
import { Send } from 'lucide-react';

export const ContactForm: React.FC = () => {
    return (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            <div>
                <label htmlFor="contact-name" className="block text-sm font-semibold text-slate-800 mb-1">
                    Full Name
                </label>
                <input
                    id="contact-name"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <label htmlFor="contact-email" className="block text-sm font-semibold text-slate-800 mb-1">
                    Email Address
                </label>
                <input
                    id="contact-email"
                    type="email"
                    required
                    placeholder="jane@example.com"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <label htmlFor="contact-message" className="block text-sm font-semibold text-slate-800 mb-1">
                    Message
                </label>
                <textarea
                    id="contact-message"
                    rows={4}
                    required
                    placeholder="How can we help you?"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-colors"
            >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
            </button>
        </form>
    );
};
