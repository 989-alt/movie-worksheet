import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-stone-200">
            <div className="bg-red-50 p-4 rounded-full inline-block mb-4">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">오류가 발생했습니다</h1>
            <p className="text-slate-500 mb-6">
              죄송합니다. 예상치 못한 문제가 발생했습니다.<br/>
              잠시 후 다시 시도해 주세요.
            </p>
            {this.state.error && (
              <div className="bg-slate-50 p-3 rounded-lg text-left text-xs font-mono text-slate-600 mb-6 overflow-auto max-h-32 border border-slate-200">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;