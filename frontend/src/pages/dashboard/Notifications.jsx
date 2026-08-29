import { useState, useEffect } from 'react';
import { Bell, Info, ShieldAlert, Calendar } from 'lucide-react';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import { notificationService } from '../../services/notificationService';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadNotifications() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const data = await notificationService.getNotifications();
        setNotifications(data || []);
      } catch (err) {
        setErrorMsg('The notification center database is offline.');
      } finally {
        setIsLoading(false);
      }
    }
    loadNotifications();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'SECURITY':
        return <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />;
      case 'ELECTION':
        return <Calendar className="h-5 w-5 text-gov-blue dark:text-gov-slate shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Notification Center</h1>
        <p className="text-xs text-slate-505">Track electoral announcements, security warnings, and verification clearances.</p>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gov-blue dark:border-gov-gold border-t-transparent"></div>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="You have no notifications or security notices at this time."
          icon={<Bell className="h-10 w-10 text-slate-300" />}
        />
      ) : (
        <Card title="Messages & Notices">
          <div className="divide-y divide-slate-100 dark:divide-slate-805">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`py-4 flex gap-3 items-start ${
                  notif.is_read ? 'opacity-60' : 'font-semibold'
                }`}
              >
                {getIcon(notif.type)}
                <div className="space-y-1 text-xs">
                  <p className="text-slate-850 dark:text-slate-200">{notif.message}</p>
                  <p className="text-[10px] text-slate-450">{notif.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
