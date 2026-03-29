import { Head } from '@inertiajs/react';
import { StaffResumePromptCard } from '@/Components/StaffResumePrompt';

export default function StaffResumePrompt({ resumePrompt }) {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(196,143,103,0.14),_transparent_38%),linear-gradient(180deg,#fcfaf7_0%,#f4efe7_100%)] px-4 py-10 font-sans text-stone-800 sm:px-6">
            <Head title="Resume Staff Time" />

            <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
                <StaffResumePromptCard prompt={resumePrompt} />
            </div>
        </div>
    );
}
