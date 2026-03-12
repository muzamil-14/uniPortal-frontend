'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/lib/toast-context';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId: number | null;
  createdAt: string;
}

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  grade: {
    icon: '📊',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  },
  deadline: {
    icon: '⏰',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  },
  announcement: {
    icon: '📢',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
  },
  message: {
    icon: '💬',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
  },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const toast = useToast();

  useEffect(() => {
    apiFetch('/notifications').then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      window.dispatchEvent(new Event('notifications-updated'));
      toast.success('All notifications marked as read');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Notifications</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-sm text-accent hover:bg-accent/10 rounded-xl transition-colors cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'unread', 'grade', 'deadline', 'announcement', 'message'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-card-bg border border-card-border hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-12">No notifications.</p>
        ) : (
          filtered.map((n) => {
            const config = typeConfig[n.type] || typeConfig.message;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markAsRead(n.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'bg-card-bg border-card-border opacity-70'
                    : `${config.bg} border`
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-sm ${n.isRead ? '' : config.color}`}>
                        {n.title}
                      </h3>
                      {!n.isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{n.message}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
