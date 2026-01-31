'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { MainContent, PageHeader } from '@/components/layout';
import { GlassCard, ConfidenceMeter, Button, CollapsibleSection } from '@/components/ui';
import { ScrollReveal } from '@/components/motion';
import { mockSupportResponse } from '@/lib/mock-data';

export default function CopilotPage() {
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mockSupportResponse.suggestedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  return (
    <MainContent>
      <ScrollReveal>
        <PageHeader
          title="Support Copilot"
          description="AI-powered assistance for crafting customer responses. The copilot analyzes active incidents and knowledge base to suggest contextual responses."
        />
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Response Area */}
        <div className="lg:col-span-2 space-y-6">
          <ScrollReveal delay={0.1}>
            <GlassCard elevated padding="lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/10">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Suggested Response</h2>
                    <p className="text-sm text-foreground-muted">Based on active incident INC-001</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground-muted">Confidence:</span>
                  <ConfidenceMeter value={mockSupportResponse.confidence} size="sm" />
                </div>
              </div>

              {/* Response Content */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="p-6 rounded-xl bg-foreground/5 border border-surface-border"
              >
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground-secondary leading-relaxed">
                  {mockSupportResponse.suggestedResponse}
                </pre>
              </motion.div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6">
                <Button onClick={handleCopy} variant="primary">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Response
                    </>
                  )}
                </Button>
                <Button onClick={handleRefresh} variant="secondary" isLoading={isRefreshing}>
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  onClick={() => setShowExplanation(!showExplanation)}
                  variant="ghost"
                >
                  {showExplanation ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Explanation
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show Explanation
                    </>
                  )}
                </Button>
              </div>

              {/* Explanation Panel */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/20">
                      <h3 className="font-medium text-foreground mb-2">Why this response?</h3>
                      <p className="text-sm text-foreground-secondary">
                        {mockSupportResponse.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </ScrollReveal>

          {/* Input for custom context */}
          <ScrollReveal delay={0.2}>
            <GlassCard padding="lg">
              <h3 className="font-semibold text-foreground mb-4">Add Context</h3>
              <textarea
                placeholder="Paste customer message or add additional context for a more tailored response..."
                className="w-full h-32 p-4 rounded-xl bg-foreground/5 border border-surface-border text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex justify-end mt-4">
                <Button>Generate with Context</Button>
              </div>
            </GlassCard>
          </ScrollReveal>
        </div>

        {/* Sidebar - Sources & Alternatives */}
        <div className="space-y-6">
          <ScrollReveal delay={0.2}>
            <GlassCard elevated padding="lg">
              <h3 className="font-semibold text-foreground mb-4">Sources Used</h3>
              <div className="space-y-3">
                {mockSupportResponse.sources.map((source, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-foreground-muted flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground-secondary">{source}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <GlassCard padding="lg">
              <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="secondary" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4" />
                  Use empathetic tone
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4" />
                  Add technical details
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4" />
                  Shorten response
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4" />
                  Add next steps
                </Button>
              </div>
            </GlassCard>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <GlassCard padding="lg">
              <h3 className="font-semibold text-foreground mb-4">Response Guidelines</h3>
              <ul className="space-y-2 text-sm text-foreground-muted">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Acknowledge the customer's issue
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Provide current status update
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Include ETA when possible
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  Offer workaround if available
                </li>
              </ul>
            </GlassCard>
          </ScrollReveal>
        </div>
      </div>
    </MainContent>
  );
}
