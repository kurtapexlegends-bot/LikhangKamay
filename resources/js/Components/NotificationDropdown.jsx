import React, { useState, useRef, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Package, MessageCircle, Star, AlertTriangle, Check, MoreHorizontal, Trash2, MailOpen, Mail, Award, PackageCheck, Users, Truck, Store } from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';

export default function NotificationDropdown() {
    const { notifications = [], unreadNotificationCount = 0 } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'new_order':
                return <Package size={16} className="text-green-500" />;
            case 'new_message':
                return <MessageCircle size={16} className="text-blue-500" />;
            case 'new_review':
                return <Star size={16} className="text-yellow-500" />;
            case 'low_stock':
                return <AlertTriangle size={16} className="text-red-500" />;
            case 'sponsorship_status':
                return <Award size={16} className="text-amber-500" />;
            case 'replacement_resolution':
                return <PackageCheck size={16} className="text-teal-500" />;
            case 'team_message':
                return <Users size={16} className="text-emerald-500" />;
            case 'delivery_update':
                return <Truck size={16} className="text-indigo-500" />;
            case 'accounting_rejected':
                return <AlertTriangle size={16} className="text-red-500" />;
            case 'artisan_application':
                return <Store size={16} className="text-clay-600" />;
            default:
                return <Bell size={16} className="text-gray-500" />;
        }
    };

    const handleMarkAsRead = (id, url) => {
        router.post(route('notifications.read', id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                if (url) {
                    router.visit(url);
                }
            }
        });
    };

    const handleMarkAsUnread = (e, id) => {
        e.stopPropagation();
        router.post(route('notifications.unread', id), {}, { preserveScroll: true });
        setActiveMenu(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        router.delete(route('notifications.destroy', id), { preserveScroll: true });
        setActiveMenu(null);
    };

    const handleMarkAllAsRead = () => {
        router.post(route('notifications.read-all'), {}, {
            preserveScroll: true,
        });
    };

    const handleClearAll = () => {
        setConfirmClearOpen(true);
    };

    const confirmClearAll = () => {
        router.delete(route('notifications.clear-all'), { 
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setConfirmClearOpen(false);
            }
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-clay-600 transition-colors rounded-full hover:bg-gray-100"
            >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                        <div className="flex items-center gap-3">
                            {unreadNotificationCount > 0 && (
                                <button 
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-clay-600 hover:text-clay-700 font-medium flex items-center gap-1"
                                    title="Mark all as read"
                                >
                                    <Check size={12} /> Read All
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleClearAll}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                                    title="Delete all notifications"
                                >
                                    <Trash2 size={12} /> Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div 
                                    key={notification.id}
                                    className={`relative group p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                                        !notification.read_at ? 'bg-clay-50/30' : ''
                                    }`}
                                >
                                    <div 
                                        onClick={() => handleMarkAsRead(notification.id, notification.url)}
                                        className="flex items-start gap-3 cursor-pointer"
                                    >
                                        <div className="p-2 rounded-lg bg-gray-100 shrink-0">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-sm ${!notification.read_at ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {notification.created_at}
                                            </p>
                                        </div>
                                        {!notification.read_at && (
                                            <div className="w-2 h-2 bg-clay-500 rounded-full shrink-0 mt-2"></div>
                                        )}
                                    </div>

                                    {/* 3-Dot Menu Trigger */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === notification.id ? null : notification.id);
                                        }}
                                        className="absolute top-3 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>

                                    {/* Menu Dropdown */}
                                    {activeMenu === notification.id && (
                                        <div className="absolute top-8 right-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1 animate-in fade-in zoom-in-95 duration-100">
                                            <button
                                                onClick={(e) => notification.read_at ? handleMarkAsUnread(e, notification.id) : handleMarkAsRead(notification.id, null)}
                                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                            >
                                                {notification.read_at ? <Mail size={12} /> : <MailOpen size={12} />}
                                                {notification.read_at ? 'Mark Unread' : 'Mark Read'}
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, notification.id)}
                                                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}

            <ConfirmationModal 
                isOpen={confirmClearOpen}
                onClose={() => setConfirmClearOpen(false)}
                onConfirm={confirmClearAll}
                title="Clear All Notifications"
                message="Are you sure you want to delete all notifications? This action cannot be undone."
                icon={Trash2}
                iconBg="bg-red-100 text-red-600"
                confirmText="Yes, Clear All"
                confirmColor="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
                processing={processing}
            />
        </div>
    );
}
