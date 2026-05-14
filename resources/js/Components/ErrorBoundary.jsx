import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You could log the error to an external service here
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#FDFBF9] flex items-center justify-center p-4 font-sans">
                    <div className="max-w-md w-full bg-white rounded-3xl border border-clay-100 p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto shadow-inner">
                            <AlertTriangle size={40} />
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Something went wrong</h2>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                A critical component encountered an error. Our team has been notified.
                            </p>
                        </div>

                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-left">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Error Trace</p>
                            <p className="text-xs font-mono text-red-500 line-clamp-3 leading-tight">
                                {this.state.error?.toString() || 'Unknown runtime error'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-clay-600 text-white rounded-xl font-bold text-sm hover:bg-clay-700 transition-all active:scale-95 shadow-lg shadow-clay-600/20"
                            >
                                <RefreshCcw size={16} />
                                Reload
                            </button>
                            <a
                                href="/"
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
                            >
                                <Home size={16} />
                                Home
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
