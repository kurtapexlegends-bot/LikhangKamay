import { AlertCircle } from 'lucide-react';

export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <div 
            {...props} 
            className={'flex items-start gap-1.5 text-xs font-bold text-rose-500 animate-in fade-in slide-in-from-top-2 zoom-in-[0.98] duration-500 ease-out fill-mode-both ' + className}
        >
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{message}</p>
        </div>
    ) : null;
}
