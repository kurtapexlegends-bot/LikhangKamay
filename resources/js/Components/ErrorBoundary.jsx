import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You could log the error to a service like Sentry here
        console.error("Platform Error Boundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 shadow-sm border border-rose-100">
                        <AlertCircle size={40} />
                    </div>
                    
                    <h1 className="mb-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                        Something went wrong
                    </h1>
                    
                    <p className="mb-8 max-w-md text-stone-600 font-medium leading-relaxed">
                        The application encountered an unexpected error. Don't worry, your data is safe. Try refreshing the page or returning home.
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black hover:scale-105 active:scale-95"
                        >
                            <RefreshCw size={16} /> Refresh Page
                        </button>
                        
                        <a
                            href="/"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-50 hover:border-stone-300 active:scale-95"
                        >
                            <Home size={16} /> Return Home
                        </a>
                    </div>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-12 w-full max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm">
                            <div className="border-b border-stone-100 bg-stone-50 px-4 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Developer Diagnostics</p>
                            </div>
                            <div className="p-4">
                                <pre className="overflow-x-auto text-xs text-rose-600 font-mono leading-relaxed">
                                    {this.state.error?.toString()}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
