import React from 'react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { ContactForm } from '../../components/ContactForm';
import { Mail, MessageSquare, Globe } from 'lucide-react';

export const metadata = {
    title: 'Contact Support | ScanText OCR SaaS',
    description: 'Get in touch with the ScanText OCR technical team.',
};

export default function ContactPage() {
    return (
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
                <div className="space-y-3 border-b border-slate-200 pb-6">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Developer & User Support</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Contact Us
                    </h1>
                    <p className="text-slate-600 text-sm">
                        Have questions about self-hosting, API integration, or feature requests? We're here to help.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-6">
                        <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
                            <div className="flex items-center space-x-3 text-slate-900 font-bold">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                                <h2>Direct Support</h2>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                For open-source contributions, bug reports, or docker-compose setup queries:
                            </p>
                            <div className="space-y-2 text-xs font-medium text-slate-700">
                                <div className="flex items-center space-x-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span>support@scantext-ocr.local</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    <span>GitHub Issues / Discussions</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200">
                        <ContactForm />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
