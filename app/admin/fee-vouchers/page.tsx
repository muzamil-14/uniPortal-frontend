'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

interface VoucherItem {
  id: number;
  voucherNumber: string;
  status: 'unpaid' | 'paid';
  courseFee: number;
  previousDue: number;
  totalAmount: number;
  dueDate: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  lineItems: Array<{
    courseId: number;
    courseTitle: string;
    coursePrice: number;
  }>;
}

export default function AdminFeeVouchersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
      return;
    }

    if (user) {
      apiFetch('/fee-vouchers/admin')
        .then(setVouchers)
        .catch((err: unknown) => {
          toast.error(err instanceof Error ? err.message : 'Failed to load vouchers');
        })
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router, toast]);

  const updateStatus = async (id: number) => {
    try {
      setUpdatingId(id);
      const updated = await apiFetch(`/fee-vouchers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paid' }),
      });
      setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated } : v)));
      toast.success('Voucher marked as paid. This action cannot be undone.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Fee Vouchers</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Review each student&apos;s latest voucher. Once marked paid, it cannot be reversed. New course registrations will generate a new voucher.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {vouchers.map((v) => (
          <div key={v.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-zinc-500">{v.voucherNumber}</p>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{v.user.name}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{v.user.email}</p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full ${
                  v.status === 'paid'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                }`}
              >
                {v.status}
              </span>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 font-medium text-zinc-700 dark:text-zinc-200">
                Course Details
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {v.lineItems.length > 0 ? v.lineItems.map((item) => (
                  <div key={item.courseId} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{item.courseTitle}</span>
                    <span className="font-medium">{Number(item.coursePrice).toFixed(2)}</span>
                  </div>
                )) : (
                  <div className="px-3 py-2 text-zinc-500 dark:text-zinc-400 text-sm">
                    No active course dues
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-sm space-y-1 text-zinc-600 dark:text-zinc-300">
              <p>Latest Course Fee: <span className="font-medium">{Number(v.courseFee).toFixed(2)}</span></p>
              <p>Previous Dues: <span className="font-medium">{Number(v.previousDue).toFixed(2)}</span></p>
              <p>Total: <span className="font-semibold">{Number(v.totalAmount).toFixed(2)}</span></p>
              <p>Due Date: <span className="font-medium">{v.dueDate ? new Date(v.dueDate).toLocaleDateString() : '-'}</span></p>
            </div>

            <div className="mt-4">
              {v.status === 'unpaid' ? (
                <button
                  onClick={() => updateStatus(v.id)}
                  disabled={updatingId === v.id}
                  className="w-full text-sm px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {updatingId === v.id ? 'Updating...' : 'Mark Paid'}
                </button>
              ) : (
                <div className="w-full text-center text-sm px-4 py-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  Paid vouchers are locked and cannot be reverted
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {vouchers.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-500 dark:text-zinc-400">
          No student vouchers available yet.
        </div>
      )}
    </div>
  );
}
