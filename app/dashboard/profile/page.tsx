'use client';

import { User, Mail, Building, Globe, Award, TrendingUp, Eye, Bookmark } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FadeIn } from '@/components/motion';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account information and preferences.</p>
      </div>

      <FadeIn>
        <Card className="overflow-hidden">
          <div className="px-6 pb-6 pt-6">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-brand-500/10 blur-md" aria-hidden="true" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-card text-3xl font-bold gradient-brand text-white shadow-lg shadow-brand-500/20">
                  JD
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold">Jordan Doe</h2>
                <p className="text-sm text-muted-foreground">Head of Growth · Lumen Labs</p>
              </div>
              <Button className="ml-auto shrink-0" variant="outline" size="sm">Edit Profile</Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Ads Analyzed', value: '1,240', icon: Eye },
                { label: 'Competitors Tracked', value: '42', icon: TrendingUp },
                { label: 'Reports Generated', value: '86', icon: Award },
                { label: 'Saved Projects', value: '23', icon: Bookmark },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/60 p-4 text-center">
                  <stat.icon className="mx-auto h-5 w-5 text-brand-500" />
                  <div className="mt-2 text-2xl font-bold tabular-nums">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </FadeIn>

      <FadeIn>
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold">Account Information</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input defaultValue="Jordan Doe" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input defaultValue="jordan@spotnxt.ai" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input defaultValue="Lumen Labs" className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input defaultValue="lumenlabs.io" className="pl-10" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button className="gradient-brand text-white">Save Changes</Button>
          </div>
        </Card>
      </FadeIn>

      <FadeIn>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Subscription</h3>
              <p className="text-sm text-muted-foreground">Your current plan and billing</p>
            </div>
            <Badge className="gradient-brand text-white">Growth Plan</Badge>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div>
              <div className="text-sm font-medium">$149/month · Billed monthly</div>
              <div className="text-xs text-muted-foreground">Next billing date: August 24, 2026</div>
            </div>
            <Button variant="outline" size="sm">Manage Plan</Button>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
