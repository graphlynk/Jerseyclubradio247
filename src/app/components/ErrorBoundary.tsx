import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'linear-gradient(135deg, #06000F 0%, #0D001E 50%, #06000F 100%)' }}
        >
          <div className="max-w-md w-full text-center space-y-6">
            {/* Glow ring */}
            <div className="relative mx-auto w-20 h-20">
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{ boxShadow: '0 0 30px #9D00FF, 0 0 60px #9D00FF50' }}
              />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1a003a, #250050)' }}
              >
                <AlertTriangle className="w-8 h-8 text-[#FF0080]" />
              </div>
            </div>

            <div>
              <h1
                className="text-2xl font-black text-white mb-2"
                style={{ textShadow: '0 0 10px #9D00FF, 0 0 20px #9D00FF60' }}
              >
                JERSEY CLUB RADIO
              </h1>
              <p className="text-[#C084FC] font-semibold text-sm">
                Something went wrong loading the app
              </p>
            </div>

            <div className="rounded-xl p-4 text-left" style={{ background: '#0F001A', border: '1px solid #2A0060' }}>
              <p className="text-[#7B6F90] text-xs font-mono break-all">
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #9D00FF, #FF0080)',
                boxShadow: '0 0 20px rgba(157,0,255,0.4)',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>

            <p className="text-[10px] text-[#3B2F50]">
              If this keeps happening, try disabling ad blockers or clearing your cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
