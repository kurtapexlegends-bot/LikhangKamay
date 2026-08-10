import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import SellerHeader from '@/Layouts/SellerHeader';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import {
    ArrowRight,
    PlayCircle,
    Compass,
    Plus,
    ShieldCheck,
    Camera,
    MapPin,
} from 'lucide-react';
import { themeConfig } from '@/Components/Staff/Dashboard/WorkspaceCards';
import WorkspaceTools from '@/Components/Staff/Dashboard/WorkspaceTools';
import TaskChecklist from '@/Components/Staff/Dashboard/TaskChecklist';
import ShiftConsolePanel from '@/Components/Staff/Dashboard/ShiftConsolePanel';
import MobileShiftSheet from '@/Components/Staff/Dashboard/MobileShiftSheet';
import StaffClockInModal from '@/Components/Staff/Dashboard/StaffClockInModal';
import { getDefaultChecklistForVariant } from '@/config/staffChecklists';

export default function StaffDashboard({ auth, hub }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const [activeTab, setActiveTab] = useState('tools'); // 'tools' or 'checklist'
    const [isShiftSheetOpen, setIsShiftSheetOpen] = useState(false);
    const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
    const { sellerSidebar, attendance } = usePage().props;

    // Body scroll lock when mobile shift sheet is open
    useEffect(() => {
        if (isShiftSheetOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isShiftSheetOpen]);

    const theme = themeConfig[hub.theme] || themeConfig.sky;
    const hasActiveSession = !!attendance?.has_open_session;
    const isPaused = attendance?.current_state === 'paused';

    const emphasis = useMemo(() => {
        if (hub.variant === 'hr') return 'HR and payroll operations';
        if (hub.variant === 'accounting') return 'finance approvals and release checkpoints';
        if (hub.variant === 'procurement') return 'inventory coordination and stock flow';

        return 'orders, reviews, and internal team coordination';
    }, [hub.variant]);

    const resumeWork = () => {
        setIsClockInModalOpen(true);
    };

    // Checklist logic using config preset helper
    const defaultChecklist = useMemo(() => getDefaultChecklistForVariant(hub.variant), [hub.variant]);

    const [tasks, setTasks] = useState(() => {
        if (typeof window === 'undefined') return defaultChecklist;
        try {
            const saved = window.localStorage.getItem(`staff_checklist_${auth.user.id}`);
            return saved ? JSON.parse(saved) : defaultChecklist;
        } catch {
            return defaultChecklist;
        }
    });

    const [newTaskText, setNewTaskText] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(`staff_checklist_${auth.user.id}`, JSON.stringify(tasks));
    }, [tasks, auth.user.id]);

    const handleAddTask = (e) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;
        const newTask = {
            id: Date.now().toString(),
            text: newTaskText.trim(),
            completed: false
        };
        setTasks(prev => [...prev, newTask]);
        setNewTaskText('');
    };

    const handleToggleTask = (taskId) => {
        setTasks(prev => prev.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task));
    };

    const handleDeleteTask = (taskId) => {
        setTasks(prev => prev.filter(task => task.id !== taskId));
    };

    return (
        <>
            <Head title={hub.title} />

            <SellerHeader
                title={hub.title}
                subtitle={`Focused workspace for ${emphasis}.`}
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: hub.focus, iconColor: 'text-white' }}
            />
                <main className="flex-1 px-4 pt-3 pb-24 sm:py-6 lg:pt-6 lg:px-8">
                    <div className="grid gap-6 xl:grid-cols-[1.75fr,0.85fr] items-start">
                        
                        {/* LEFT COLUMN: Main Workspace Desk */}
                        <div className="flex flex-col gap-4 lg:gap-6">

                            {/* Split Tab Container */}
                            {hasActiveSession ? (
                                <div className="rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-sm">
                                    
                                    {/* Custom Segmented Tab Headings */}
                                    <div className="bg-stone-100/60 p-1 rounded-xl flex mb-6 max-w-md mx-auto xl:max-w-none xl:mx-0 w-full relative">
                                        {[
                                            { id: 'tools', label: 'Workspace Tools' },
                                            { id: 'checklist', label: 'Daily Checklist', badge: tasks.filter(t => !t.completed).length },
                                            { id: 'console', label: 'Shift Desk', mobileOnly: true }
                                        ].map((tab) => {
                                            const isActive = activeTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={`relative flex-1 py-2 text-xs font-bold rounded-lg transition-colors duration-300 min-h-[36px] ${
                                                        tab.mobileOnly ? 'xl:hidden' : ''
                                                    } ${isActive ? 'text-stone-900' : 'text-stone-500 hover:text-stone-850'}`}
                                                >
                                                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                                                        {tab.label}
                                                        {tab.badge > 0 && (
                                                            <span className="inline-flex items-center justify-center h-4.5 min-w-[18px] px-1.5 rounded-full text-[9px] font-black bg-clay-50 text-clay-700 border border-clay-100/60">
                                                                {tab.badge}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="activeTabBackground"
                                                            className="absolute inset-0 bg-white rounded-lg shadow-sm border border-stone-200/50"
                                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* TAB 1: Tools Grid */}
                                    {activeTab === 'tools' && (
                                        <WorkspaceTools
                                            stats={hub.stats}
                                            cards={hub.cards}
                                            theme={theme}
                                        />
                                    )}

                                    {/* TAB 2: Task Checklist */}
                                    {activeTab === 'checklist' && (
                                        <TaskChecklist
                                            tasks={tasks}
                                            newTaskText={newTaskText}
                                            setNewTaskText={setNewTaskText}
                                            onAddTask={handleAddTask}
                                            onToggleTask={handleToggleTask}
                                            onDeleteTask={handleDeleteTask}
                                        />
                                    )}

                                    {/* TAB 3: Shift Desk & Info (Mobile/Tablet only) */}
                                    {activeTab === 'console' && (
                                        <div className="space-y-6 xl:hidden animate-in fade-in duration-300">
                                            {/* Mobile attendance control card */}
                                            <div className="p-5 rounded-[2rem] border border-stone-200 bg-stone-50/45">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-3">
                                                    Attendance Control
                                                </p>
                                                <StaffAttendanceDock attendance={attendance} />
                                            </div>

                                            {/* Workspace Privileges Cloud */}
                                            <div className="p-5 rounded-[2rem] border border-stone-200 bg-white">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-2.5">
                                                    Workspace Privileges
                                                </p>
                                                {(sellerSidebar?.visibleModules || hub.visibleModules || []).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(sellerSidebar?.visibleModules || hub.visibleModules || []).map((module) => (
                                                            <span
                                                                key={module}
                                                                className="rounded-lg border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-stone-600"
                                                            >
                                                                {module.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-stone-400 font-medium">Privileges will list here after clocking in.</p>
                                                )}
                                            </div>

                                            {/* Operational Reminders */}
                                            <div className="p-5 rounded-[2rem] border border-stone-200 bg-white">
                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                                    Operational Reminders
                                                </p>
                                                <h4 className="mt-1 text-xs font-bold text-stone-900 border-b border-stone-100 pb-2.5 mb-3.5">
                                                    Daily Focus Guidelines
                                                </h4>
                                                <div className="space-y-3">
                                                    {hub.highlights.map((item) => (
                                                        <div key={item} className="flex gap-3 items-start group">
                                                            <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md bg-clay-50 text-clay-600 border border-clay-100/50 transition-colors duration-300 group-hover:bg-clay-100 group-hover:text-clay-700">
                                                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                </svg>
                                                            </span>
                                                            <p className="text-xs font-medium leading-relaxed text-stone-600 group-hover:text-stone-850 transition-colors duration-300">{item}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Team Messaging */}
                                            <div className="rounded-[2rem] border border-stone-200 bg-white p-5 flex flex-col justify-between">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                                        Staff Network
                                                    </p>
                                                    <h3 className="mt-1 text-sm font-bold tracking-tight text-stone-900">
                                                        Direct Messaging
                                                    </h3>
                                                    <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                                                        Communicate securely with the shop owner and team.
                                                    </p>
                                                </div>
                                                <Link
                                                    href={route(hub.teamMessagesRoute)}
                                                    className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/80 hover:bg-stone-100 px-3.5 py-2.5 text-xs font-bold text-stone-800 transition active:scale-[0.98]"
                                                >
                                                    Access Team Inbox
                                                    <ArrowRight size={14} className="text-stone-500" />
                                                </Link>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            ) : (
                                <section className="rounded-[2.5rem] border border-stone-200/90 bg-white p-8 sm:p-12 shadow-sm animate-in fade-in duration-300 max-w-2xl mx-auto my-6 text-center">
                                    <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 shadow-xs mb-5">
                                        <ShieldCheck size={28} strokeWidth={2} />
                                    </div>
                                    
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-[10px] font-extrabold uppercase tracking-wider border border-stone-200/80 mb-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                        Workspace Offline
                                    </span>
                                    
                                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
                                        {isPaused ? 'You are currently on break.' : 'Clock in to start your shift.'}
                                    </h2>
                                    
                                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-500 max-w-md mx-auto">
                                        {isPaused
                                            ? 'Your assigned modules remain locked while you are on break. Resume your active shift to access workspace tools.'
                                            : 'Please clock in with photo and GPS location verification to unlock your workspace tools and team access.'}
                                    </p>

                                    <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-stone-600 bg-stone-50 border border-stone-200/60 rounded-xl px-4 py-2.5">
                                        <span className="flex items-center gap-1.5">
                                            <Camera size={13} className="text-clay-600" /> WebCam Selfie Proof
                                        </span>
                                        <span className="text-stone-300">•</span>
                                        <span className="flex items-center gap-1.5">
                                            <MapPin size={13} className="text-clay-600" /> GPS Geofence Verification
                                        </span>
                                    </div>

                                    <div className="mt-8 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={resumeWork}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-clay-700 hover:bg-clay-800 text-white text-sm font-bold px-8 py-3.5 shadow-md shadow-clay-700/20 active:scale-95 transition-all duration-200 min-h-[48px] w-full sm:w-auto"
                                        >
                                            <PlayCircle size={18} />
                                            {isPaused ? 'Resume Shift' : 'Clock In Now'}
                                        </button>
                                    </div>
                                </section>
                            )}

                        </div>

                        {/* RIGHT COLUMN: Console sidebar (Only when active shift is live) */}
                        {hasActiveSession && (
                            <ShiftConsolePanel
                                hasActiveSession={hasActiveSession}
                                attendance={attendance}
                                sellerSidebar={sellerSidebar}
                                hub={hub}
                            />
                        )}

                    </div>
                </main>

            {/* Checklist Floating Action Button (FAB) */}
            {hasActiveSession && activeTab === 'checklist' && (
                <button
                    onClick={() => {
                        const inputEl = document.querySelector('input[placeholder="Add a new checklist task..."]');
                        if (inputEl) {
                            inputEl.focus();
                            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }}
                    className="lg:hidden fixed bottom-20 right-4 z-40 bg-clay-700 hover:bg-clay-800 text-white rounded-full p-4 shadow-lg active:scale-90 transition-all duration-350 flex items-center justify-center"
                    title="Add new task"
                >
                    <Plus size={20} strokeWidth={2.5} />
                </button>
            )}

            {/* Mobile/Tablet Slide-Up Bottom Sheet */}
            <AnimatePresence>
                {isShiftSheetOpen && (
                    <MobileShiftSheet
                        onClose={() => setIsShiftSheetOpen(false)}
                        attendance={attendance}
                        sellerSidebar={sellerSidebar}
                        hub={hub}
                    />
                )}
            </AnimatePresence>

            {/* Sticky Shift Status & Action Dock for Mobile/Tablet (Active Shift Only) */}
            {hasActiveSession && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FDFBF9] border-t border-stone-200 px-4 py-3 shadow-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-none">Shift Session</p>
                            <p className="text-[11px] font-bold text-stone-700 mt-1">Clocked In</p>
                        </div>
                    </div>
                    
                    <button
                        type="button"
                        onClick={() => setIsShiftSheetOpen(true)}
                        className="rounded-xl px-4 py-2 text-xs font-bold text-white transition active:scale-95 duration-200 flex items-center gap-1.5 shadow-sm min-h-[38px] bg-stone-800 hover:bg-stone-900"
                    >
                        Manage Shift
                    </button>
                </div>
            )}

            <StaffClockInModal isOpen={isClockInModalOpen} onClose={() => setIsClockInModalOpen(false)} />
        </>
    );
}

StaffDashboard.layout = (page) => (
    <SellerWorkspaceLayout active="staff-dashboard">{page}</SellerWorkspaceLayout>
);
