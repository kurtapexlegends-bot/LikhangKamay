import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    // Staggered animation configurations
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { 
            opacity: 1, 
            y: 0, 
            transition: { type: "spring", stiffness: 260, damping: 22 } 
        }
    };

    return (
        <GuestLayout quote="Don't worry, we'll help you get back in.">
            <Head title="Reset Password" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6 pt-4"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="mb-8 text-left">
                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-clay-600 font-bold mb-2 block">Reset Channel</span>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1.5">
                        Forgot Password?
                    </h1>
                    <p className="text-stone-400 text-xs font-medium">
                        No problem! Enter your email and we'll send you a reset link.
                    </p>
                </motion.div>

                {/* Success Message */}
                {status && (
                    <motion.div 
                        variants={itemVariants}
                        className="mb-6 p-4 bg-emerald-50/80 border border-emerald-100/60 rounded-xl flex items-start gap-3 backdrop-blur-sm shadow-sm"
                    >
                        <CheckCircle size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Email Sent</p>
                            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                A password reset email has been sent. Check your inbox shortly, and if you don't see it, check your spam folder.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submit} 
                    className="space-y-5"
                >
                    <motion.div variants={itemVariants}>
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                            isFocused={true}
                            onChange={(e) => setData('email', e.target.value)}
                            floatingLabel="Email Address"
                            icon={Mail}
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <PrimaryButton 
                            className="w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-bold uppercase tracking-widest border border-stone-900 shadow-md transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden relative group" 
                            disabled={processing}
                        >
                            <span className="relative flex items-center justify-center gap-2">
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300 text-stone-300 group-hover:text-white" />
                                        <span>Send Reset Link</span>
                                    </>
                                )}
                            </span>
                        </PrimaryButton>
                    </motion.div>
                </motion.form>

                <motion.div 
                    variants={itemVariants}
                    className="mt-10 text-center border-t border-stone-100 pt-6"
                >
                    <Link 
                        href={route('login')} 
                        className="inline-flex items-center gap-2 text-xs text-stone-500 hover:text-clay-700 transition font-bold uppercase tracking-wider group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span>Back to Login</span>
                    </Link>
                </motion.div>
            </motion.div>
        </GuestLayout>
    );
}
