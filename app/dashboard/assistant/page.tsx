'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Send, Sparkles, Target, AlertCircle, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { aiAssistantSuggestions } from '@/lib/data';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'ai';
  content: string;
  observation?: string;
  evidence?: string;
  interpretation?: string;
  confidence?: number;
  recommendation?: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content: 'I\'ve analyzed your competitive landscape. Ask me anything about your tracked competitors, creative trends, or what to do next.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const message = (text || input).trim();
    if (!message || loading) return;
    const history = messages.slice(-8).map((item) => ({
      role: item.role === 'ai' ? 'assistant' as const : 'user' as const,
      content: item.content,
    }));
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/intelligence/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message, history }),
      });
      const payload = await response.json() as {
        ok?: boolean;
        data?: { answer?: { content: string; observation: string; evidence: string; interpretation: string; recommendation: string; confidence: number } };
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok || !payload.data?.answer) throw new Error(payload.error?.message || 'The grounded assistant could not answer this question.');
      const answer = payload.data.answer;
      setMessages((prev) => [...prev, {
        role: 'ai',
        content: answer.content,
        observation: answer.observation,
        evidence: answer.evidence,
        interpretation: answer.interpretation,
        confidence: answer.confidence,
        recommendation: answer.recommendation,
      }]);
    } catch (requestError) {
      setMessages((prev) => [...prev, {
        role: 'ai',
        content: requestError instanceof Error ? requestError.message : 'The grounded assistant could not answer this question.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">AI Intelligence Assistant</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ask about competitor strategies, creative trends, and recommended actions.</p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              <div className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                msg.role === 'ai' ? 'gradient-brand' : 'bg-white/[0.06]'
              )}>
                {msg.role === 'ai' ? <Brain className="h-4 w-4 text-white" /> : <span className="text-xs font-bold">JD</span>}
              </div>
              <div className={cn('max-w-[80%]', msg.role === 'user' && 'text-right')}>
                <div className={cn(
                  'inline-block rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'ai' ? 'bg-white/[0.04] text-foreground' : 'gradient-brand text-white'
                )}>
                  {msg.content}
                </div>

                {msg.observation && (
                  <div className="mt-3 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left">
                    {[
                      { label: 'Observation', value: msg.observation, icon: Eye },
                      { label: 'Evidence', value: msg.evidence, icon: BarChart3 },
                      { label: 'Interpretation', value: msg.interpretation, icon: Brain },
                      { label: 'Recommendation', value: msg.recommendation, icon: Target },
                    ].map((section) => section.value && (
                      <div key={section.label}>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-400">
                          <section.icon className="h-3.5 w-3.5" /> {section.label}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{section.value}</p>
                      </div>
                    ))}
                    {msg.confidence !== undefined && (
                      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${msg.confidence}%` }}
                            className="h-full rounded-full gradient-brand"
                          />
                        </div>
                        <span className="text-xs font-semibold">{msg.confidence}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-white/[0.04] px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="h-2 w-2 rounded-full bg-brand-400"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="border-t border-white/[0.04] p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" /> Try asking
            </div>
            <div className="flex flex-wrap gap-2">
              {aiAssistantSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-brand-500/20 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about competitors, trends, or what to test next..."
              className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-500/30 focus:bg-white/[0.04]"
            />
            <Button
              size="sm"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="gradient-brand text-white gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <AlertCircle className="h-3 w-3" /> Answers are grounded in indexed ad evidence and clearly label inference.
          </div>
        </div>
      </Card>
    </div>
  );
}

function Eye(props: React.ComponentProps<typeof Brain>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
