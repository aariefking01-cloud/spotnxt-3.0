'use client';

import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Users, DollarSign, Activity, TrendingUp, Shield, UserCheck, UserX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/motion';
import { engagementTrend, platformDistribution } from '@/lib/data';
import { cn } from '@/lib/utils';

const adminUsers = [
  { name: 'Sarah Chen', email: 'sarah@lumenlabs.io', plan: 'Scale', status: 'Active', joined: 'Jan 2026' },
  { name: 'Marcus Rodriguez', email: 'marcus@vertex.com', plan: 'Growth', status: 'Active', joined: 'Feb 2026' },
  { name: 'Priya Nair', email: 'priya@bloom.agency', plan: 'Growth', status: 'Active', joined: 'Mar 2026' },
  { name: 'Tom Wilson', email: 'tom@wilson.co', plan: 'Starter', status: 'Trial', joined: 'Jul 2026' },
  { name: 'Lisa Zhang', email: 'lisa@zhang.io', plan: 'Scale', status: 'Active', joined: 'Apr 2026' },
  { name: 'Alex Kim', email: 'alex@kim.dev', plan: 'Starter', status: 'Churned', joined: 'May 2026' },
];

const revenueData = [
  { month: 'Feb', revenue: 28400, users: 1200 },
  { month: 'Mar', revenue: 35200, users: 1450 },
  { month: 'Apr', revenue: 42100, users: 1780 },
  { month: 'May', revenue: 51800, users: 2100 },
  { month: 'Jun', revenue: 64300, users: 2540 },
  { month: 'Jul', revenue: 78900, users: 3120 },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Admin Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage users, plans, and platform analytics.</p>
        </div>
        <Badge className="gap-1.5 gradient-brand text-white">
          <Shield className="h-3.5 w-3.5" /> Admin Access
        </Badge>
      </div>

      <StaggerContainer className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Users', value: '3,120', icon: Users, trend: '+12.4%', color: 'text-brand-500' },
          { label: 'Monthly Revenue', value: '$78.9K', icon: DollarSign, trend: '+22.7%', color: 'text-chart-2' },
          { label: 'Active Users', value: '2,840', icon: Activity, trend: '+8.1%', color: 'text-chart-3' },
          { label: 'Churn Rate', value: '2.3%', icon: TrendingUp, trend: '-0.8%', color: 'text-chart-5' },
        ].map((stat) => (
          <StaggerItem key={stat.label}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <stat.icon className={cn('h-5 w-5', stat.color)} />
                <span className="text-xs text-success">{stat.trend}</span>
              </div>
              <div className="mt-3 text-2xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold">Revenue & User Growth</h3>
            <p className="text-sm text-muted-foreground">Monthly recurring revenue and active users</p>
            <div className="mt-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </FadeIn>

        <FadeIn>
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold">Plan Distribution</h3>
            <div className="mt-6 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Starter', value: 1450, color: 'hsl(var(--chart-1))' },
                    { name: 'Growth', value: 1280, color: 'hsl(var(--chart-2))' },
                    { name: 'Scale', value: 390, color: 'hsl(var(--chart-4))' },
                  ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {[0,1,2].map(i => <Cell key={i} fill={['hsl(var(--chart-1))','hsl(var(--chart-2))','hsl(var(--chart-4))'][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {[
                { name: 'Starter', count: 1450, color: 'hsl(var(--chart-1))' },
                { name: 'Growth', count: 1280, color: 'hsl(var(--chart-2))' },
                { name: 'Scale', count: 390, color: 'hsl(var(--chart-4))' },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </div>
                  <span className="font-medium tabular-nums">{p.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>
      </div>

      <FadeIn>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">User Management</h3>
            <Button size="sm" className="gradient-brand text-white gap-2">
              <UserCheck className="h-4 w-4" /> Invite User
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Joined</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((user) => (
                  <tr key={user.email} className="border-b border-border/40 transition-colors hover:bg-accent/30">
                    <td className="py-3 font-medium">{user.name}</td>
                    <td className="py-3 text-muted-foreground">{user.email}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{user.plan}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={user.status === 'Active' ? 'default' : user.status === 'Churned' ? 'destructive' : 'secondary'}
                        className={user.status === 'Active' ? 'bg-success/10 text-success' : ''}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">{user.joined}</td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm" className="text-xs">Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
