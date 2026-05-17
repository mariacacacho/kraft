import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PaymentStatus, TicketPriority, TicketStatus, TicketType } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  todo: { label: 'Todo', color: 'text-slate-600', bg: 'bg-slate-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50' },
  in_review: { label: 'In Review', color: 'text-amber-600', bg: 'bg-amber-50' },
  done: { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; dot: string }> = {
  low: { label: 'Low', color: 'text-gray-500', dot: 'bg-gray-400' },
  medium: { label: 'Medium', color: 'text-amber-600', dot: 'bg-amber-400' },
  high: { label: 'High', color: 'text-red-600', dot: 'bg-red-500' },
};

export const TYPE_CONFIG: Record<TicketType, { label: string; color: string; bg: string }> = {
  cotizacion: { label: 'Cotización', color: 'text-violet-700', bg: 'bg-violet-50' },
  ajuste: { label: 'Ajuste', color: 'text-sky-700', bg: 'bg-sky-50' },
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-orange-600', bg: 'bg-orange-50' },
  paid:    { label: 'Paid',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export const HOURLY_RATE = 18;

export function formatCost(hours?: number | null): string {
  if (!hours) return '$0.00';
  return `$${(hours * HOURLY_RATE).toFixed(2)}`;
}

export const PROJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
