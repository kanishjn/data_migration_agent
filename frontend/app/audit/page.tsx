'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, User, Bot, Filter, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { MainContent, PageHeader } from '@/components/layout';
import { GlassCard, Button } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { mockAuditLog } from '@/lib/mock-data';
import { formatDate, cn } from '@/lib/utils';

export default function AuditPage() {
  const [filter, setFilter] = useState<'all' | 'agent' | 'human'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = mockAuditLog.filter((entry) => {
    const matchesFilter = filter === 'all' || entry.actor === filter;
    const matchesSearch =
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <MainContent>
      <ScrollReveal>
        <PageHeader
          title="Audit Log"
          description="Complete timeline of all agent and human actions. Every decision is logged for transparency and compliance."
        />
      </ScrollReveal>

      {/* Filters */}
      <ScrollReveal delay={0.1}>
        <GlassCard className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search audit log..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-foreground/5 border border-surface-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Actor Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-foreground-muted" />
              <span className="text-sm text-foreground-muted">Actor:</span>
              <div className="flex gap-1">
                {(['all', 'agent', 'human'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilter(option)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      filter === option
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-foreground/5 text-foreground-secondary hover:bg-foreground/10'
                    )}
                  >
                    {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Timeline */}
      <ScrollReveal delay={0.2}>
        <GlassCard elevated padding="lg">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-surface-border" />

            <StaggerContainer className="space-y-6">
              {filteredLogs.map((entry, index) => (
                <StaggerItem key={entry.id}>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="relative flex gap-4 pl-4"
                  >
                    {/* Timeline node */}
                    <div
                      className={cn(
                        'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        entry.actor === 'agent'
                          ? 'bg-accent/20 text-accent'
                          : 'bg-emerald-500/20 text-emerald-500'
                      )}
                    >
                      {entry.actor === 'agent' ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">{entry.action}</p>
                          <p className="text-sm text-foreground-muted mt-1">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-foreground-muted">
                              by {entry.actorName}
                            </span>
                            <span className="text-xs text-foreground-muted">
                              {formatDate(entry.timestamp)}
                            </span>
                            {entry.incidentId && (
                              <Link
                                href={`/incidents/${entry.incidentId}`}
                                className="flex items-center gap-1 text-xs text-accent hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {entry.incidentId}
                              </Link>
                            )}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            entry.actor === 'agent'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-emerald-500/10 text-emerald-500'
                          )}
                        >
                          {entry.actor}
                        </span>
                      </div>

                      {/* Metadata */}
                      {entry.metadata && (
                        <div className="mt-3 p-3 rounded-lg bg-foreground/5 font-mono text-xs text-foreground-muted">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">No entries found</h3>
                <p className="text-foreground-muted mt-2">
                  Try adjusting your filters or search query.
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      </ScrollReveal>
    </MainContent>
  );
}
