import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    // Staggered animation configurations
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
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
        <GuestLayout quote="Please confirm your password to access this secure area.">
            <Head title="Confirm Password" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6 pt-4"
            >
                {/* Header Section */}
                <motion.div variants={itemVariants} className="text-left mb-8">
                    <span className="text-[9px] font-sans tracking-[0.25em] uppercase text-clay-600 font-bold mb-2 block">Security Check</span>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight mb-1.5 font-serif">
                        Confirm Access
                    </h1>
                    <p className="text-stone-400 text-xs font-medium">
                        This is a secure area. Please verify your password to continue.
                    </p>
                </motion.div>

                {/* Form */}
                <motion.form 
                    variants={containerVariants}
                    onSubmit={submit} 
                    className="space-y-5"
                >
                    <motion.div variants={itemVariants}>
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block w-full bg-stone-50/40 hover:bg-white/80 focus:bg-white border-stone-200/80"
                            isFocused={true}
                            onChange={(e) => setData('password', e.target.value)}
                            required
                            floatingLabel="Your Password"
                            icon={Lock}
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <PrimaryButton 
                            className="relative w-full justify-center py-3 bg-stone-900 hover:bg-stone-850 border-stone-900 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md overflow-hidden group" 
                            disabled={processing}
                        >
                            <span className="relative flex items-center justify-center gap-2">
                                {processing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={14} className="text-stone-300" />
                                        <span>Confirm Access</span>
                                    </>
                                )}
                            </span>
                        </PrimaryButton>
                    </motion.div>
                </motion.form>
            </motion.div>
        </GuestLayout>
    );
}
