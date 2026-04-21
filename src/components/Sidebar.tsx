'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, FolderOpen, Clock, BarChart3, Target,
  Settings, LogOut, X, Menu, ChevronLeft, ChevronRight, CheckSquare, Globe, Moon, Sun,
  BookOpen, Bell, Video
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import type { ActiveView } from '@/lib/types';

interface SidebarProps {
  onSignOut: () => void;
}

export default function Sidebar({ onSignOut }: SidebarProps) {
  const { activeView, setActiveView, isSidebarOpen, toggleSidebar, setSidebarOpen, language, setLanguage, darkMode, toggleDarkMode } = useAppStore();
  const t = useT();
  const isRTL = language !== 'en';

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: <Home size={20} /> },
    { id: 'projects', label: t('nav.projects'), icon: <FolderOpen size={20} /> },
    { id: 'tasks', label: t('nav.tasks'), icon: <CheckSquare size={20} /> },
    { id: 'sessions', label: t('nav.sessions'), icon: <Clock size={20} /> },
    { id: 'library', label: t('nav.library'), icon: <BookOpen size={20} /> },
    { id: 'notifications', label: t('nav.notifications'), icon: <Bell size={20} /> },
    { id: 'video', label: t('nav.video'), icon: <Video size={20} /> },
    { id: 'analytics', label: t('nav.analytics'), icon: <BarChart3 size={20} /> },
    { id: 'goals', label: t('nav.goals'), icon: <Target size={20} /> },
    { id: 'settings', label: t('nav.settings'), icon: <Settings size={20} /> },
  ];

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const toggleLang = () => setLanguage(language === 'ar' ? 'en' : 'ar');

  const slideX = isSidebarOpen ? 0 : 300;
  const animX = isRTL ? slideX : -slideX;

  const closeIcon = isRTL ? <ChevronLeft size={16} className="text-gray-500 dark:text-gray-400" /> : <ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />;
  const menuIcon = isSidebarOpen ? <X size={22} /> : <Menu size={22} />;

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/20 dark:bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <button onClick={toggleSidebar} className={`fixed top-4 z-[70] md:hidden bg-slate-800 dark:bg-blue-600 text-white rounded-xl p-3 shadow-lg border border-slate-700 dark:border-blue-500 hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors ${isRTL ? 'right-4' : 'left-4'}`} aria-label={isSidebarOpen ? t('nav.closeMenu') : t('nav.openMenu')}>
        {menuIcon}
      </button>

      {!isSidebarOpen && (
        <button onClick={toggleSidebar} className={`hidden md:flex fixed top-4 z-30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl p-2.5 shadow-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors items-center justify-center ${isRTL ? 'right-4' : 'left-4'}`} aria-label={t('nav.openMenu')}>
          <Menu size={20} />
        </button>
      )}

      <motion.aside
        initial={false}
        animate={{ x: animX }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed top-0 h-full w-64 bg-gray-50 dark:bg-slate-900 z-50 flex flex-col ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} border-gray-200 dark:border-slate-700`}
      >
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('nav.sabeel')}</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('nav.sabeelDesc')}</p>
            </div>
            <button onClick={toggleSidebar} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors" aria-label={t('nav.closeMenu')}>
              {closeIcon}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeView === item.id ? 'bg-slate-800 dark:bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'}`}>
              <span className={activeView === item.id ? 'text-white' : 'text-gray-400 dark:text-gray-500'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-slate-700 space-y-1">
          <button onClick={toggleDarkMode} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
            {darkMode ? <Sun size={20} className="text-gray-400 dark:text-gray-500" /> : <Moon size={20} className="text-gray-400 dark:text-gray-500" />}
            <span>{darkMode ? (language === 'ar' ? 'الوضع الفاتح' : 'Light Mode') : (language === 'ar' ? 'الوضع الداكن' : 'Dark Mode')}</span>
          </button>

          <button onClick={toggleLang} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
            <Globe size={20} className="text-gray-400 dark:text-gray-500" />
            <span>{language === 'ar' ? 'English' : '\u0639\u0631\u0628\u064a'}</span>
            <span className={`text-xs bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full ${isRTL ? 'mr-auto' : 'ml-auto'}`}>{language === 'ar' ? 'AR' : 'EN'}</span>
          </button>

          <button onClick={onSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            <LogOut size={20} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
