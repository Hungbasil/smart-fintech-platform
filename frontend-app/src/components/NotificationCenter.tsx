import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Loader2, Settings2, Trash2 } from 'lucide-react';
import { API_BASE_URL, deleteNotification, getNotificationPreferences, getNotifications, getUnreadNotificationCount, markAllNotificationsAsRead, markNotificationAsRead, updateNotificationPreferences, type NotificationItem, type NotificationPreferences } from '../services/api';
import auth from '../services/auth';
import { getApiErrorMessage, toast } from '../services/notifications';

const relativeTime = (value: string) => {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({ budgetEnabled: true, debtEnabled: true, recurringEnabled: true });
  const [savingPreferences, setSavingPreferences] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsResponse, countResponse] = await Promise.all([
        getNotifications(),
        getUnreadNotificationCount(),
      ]);
      setItems(notificationsResponse.data.content);
      setUnread(countResponse.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to load notifications'));
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      setPreferences((await getNotificationPreferences()).data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to load notification settings'));
    }
  };

  useEffect(() => {
    void loadNotifications();
    void loadPreferences();
    const token = auth.getToken();
    if (!token) return undefined;

    const eventSource = new EventSource(`${API_BASE_URL}/notifications/subscribe?token=${encodeURIComponent(token)}`);
    eventSource.addEventListener('notification', (event) => {
      const message = (event as MessageEvent).data as string;
      toast.error(message, { duration: 8000 });
      void loadNotifications();
    });
    return () => eventSource.close();
  }, []);

  const togglePreference = async (key: keyof NotificationPreferences) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSavingPreferences(true);
    try {
      setPreferences((await updateNotificationPreferences(next)).data);
    } catch (error) {
      setPreferences(preferences);
      toast.error(getApiErrorMessage(error, 'Unable to save notification settings'));
    } finally {
      setSavingPreferences(false);
    }
  };

  const markRead = async (id: string) => {
    const target = items.find((item) => item.id === id);
    if (!target || target.readAt) return;
    try {
      await markNotificationAsRead(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread((count) => Math.max(0, count - 1));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update notification'));
    }
  };

  const markAllRead = async () => {
    if (!unread) return;
    try {
      await markAllNotificationsAsRead();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to update notifications'));
    }
  };

  const remove = async (id: string) => {
    const target = items.find((item) => item.id === id);
    try {
      await deleteNotification(id);
      setItems((current) => current.filter((item) => item.id !== id));
      if (target && !target.readAt) setUnread((count) => Math.max(0, count - 1));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to delete notification'));
    }
  };

  return (
    <div className="relative">
      <button type="button" aria-label="Notifications" aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void loadNotifications(); }} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-[#71808c] transition hover:bg-[#e4f4f0] hover:text-[#087f74]">
        <Bell size={19} />
        {unread > 0 && <span className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#d76756] px-1 text-[9px] font-extrabold text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && <div className="absolute right-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-[#e3ebe8] bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-[#edf2f0] px-4 py-3"><div><h2 className="text-sm font-extrabold text-[#17212b]">Notifications</h2><p className="text-[11px] text-[#9aa7af]">{unread ? `${unread} unread` : 'All caught up'}</p></div><div className="flex items-center gap-3"><button type="button" aria-label="Notification settings" title="Notification settings" onClick={() => setShowSettings((value) => !value)} className={`rounded-lg p-1.5 text-[#71808c] hover:bg-[#e4f4f0] hover:text-[#087f74] ${showSettings ? 'bg-[#e4f4f0] text-[#087f74]' : ''}`}><Settings2 size={15} /></button><button type="button" onClick={() => void markAllRead()} disabled={!unread} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#087f74] disabled:opacity-40"><CheckCheck size={14} />Mark all read</button></div></div>
        {showSettings && <div className="border-b border-[#edf2f0] bg-[#fbfdfc] px-4 py-3"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-extrabold text-[#17212b]">Alert settings</p><span className="text-[10px] text-[#9aa7af]">{savingPreferences ? 'Saving...' : 'Saved automatically'}</span></div><div className="space-y-2 text-xs text-[#71808c]"><label className="flex items-center justify-between gap-3"><span>Budget alerts</span><input type="checkbox" checked={preferences.budgetEnabled} onChange={() => void togglePreference('budgetEnabled')} /></label><label className="flex items-center justify-between gap-3"><span>Debt reminders</span><input type="checkbox" checked={preferences.debtEnabled} onChange={() => void togglePreference('debtEnabled')} /></label><label className="flex items-center justify-between gap-3"><span>Recurring reminders</span><input type="checkbox" checked={preferences.recurringEnabled} onChange={() => void togglePreference('recurringEnabled')} /></label></div></div>}
        <div className="max-h-[min(420px,60vh)] overflow-y-auto">
          {loading && <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-[#71808c]"><Loader2 size={16} className="animate-spin" />Loading notifications</div>}
          {!loading && items.length === 0 && <div className="px-4 py-10 text-center text-sm text-[#9aa7af]">No notifications yet.</div>}
          {!loading && items.map((item) => <div key={item.id} className={`group flex gap-3 border-b border-[#edf2f0] px-4 py-3 last:border-0 ${item.readAt ? 'bg-white' : 'bg-[#f1f8f6]'}`}>
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-[#dce9e5]' : 'bg-[#087f74]'}`} />
            <button type="button" onClick={() => void markRead(item.id)} className="min-w-0 flex-1 text-left"><p className={`text-xs leading-5 ${item.readAt ? 'font-medium text-[#71808c]' : 'font-bold text-[#17212b]'}`}>{item.message}</p><p className="mt-1 text-[10px] text-[#9aa7af]">{relativeTime(item.createdAt)}</p></button>
            <button type="button" aria-label="Delete notification" title="Delete notification" onClick={() => void remove(item.id)} className="self-start rounded-md p-1 text-[#c0cbc7] opacity-0 transition hover:bg-[#fff1ef] hover:text-[#d76756] group-hover:opacity-100"><Trash2 size={14} /></button>
          </div>)}
        </div>
      </div>}
    </div>
  );
};

export default NotificationCenter;