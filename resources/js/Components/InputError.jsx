import { AlertCircle } from 'lucide-react';

export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <div 
            {...props} 
            className={'flex items-center gap-1.5 text-sm text-red-600 animate-in fade-in slide-in-from-top-1 duration-300 ' + className}
        >
            <AlertCircle size={14} className="shrink-0" />
            <p>{message}</p>
        </div>
    ) : null;
}
