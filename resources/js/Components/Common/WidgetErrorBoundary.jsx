import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Isolated Widget Error Boundary.
 * Catches JavaScript runtime exceptions inside complex embedded widgets
 * (3D GLB canvas, interactive maps, Recharts charts) without crashing
 * the parent layout or unmounting the page.
 */
export class WidgetErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error(
            `WidgetErrorBoundary caught an error in [${this.props.widgetName || 'Embedded Widget'}]:`,
            error,
            errorInfo
        );
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        if (typeof this.props.onRetry === 'function') {
            this.props.onRetry();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return typeof this.props.fallback === 'function'
                    ? this.props.fallback({ error: this.state.error, retry: this.handleRetry })
                    : this.props.fallback;
            }

            const name = this.props.widgetName || 'Component';

            return (
                <div
                    className={`bg-stone-50 border border-stone-200/90 rounded-2xl p-6 text-center shadow-2xs flex flex-col items-center justify-center min-h-[180px] ${
                        this.props.className || ''
                    }`}
                    role="alert"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
                        <AlertCircle size={20} />
                    </div>
                    <h3 className="text-xs font-bold text-stone-800">
                        Unable to render {name}
                    </h3>
                    <p className="text-[11.5px] text-stone-500 max-w-xs mt-1 leading-relaxed">
                        This widget encountered a temporary display issue. The rest of the page remains fully active and safe.
                    </p>
                    <button
                        type="button"
                        onClick={this.handleRetry}
                        className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs"
                    >
                        <RefreshCw size={12} className="text-stone-400" />
                        <span>Reload {name}</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default WidgetErrorBoundary;
