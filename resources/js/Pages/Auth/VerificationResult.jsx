import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, LogIn, MailCheck, ShieldCheck } from 'lucide-react';

export default function VerificationResult({ status, loginEmail, isStaffAccount, signedInAsDifferentUser, currentUser }) {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,143,103,0.14),_transparent_40%),linear-gradient(180deg,#fcfaf7_0%,#f4efe7_100%)] px-4 py-12 text-stone-800 sm:px-6">
            <Head title="Email Verified" />

            <div className="mx-auto max-w-2xl">
                <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_22px_70px_-40px_rgba(120,79,46,0.45)]">
                    <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#6f4e37_0%,#8f6647_100%)] px-6 py-8 text-white sm:px-8">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16 ring-1 ring-white/20">
                            <MailCheck size={24} />
                        </div>
                        <p className="mt-5 text-xs font-bold uppercase tracking-[0.28em] text-white/70">
                            Email Verified
                        </p>
                        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                            Your verification link worked.
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-100/90">
                            {status}
                        </p>
                    </div>

                    <div className="space-y-4 px-6 py-6 sm:px-8">
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
                                <div>
                                    <p className="font-bold">Verified address</p>
                                    <p className="mt-1 break-all">{loginEmail}</p>
                                </div>
                            </div>
                        </div>

                        {isStaffAccount && (
                            <div className="rounded-2xl border border-[#E7D8C9] bg-[#FCF7F2] px-4 py-3 text-sm text-stone-700">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="mt-0.5 shrink-0 text-clay-700" size={18} />
                                    <div>
                                        <p className="font-bold text-stone-900">Next step for staff access</p>
                                        <p className="mt-1 text-sm leading-6 text-stone-600">
                                            Sign in with this staff account to continue through the first-login security steps and enter the seller workspace if access is enabled.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {signedInAsDifferentUser && currentUser && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <p className="font-bold">You are still signed in as {currentUser.name}.</p>
                                <p className="mt-1 leading-6">
                                    The verification was completed for the email above. When you&apos;re ready to use that verified account, sign out of the current session first and then sign in as the staff user.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-stone-200 bg-[#f8f3ec] px-6 py-5 sm:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-stone-600">
                                {signedInAsDifferentUser
                                    ? 'The current session was kept in place while the email was verified successfully.'
                                    : 'You can continue to sign in with the verified account whenever you&apos;re ready.'}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Link
                                    href={route('login')}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-clay-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-clay-700"
                                >
                                    <LogIn size={14} />
                                    Sign In
                                </Link>
                                <Link
                                    href={route('home')}
                                    className="inline-flex items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 transition hover:border-stone-400 hover:bg-white"
                                >
                                    Return Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
