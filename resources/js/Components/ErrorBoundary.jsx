import React from 'react';
import { AlertCircle, RefreshCw, Home, Terminal, ChevronDown } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Platform Error Boundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            const isLocalOrDev = Boolean(
                (typeof import.meta !== 'undefined' && (import.meta.env?.DEV || import.meta.env?.MODE === 'development')) ||
                (typeof window !== 'undefined' && (
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.endsWith('.test') ||
                    window.location.port === '8000' ||
                    window.location.port === '5173'
                ))
            );

            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF9] px-4 py-12 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 shadow-sm border border-rose-100">
                        <AlertCircle size={40} />
                    </div>
                    
                    <h1 className="mb-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                        Something went wrong
                    </h1>
                    
                    <p className="mb-8 max-w-md text-stone-600 font-medium leading-relaxed text-sm">
                        The application encountered an unexpected error. Don't worry, your data is safe. Try refreshing the page or returning home.
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black active:scale-95 shadow-sm"
                        >
                            <RefreshCw size={16} /> Refresh Page
                        </button>
                        
                        <a
                            href="/"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-50 hover:border-stone-300 active:scale-95 shadow-2xs"
                        >
                            <Home size={16} /> Return Home
                        </a>
                    </div>

                    {/* Developer Diagnostics Box */}
                    <div className="mt-10 w-full max-w-2xl text-left">
                        <details 
                            open={isLocalOrDev} 
                            className="group rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden"
                        >
                            <summary className="flex cursor-pointer items-center justify-between bg-stone-50/80 px-4 py-3 text-xs font-bold text-stone-700 hover:bg-stone-100/80 transition select-none border-b border-stone-100">
                                <span className="flex items-center gap-2">
                                    <Terminal size={14} className="text-amber-600" />
                                    <span>Developer Diagnostics</span>
                                </span>
                                <span className="text-[11px] font-mono text-stone-400 font-normal">
                                    {isLocalOrDev ? 'Local/Dev Mode' : 'Click to inspect'}
                                </span>
                            </summary>

                            <div className="p-4 space-y-3 bg-[#FAF8F5]">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 font-mono">
                                        Error Message
                                    </p>
                                    <pre className="mt-1 overflow-x-auto rounded-xl border border-rose-100 bg-white p-3 font-mono text-xs text-rose-600 leading-relaxed shadow-2xs">
                                        {this.state.error?.toString() || 'Unknown runtime error'}
                                    </pre>
                                </div>

                                {this.state.error?.stack && (
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                                            Stack Trace
                                        </p>
                                        <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-stone-200/80 bg-white p-3 font-mono text-[11px] text-stone-700 leading-relaxed shadow-2xs">
                                            {this.state.error.stack}
                                        </pre>
                                    </div>
                                )}

                                {this.state.errorInfo?.componentStack && (
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                                            Component Hierarchy
                                        </p>
                                        <pre className="mt-1 max-h-40 overflow-auto rounded-xl border border-stone-200/80 bg-white p-3 font-mono text-[11px] text-stone-600 leading-relaxed shadow-2xs">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </details>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
