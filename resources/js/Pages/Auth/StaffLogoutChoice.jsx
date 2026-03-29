import { Head, router } from '@inertiajs/react';
import { Clock, LogOut, PauseCircle } from 'lucide-react';

const formatClockIn = (value) => {
    if (!value) {
        return 'No active session found.';
    }

    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
};

export default function StaffLogoutChoice({ attendance }) {
    const submit = (action) => {
        router.post(route('staff.logout'), { action });
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] px-4 py-10 font-sans text-stone-800 sm:px-6">
            <Head title="End Staff Session" />

            <div className="mx-auto max-w-2xl">
                <div className="rounded-[2rem] border border-stone-200 bg-white shadow-[0_24px_80px_-45px_rgba(120,79,46,0.45)]">
                    <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#6f4e37_0%,#8f6647_100%)] px-6 py-8 text-white sm:px-8">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                            <Clock size={24} />
                        </div>
                        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                            Attendance Session
                        </p>
                        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                            Choose how to end this sign-in
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-100/90">
                            Staff attendance is tracked from login until you choose whether to pause the current workday or fully clock out.
                        </p>
                    </div>

                    <div className="space-y-6 px-6 py-6 sm:px-8">
                        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-stone-400">
                                Current Session
                            </p>
                            <p className="mt-2 text-lg font-bold text-stone-900">
                                {attendance?.has_open_session ? 'Clocked In' : 'Already Closed'}
                            </p>
                            <p className="mt-1 text-sm text-stone-500">
                                Started: {formatClockIn(attendance?.clock_in_at)}
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => submit('pause')}
                                className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-5 py-5 text-left transition hover:border-amber-300 hover:bg-amber-100"
                            >
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm">
                                    <PauseCircle size={22} />
                                </div>
                                <h2 className="mt-4 text-xl font-bold text-amber-900">Pause Time</h2>
                                <p className="mt-2 text-sm leading-6 text-amber-800">
                                    End the current session now and start a fresh session automatically the next time you log in today.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => submit('clock_out')}
                                className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-5 text-left transition hover:border-red-300 hover:bg-red-100"
                            >
                                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-700 shadow-sm">
                                    <LogOut size={22} />
                                </div>
                                <h2 className="mt-4 text-xl font-bold text-red-900">Clock Out</h2>
                                <p className="mt-2 text-sm leading-6 text-red-800">
                                    End this attendance session as the final clock-out action for now and sign out of the workspace.
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
