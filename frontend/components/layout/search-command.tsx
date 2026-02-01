"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Radio,
  AlertCircle,
  Store,
  Brain,
  Zap,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApiContext } from '@/lib/api-context';
import type { Incident, AgentAction, Pattern } from '@/types';

interface SearchResult {
  id: string;
  type: 'incident' | 'signal' | 'pattern' | 'merchant' | 'action' | 'doc';
  title: string;
  description: string;
  href: string;
  icon: typeof Radio;
  color: string;
}

export function SearchCommand() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { incidents = [], events = [], patterns = [], pendingActions = [] } = useApiContext();

  // Build search index from ApiContext data. Merchants and known issues are empty by default.
  const merchants: Array<Record<string, unknown>> = [];
  const knownIssues: Array<Record<string, unknown>> = [];

  const searchIndex = useMemo(() => {
    const results: SearchResult[] = [];

  incidents.forEach((inc: Incident) => {
      results.push({
        id: inc.id,
        type: 'incident',
        title: inc.title,
        description: `${inc.severity} • ${inc.status}`,
        href: `/incidents/${inc.id}`,
        icon: AlertCircle,
        color: 'text-rose-400',
      });
    });

  events.forEach((ev: any) => {
      results.push({
        id: String(ev.id),
        type: 'signal',
        title: ev.event_type || ev.title || 'signal',
        description: `${ev.source || 'api'} • ${ev.severity || 'unknown'}`,
        href: '/signals',
        icon: Radio,
        color: 'text-cyan-400',
      });
    });

  patterns.forEach((pat: Pattern) => {
      results.push({
        id: pat.id,
        type: 'pattern',
        title: `${pat.pattern_type} Pattern`,
        description: `${pat.affected_merchants || 0} merchants affected`,
        href: '/patterns',
        icon: Brain,
        color: 'text-fuchsia-400',
      });
    });

  merchants.forEach((m: any) => {
      results.push({
        id: m.id,
        type: 'merchant',
        title: m.name,
        description: `${(m.migration_stage || '').replace('_', ' ')} • ${m.region || ''}`,
        href: '/migration',
        icon: Store,
        color: 'text-amber-400',
      });
    });

  pendingActions.forEach((act: AgentAction) => {
      results.push({
        id: act.id,
        type: 'action',
        title: act.title,
        description: `${act.status} • ${act.riskLevel || 'medium'} risk`,
        href: '/actions',
        icon: Zap,
        color: 'text-emerald-400',
      });
    });

  knownIssues.forEach((issue: any) => {
      results.push({
        id: issue.id,
        type: 'doc',
        title: issue.title,
        description: `Known issue • ${issue.status}`,
        href: '/docs',
        icon: FileText,
        color: 'text-zinc-400',
      });
    });

    return results;
  }, [incidents, events, patterns, pendingActions]);

  // Filter results based on query
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return searchIndex
      .filter(
        (item) =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.description.toLowerCase().includes(lowerQuery) ||
          item.id.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 8);
  }, [query, searchIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      e.preventDefault();
      navigateTo(filteredResults[selectedIndex]);
    }
  };

  const navigateTo = (result: SearchResult) => {
    router.push(result.href);
    setIsOpen(false);
    setQuery('');
  };

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  return (
    <>
      {/* Search Input Trigger */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search... ⌘K"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          className={cn(
            'w-full h-9 pl-10 pr-4 rounded-lg',
            'bg-zinc-900 border border-zinc-800',
            'text-sm text-white placeholder:text-zinc-500',
            'focus:outline-none focus:border-cyan-500/50',
            'transition-all duration-200'
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim() && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
            />

            {/* Results Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
            >
              {filteredResults.length > 0 ? (
                <div className="py-2">
                  {filteredResults.map((result, index) => {
                    const Icon = result.icon;
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigateTo(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                        )}
                      >
                        <div className={cn('p-2 rounded-lg bg-zinc-800', isSelected && 'bg-zinc-700')}>
                          <Icon className={cn('w-4 h-4', result.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{result.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{result.description}</p>
                        </div>
                        <span className="text-xs text-zinc-600 uppercase">{result.type}</span>
                        <ChevronRight className={cn('w-4 h-4 text-zinc-600', isSelected && 'text-cyan-400')} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <Search className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No results for "{query}"</p>
                  <p className="text-xs text-zinc-600 mt-1">Try searching for incidents, merchants, or signals</p>
                </div>
              )}

              {/* Footer */}
              <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">↑↓</kbd> navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">↵</kbd> select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">esc</kbd> close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
