import React, { useState, useEffect } from 'react';
import enhancedApiService from '../services/enhancedApiService';
import NotificationBadge from './NotificationBadge';
import { devLogger } from '../utils/logger';


interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

interface NotificationPanelProps {
  userRole: string;
  onNotificationClick?: (link?: string) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ userRole, onNotificationClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await enhancedApiService.get<Notification[]>('/notifications', { skipCache: true });
      devLogger.log(`✅ NotificationPanel - ${data.length} notifications chargées pour ${userRole}`);
      setNotifications(data || []);
    } catch (error) {
      console.error('❌ NotificationPanel - Erreur lors de la récupération des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await enhancedApiService.get<{ count: number }>('/notifications/unread-count', {
        skipCache: true,
      });
      const count = data.count || 0;
      devLogger.log(`✅ NotificationPanel - ${count} notifications non lues pour ${userRole}`);
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ NotificationPanel - Erreur lors de la récupération du compteur:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await enhancedApiService.post(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await enhancedApiService.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await fetchUnreadCount();
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    if (onNotificationClick && notification.link) {
      onNotificationClick(notification.link);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <NotificationBadge count={unreadCount} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadNotifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Chargement...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Aucune notification</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      notification.isRead ? '' : 'bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                          notification.isRead ? 'bg-transparent' : 'bg-blue-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            notification.isRead ? 'text-gray-600' : 'text-gray-900'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationPanel;
