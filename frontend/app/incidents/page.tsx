'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { MainContent, PageHeader } from '@/components/layout';
import { GlassCard, SeverityBadge, StatusBadge, Button } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { useApp } from '@/lib/app-context';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { Severity, IncidentStatus } from '@/types';

const severityFilters: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low'];
const statusFilters: (IncidentStatus | 'all')[] = ['all', 'active', 'investigating', 'mitigating', 'resolved'];

export default function IncidentsPage() {
  const { incidents } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <MainContent>
      <ScrollReveal>
        <PageHeader
          title="Incidents"
          description="Monitor and manage all system incidents. Click on an incident to view details and take action."
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
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-foreground/5 border border-surface-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-foreground-muted" />
              <span className="text-sm text-foreground-muted">Severity:</span>
              <div className="flex gap-1">
                {severityFilters.map((severity) => (
                  <button
                    key={severity}
                    onClick={() => setSeverityFilter(severity)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      severityFilter === severity
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-foreground/5 text-foreground-secondary hover:bg-foreground/10'
                    )}
                  >
                    {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-foreground-muted">Status:</span>
            <div className="flex flex-wrap gap-1">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    statusFilter === status
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-foreground/5 text-foreground-secondary hover:bg-foreground/10'
                  )}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Incidents List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${severityFilter}-${statusFilter}-${searchQuery}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {filteredIncidents.length === 0 ? (
            <GlassCard className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No incidents found</h3>
              <p className="text-foreground-muted mt-2">
                Try adjusting your filters or search query.
              </p>
            </GlassCard>
          ) : (
            <StaggerContainer className="space-y-4">
              {filteredIncidents.map((incident) => (
                <StaggerItem key={incident.id}>
                  <Link href={`/incidents/${incident.id}`} className="block group">
                    <GlassCard
                      hover
                      className="flex flex-col lg:flex-row lg:items-center gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0">
                          <SeverityBadge severity={incident.severity} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                            {incident.title}
                          </h3>
                          <p className="text-sm text-foreground-muted mt-1 line-clamp-2">
                            {incident.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <StatusBadge status={incident.status} size="sm" />
                            <span className="flex items-center gap-1 text-xs text-foreground-muted">
                              <Clock className="w-3 h-3" />
                              Created {formatRelativeTime(incident.createdAt)}
                            </span>
                            <span className="text-xs text-foreground-muted">
                              {incident.signals.length} signals • {incident.hypotheses.length} hypotheses
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 lg:flex-shrink-0">
                        <div className="text-right hidden lg:block">
                          <p className="text-sm text-foreground-muted">Affected Systems</p>
                          <p className="text-sm font-medium text-foreground">
                            {incident.affectedSystems.slice(0, 2).join(', ')}
                            {incident.affectedSystems.length > 2 && ` +${incident.affectedSystems.length - 2}`}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-foreground-muted group-hover:text-accent transition-colors" />
                      </div>
                    </GlassCard>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </motion.div>
      </AnimatePresence>
    </MainContent>
  );
}
