/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DesignQuest caught error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-950 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                DesignQuest Recovery System
              </span>
              <h1 className="font-display font-black text-2xl text-white">
                Mission Restored
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                A browser glitch was safely isolated so your data is protected. Click below to continue your engineering journey!
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                onClick={this.handleReload}
                className="game-btn px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <button
                onClick={this.handleReset}
                className="game-btn px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-display font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <span>Reset Data & Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
