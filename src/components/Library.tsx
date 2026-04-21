'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, X, Edit3, Trash2, Search,
  ExternalLink, FileText, Book, Link as LinkIcon,
  StickyNote, Archive,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import type { LibraryResource } from '@/lib/types';

const TYPE_COLORS: Record<string, { bg: string; bgDark: string; text: string; textDark: string; iconBg: string; iconBgDark: string }> = {
  book:    { bg: 'bg-amber-50',   bgDark: 'dark:bg-amber-950',   text: 'text-amber-700',   textDark: 'dark:text-amber-300',   iconBg: 'bg-amber-100',   iconBgDark: 'dark:bg-amber-900' },
  article: { bg: 'bg-purple-50',  bgDark: 'dark:bg-purple-950', text: 'text-purple-700',  textDark: 'dark:text-purple-300', iconBg: 'bg-purple-100',  iconBgDark: 'dark:bg-purple-900' },
  pdf:     { bg: 'bg-green-50',   bgDark: 'dark:bg-green-950',  text: 'text-green-700',   textDark: 'dark:text-green-300',   iconBg: 'bg-green-100',   iconBgDark: 'dark:bg-green-900' },
  link:    { bg: 'bg-blue-50',    bgDark: 'dark:bg-blue-950',   text: 'text-blue-700',    textDark: 'dark:text-blue-300',    iconBg: 'bg-blue-100',    iconBgDark: 'dark:bg-blue-900' },
  note:    { bg: 'bg-pink-50',    bgDark: 'dark:bg-pink-950',   text: 'text-pink-700',    textDark: 'dark:text-pink-300',    iconBg: 'bg-pink-100',    iconBgDark: 'dark:bg-pink-900' },
  other:   { bg: 'bg-gray-50',    bgDark: 'dark:bg-gray-900',   text: 'text-gray-700',    textDark: 'dark:text-gray-300',    iconBg: 'bg-gray-100',    iconBgDark: 'dark:bg-gray-800' },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  book: Book,
  article: FileText,
  pdf: FileText,
  link: LinkIcon,
  note: StickyNote,
  other: Archive,
};

const FILTER_TYPES = ['all', 'book', 'article', 'pdf', 'link', 'note'] as const;

export default function Library() {
  const { libraryResources, addLibraryResource, updateLibraryResource, removeLibraryResource, addToast, addNotification } = useAppStore();
  const t = useT();

  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<LibraryResource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<LibraryResource['type']>('book');
  const [category, setCategory] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setName('');
    setType('book');
    setCategory('');
    setUrl('');
    setDescription('');
    setEditingResource(null);
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (resource: LibraryResource) => {
    setEditingResource(resource);
    setName(resource.name);
    setType(resource.type);
    setCategory(resource.category);
    setUrl(resource.url);
    setDescription(resource.description);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingResource) {
      const updated: LibraryResource = {
        ...editingResource,
        name: name.trim(),
        type,
        category: category.trim(),
        url: url.trim(),
        description: description.trim(),
      };
      updateLibraryResource(updated);
      addToast(t('lib.updateSuccess'), 'success');
    } else {
      const newResource: LibraryResource = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: name.trim(),
        type,
        category: category.trim(),
        url: url.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
      };
      addLibraryResource(newResource);
      addToast(t('lib.addSuccess'), 'success');

      const notifId = Date.now().toString() + Math.random().toString(36).slice(2);
      addNotification({
        id: notifId,
        title: t('notif.newResource'),
        message: t('notif.newResourceDesc'),
        type: 'resource',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    setShowModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm(t('lib.deleteConfirm'))) return;
    removeLibraryResource(id);
    addToast(t('lib.deleteSuccess'), 'success');
  };

  const handleOpenLink = (resource: LibraryResource) => {
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Filter resources
  const filteredResources = useMemo(() => {
    return libraryResources.filter((r) => {
      const matchesSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || r.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [libraryResources, searchQuery, filterType]);

  const getTypeIcon = (resourceType: string) => {
    return TYPE_ICONS[resourceType] || Archive;
  };

  const getTypeColor = (resourceType: string) => {
    return TYPE_COLORS[resourceType] || TYPE_COLORS.other;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getTypeLabel = (resourceType: string) => {
    const labels: Record<string, string> = {
      book: t('lib.typeBook'),
      article: t('lib.typeArticle'),
      pdf: t('lib.typePdf'),
      link: t('lib.typeLink'),
      note: t('lib.typeNote'),
      other: t('lib.typeOther'),
    };
    return labels[resourceType] || resourceType;
  };

  const filterLabel = (val: string) => {
    if (val === 'all') return t('lib.filterAll');
    return getTypeLabel(val);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('lib.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('lib.subtitle')}
            {libraryResources.length > 0 && (
              <span className="mr-2">
                {' — '}
                <span className="font-medium text-slate-600 dark:text-gray-300">{libraryResources.length}</span>{' '}
                {t('lib.resourcesCount')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-800 transition-colors shadow-lg"
        >
          <Plus size={18} />
          {t('lib.addResource')}
        </button>
      </div>

      {/* Search + Filters */}
      {libraryResources.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('lib.search')}
              className="w-full pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Type Filters */}
          <div className="flex gap-2 flex-wrap">
            {FILTER_TYPES.map((val) => (
              <button
                key={val}
                onClick={() => setFilterType(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === val
                    ? 'bg-slate-800 dark:bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {filterLabel(val)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {libraryResources.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">{t('lib.noResources')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('lib.emptyHint')}</p>
          <button
            onClick={openAdd}
            className="mt-4 px-4 py-2 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} className="inline ml-1" />
            {t('lib.addResource')}
          </button>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-12 text-center">
          <Search size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 dark:text-gray-500">{t('lib.noResources')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('lib.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredResources.map((resource) => {
              const IconComponent = getTypeIcon(resource.type);
              const colors = getTypeColor(resource.type);

              return (
                <motion.div
                  key={resource.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Top Row: Icon + Name + Actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.iconBg} ${colors.iconBgDark}`}>
                        <IconComponent size={20} className={`${colors.text} ${colors.textDark}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{resource.name}</h3>
                        {resource.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{resource.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {resource.url && (
                        <button
                          onClick={() => handleOpenLink(resource)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          title={t('lib.openLink')}
                        >
                          <ExternalLink size={14} className="text-blue-500" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(resource)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Edit3 size={14} className="text-gray-400 dark:text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Category Badge + Date */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.bgDark} ${colors.text} ${colors.textDark}`}>
                        {getTypeLabel(resource.type)}
                      </span>
                      {resource.category && (
                        <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full">
                          {resource.category}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(resource.createdAt)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {editingResource ? t('lib.editResource') : t('lib.addResourceTitle')}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={18} className="text-gray-400 dark:text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t('lib.name')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('lib.namePlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t('lib.type')}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as LibraryResource['type'])}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="book">{t('lib.typeBook')}</option>
                    <option value="article">{t('lib.typeArticle')}</option>
                    <option value="pdf">{t('lib.typePdf')}</option>
                    <option value="link">{t('lib.typeLink')}</option>
                    <option value="note">{t('lib.typeNote')}</option>
                    <option value="other">{t('lib.typeOther')}</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t('lib.category')}
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={t('lib.categoryPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t('lib.url')}
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t('lib.urlPlaceholder')}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100"
                    dir="ltr"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                    {t('lib.description')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('lib.descPlaceholder')}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 text-slate-800 dark:text-slate-100 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={!name.trim()}
                    className="flex-1 py-2.5 bg-slate-800 dark:bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-slate-700 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingResource ? t('lib.save') : t('lib.save')}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {t('proj.cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
