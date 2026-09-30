'use client';

import { motion } from 'framer-motion';
import { Eye, Sparkles, TrendingUp, BarChart3 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* Left side — branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-card p-12 lg:flex">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-brand-500/20 blur-[100px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-chart-2/20 blur-[100px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        </div>

        <Logo />

        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-4xl font-bold tracking-tight"
          >
            See every ad your<br /><span className="gradient-text">competitors run.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 max-w-md text-muted-foreground"
          >
            AI-powered competitive intelligence that helps you monitor, analyze, and outperform
            your competition across every advertising platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 space-y-3"
          >
            {[
              { icon: Eye, text: 'Monitor competitor ads across 5+ platforms' },
              { icon: Sparkles, text: 'AI analysis of creative strategy & frameworks' },
              { icon: TrendingUp, text: 'Performance predictions with 92% accuracy' },
              { icon: BarChart3, text: 'Trend analysis and strategic recommendations' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                  <item.icon className="h-4 w-4 text-brand-500" />
                </div>
                <span className="text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex -space-x-2">
            {['https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=60',
              'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=60',
              'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=60'].map((src) => (
              <img key={src} src={src} alt="" className="h-8 w-8 rounded-full border-2 border-card object-cover" />
            ))}
          </div>
          <span>Join 50,000+ marketers using SpotNxt AI</span>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="hidden justify-end p-6 lg:flex">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
