// src/components/NotificationBanner.tsx
import { useEffect, useState, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { getNotifications, type AppNotification } from '../api/client';

export default function NotificationBanner() {
    const [toasts, setToasts] = useState<AppNotification[]>([]);
    const lastSeenRef = useRef<string>(new Date().toISOString());
    const seenIdsRef = useRef<Set<number>>(new Set());

    // On mount: fetch last 10 to pre-populate seenIds (don't show old ones as toasts)
    useEffect(() => {
        getNotifications('0').then(res => {
            res.data.forEach(n => seenIdsRef.current.add(n.id));
        }).catch(() => {});
    }, []);

    // Poll every 10s for new notifications
    useEffect(() => {
        const poll = () => {
            getNotifications(lastSeenRef.current).then(res => {
                const fresh = res.data.filter(n => !seenIdsRef.current.has(n.id));
                if (fresh.length > 0) {
                    fresh.forEach(n => seenIdsRef.current.add(n.id));
                    lastSeenRef.current = new Date().toISOString();
                    setToasts(prev => [...fresh, ...prev].slice(0, 5)); // max 5 toasts
                }
            }).catch(() => {});
        };
        const interval = setInterval(poll, 10000);
        return () => clearInterval(interval);
    }, []);

    // Auto-dismiss each toast after 8s
    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts(prev => prev.slice(0, -1));
        }, 8000);
        return () => clearTimeout(timer);
    }, [toasts]);

    const dismiss = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2 pointer-events-none">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-in border"
                    style={{
                        background: 'linear-gradient(135deg, var(--w-accent), var(--w-accent-strong))',
                        borderColor: 'color-mix(in srgb, var(--w-accent) 55%, #ffffff 45%)',
                        color: '#fff',
                    }}
                >
                    <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm flex-1 leading-snug">{toast.message}</p>
                    <button
                        onClick={() => dismiss(toast.id)}
                        className="flex-shrink-0 opacity-70 hover:opacity-100 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}