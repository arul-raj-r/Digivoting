import React, { useState } from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import axios from 'axios';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  Building2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required.';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!formData.subject.trim()) errors.subject = 'Subject is required.';
    if (!formData.message.trim()) {
      errors.message = 'Message content cannot be empty.';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Please provide at least 10 characters.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setFieldErrors({});

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/contact/`, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        subject: formData.subject.trim(),
        message: formData.message.trim()
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });

      if (response.data && response.data.success) {
        setSuccessMessage(response.data.message || 'Thank you! Your message has been received.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setErrorMessage('Unable to process inquiry. Please try again later.');
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      } else {
        setErrorMessage(
          err.response?.data?.message || 
          err.message || 
          'Unable to reach DigiVote servers. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="py-16 lg:py-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-[#070b14]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <Mail className="w-4 h-4" />
            <span>Support & Inquiries</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Contact DigiVote Support
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Have questions regarding election onboarding, verification setup, or technical assistance? Send our project team an inquiry.
          </p>
        </div>
      </section>

      {/* Main Form & Contact Info */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left Info Column */}
            <div className="md:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 depth-card space-y-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Election Governance Team
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  DigiVote is an institutional digital voting platform. For organization onboarding or assistance with verification parameters, submit your inquiry through this form.
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>support@digivote.org</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Institutional Governance Portal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Contact Form Column */}
            <div className="md:col-span-7">
              <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 depth-card">
                
                {/* Form Header */}
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Send a Message
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Please provide your details below and our team will get back to you.
                </p>

                {/* Success Alert */}
                {successMessage && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Global Error Alert */}
                {errorMessage && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={loading}
                      placeholder="e.g. Jane Doe"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#111a33] border ${
                        fieldErrors.name ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                      } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {fieldErrors.name && (
                      <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={loading}
                      placeholder="e.g. jane.doe@institution.edu"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#111a33] border ${
                        fieldErrors.email ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                      } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {fieldErrors.email && (
                      <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      disabled={loading}
                      placeholder="e.g. Election Setup Inquiry"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#111a33] border ${
                        fieldErrors.subject ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                      } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {fieldErrors.subject && (
                      <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.subject}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      disabled={loading}
                      placeholder="Please describe your inquiry or feedback..."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#111a33] border ${
                        fieldErrors.message ? 'border-rose-500' : 'border-slate-200 dark:border-slate-800'
                      } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all`}
                    />
                    {fieldErrors.message && (
                      <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Message</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                </form>

              </div>
            </div>

          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
