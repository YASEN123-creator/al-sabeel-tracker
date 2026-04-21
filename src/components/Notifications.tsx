'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, Trash2, Clock, Target, Flame,
  BookOpen, Video, Timer, CheckCircle2, Info, X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import type { AppNotification } from '@/lib/types';

/* ───────── helpers ───────── */

function getRelativeTime(dateStr: string, t: (key: string) => string, lang: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('notif.now');

  if (diffMin < 60) {
    return lang === 'ar'
      ? `منذ ${diffMin} ${t('notif.minutesAgo')}`
      : `${diffMin} ${t('notif.minutesAgo')}`;
  }

  if (diffHour < 24) {
    return lang === 'ar'
      ? `منذ ${diffHour} ${t('notif.hoursAgo')}`
      : `${diffHour} ${t('notif.hoursAgo')}`;
  }

  if (diffDay === 1) return t('notif.yesterday');

  return new Date(dateStr).toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-US',
    { month: 'short', day: 'numeric' },
  );
}

const iconMap: Record<AppNotification['type'], typeof Bell> = {
  timer: Timer,
  task: CheckCircle2,
  goal: Target,
  streak: Flame,
  resource: BookOpen,
  video: Video,
  info: Info,
};

const colorMap: Record<
  AppNotification['type'],
  { bg: string; text: string; border: string }
> = {
  timer: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500',
  },
  task: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500',
  },
  goal: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500',
  },
  streak: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500',
  },
  resource: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500',
  },
  video: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500',
  },
  info: {
    bg: 'bg-gray-100 dark:bg-gray-700/50',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-400',
  },
};

/* ───────── component ───────── */

export default function Notifications() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    addToast,
    language,
  } = useAppStore();
  const t = useT();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const isRTL = language === 'ar';

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  /* ── handlers ── */

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const handleClearAll = () => {
    if (!confirm(t('notif.deleteConfirm'))) return;
    clearNotifications();
    addToast(t('notif.deleteSuccess'), 'success');
  };

  const handleDeleteNotification = (id: string) => {
    const current = useAppStore.getState().notifications;
    const updated = current.filter((n) => n.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sabeel_notifications', JSON.stringify(updated));
    }
    useAppStore.setState({ notifications: updated });
    addToast(t('notif.deleteSuccess'), 'success');
  };

  const handleClickNotification = (notification: AppNotification) => {
    if (!notification.read) {
      markNotificationRead(notification.id);
    }
  };

  /* ── render ── */

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('notif.title')}
          </h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('notif.subtitle')}
        </p>
      </div>

      {/* ── Main Card ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-slate-700">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['all', 'unread'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === tab
                    ? 'bg-slate-800 dark:bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {tab === 'all' ? t('notif.title') : t('notif.unread')}
                {tab === 'unread' && unreadCount > 0 && (
                  <span
                    className={`ms-1.5 ${
                      filter === 'unread' ? 'text-white/70' : 'text-gray-400'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">{t('notif.markAllRead')}</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">{t('notif.clearAll')}</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Notification List ── */}
        <div className="max-h-[600px] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            /* ── Empty State ── */
            <div className="py-12 text-center">
              <Bell
                size={48}
                className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">
                {t('notif.empty')}
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {t('notif.emptyHint')}
              </p>
            </div>
          ) : (
            /* ── Notification Items ── */
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification) => {
                const Icon = iconMap[notification.type] || Bell;
                const colors = colorMap[notification.type] || colorMap.info;
                const relativeTime = getRelativeTime(
                  notification.createdAt,
                  t,
                  language,
                );

                return (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      x: isRTL ? 80 : -80,
                      transition: { duration: 0.2 },
                    }}
                    onClick={() => handleClickNotification(notification)}
                    className={[
                      'relative flex items-start gap-3 p-4 transition-colors group cursor-pointer',
                      'border-b border-gray-50 dark:border-slate-700/50',
                      'hover:bg-gray-50 dark:hover:bg-slate-700/30',
                      // unread styling
                      !notification.read &&
                        'bg-blue-50/50 dark:bg-blue-950/20',
                      // accent border on start side for unread
                      !notification.read &&
                        (isRTL
                          ? 'border-r-4 border-r-blue-500'
                          : 'border-l-4 border-l-blue-500'),
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {/* Unread indicator dot */}
                    {!notification.read && (
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 ${
                          isRTL ? 'left-2' : 'right-2'
                        } w-2 h-2 bg-blue-500 rounded-full opacity-60`}
                      />
                    )}

                    {/* Type icon */}
                    <div
                      className={`flex-shrink-0 w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center mt-0.5`}
                    >
                      <Icon size={18} className={colors.text} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pe-6">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            !notification.read
                              ? 'font-semibold text-slate-800 dark:text-slate-100'
                              : 'font-medium text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock size={11} />
                          {relativeTime}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    {/* Delete button — visible on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="flex-shrink-0 absolute top-3 end-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      title={t('notif.deleteConfirm')}
                    >
                      <Trash2
                        size={14}
                        className="text-red-400 dark:text-red-500"
                      />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
}
