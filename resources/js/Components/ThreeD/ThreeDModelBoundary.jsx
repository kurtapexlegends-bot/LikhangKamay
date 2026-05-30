import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export class ThreeDModelBoundary extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
        };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        console.error('3D model render failed.', error);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        const { hasError } = this.state;
        const { children, fallback, resetKey } = this.props;

        if (!hasError) {
            return children;
        }

        if (typeof fallback === 'function') {
            return fallback({ onRetry: this.handleRetry, resetKey });
        }

        return fallback ?? null;
    }
}

export function ThreeDModelUnavailable({
    compact = false,
    title = '3D preview unavailable',
    description = 'This 3D file is missing companion assets or could not be loaded.',
    onRetry,
    className = '',
}) {
    return (
        <div className={`flex h-full w-full items-center justify-center ${className}`}>
            <div className={`mx-auto flex max-w-xs flex-col items-center text-center ${compact ? 'px-5 py-6' : 'px-6 py-8'}`}>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <AlertTriangle size={compact ? 18 : 20} />
                </div>
                <p className={`font-bold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
                <p className={`mt-1 text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
                    >
                        <RefreshCcw size={14} />
                        Retry
                    </button>
                )}
            </div>
        </div>
    );
}
