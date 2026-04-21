'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Zap, ArrowLeft } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/lib/store';

interface AuthFormProps {
  mode: 'login' | 'signup';
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitch: () => void;
  onGuestLogin: () => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  error: string;
  loading: boolean;
  guestLoading: boolean;
  loginCooldown?: number;
  isRateLimited?: boolean;
}

export default function AuthForm({ mode, onSubmit, onSwitch, onGuestLogin, onResetPassword, error, loading, guestLoading, loginCooldown = 0, isRateLimited = false }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const t = useT();
  const language = useAppStore(s => s.language || 'ar');
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      await onResetPassword(resetEmail);
      setResetSuccess(true);
    } catch { setResetLoading(false); }
    setResetLoading(false);
  };

  if (resetMode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4" dir={language === 'en' ? 'ltr' : 'rtl'}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-800 dark:bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-white">س</span></div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('auth.forgotPassword')}</h1>
          </div>
          {resetSuccess ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm text-center">
              <p className="text-sm text-emerald-600 mb-4">{t('auth.resetSent')}</p>
              <button onClick={() => setResetMode(false)} className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 font-medium">{t('auth.backToLogin')}</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('auth.enterEmail')}</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" placeholder="your@email.com" required dir="ltr" autoFocus />
                </div>
                <button type="submit" disabled={resetLoading} className="w-full py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 disabled:opacity-50">{resetLoading ? t('auth.loading') : t('auth.resetPassword')}</button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => setResetMode(false)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center gap-1"><ArrowLeft size={14} />{t('auth.backToLogin')}</button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4" dir={language === 'en' ? 'ltr' : 'rtl'}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-800 dark:bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-white">س</span></div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('app.title')}</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('app.subtitle')}</p>
        </div>

        {/* Guest Login Button - highlighted when rate limited */}
        <button
          onClick={onGuestLogin}
          disabled={guestLoading}
          className={`w-full py-4 text-white rounded-2xl text-base font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg mb-2 ${
            isRateLimited
              ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900 animate-pulse'
              : 'bg-slate-800 dark:bg-blue-600 hover:bg-slate-700 dark:hover:bg-blue-700'
          }`
        }
        >
          <Zap size={20} />{guestLoading ? t('auth.logging') : (isRateLimited ? (language === 'en' ? 'Recommended: Quick Login' : 'الدخول السريع - أنصح بيه') : t('auth.guest'))}
        </button>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mb-5">
          {isRateLimited
            ? (language === 'en' ? 'Bypass rate limits - no account needed' : 'تجاوز الحد - بدون حساب')
            : t('auth.guestHint')
          }
        </p>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('auth.or')}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" placeholder="your@email.com" required dir="ltr" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none text-slate-800 dark:text-slate-100" placeholder="•••••••••" required minLength={6} dir="ltr" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2.5 rounded-lg">{error}</motion.p>}
            <button type="submit" disabled={loading || loginCooldown > 0} className="w-full py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t('auth.loading') : loginCooldown > 0 ? `${language === 'en' ? 'Wait' : 'انتظر'} ${loginCooldown}s` : mode === 'login' ? t('auth.login') : t('auth.signup')}
            </button>
          </form>
          {mode === 'login' && (
            <div className="mt-3 text-center">
              <button onClick={() => setResetMode(true)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">{t('auth.forgotPassword')}</button>
            </div>
          )}
          {mode === 'signup' && <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg mt-3 text-center">{t('auth.signupHint')}</p>}
          <div className="mt-4 text-center"><button onClick={onSwitch} className="text-sm text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200">{mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}</button></div>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">{t('auth.footer')}</p>
      </motion.div>
    </div>
  );
}
