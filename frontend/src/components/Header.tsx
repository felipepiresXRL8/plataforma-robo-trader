import React from 'react';
import { TrendingUp, Cpu, Sparkles, Briefcase } from 'lucide-react';

interface HeaderProps {
  onOpenPortfolio: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPortfolio }) => {
  return (
    <header className="h-16 border-b border-border bg-[#111620] px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-900/30">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-tight">Plataforma Trader Quant</h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              IA & LightGBM
            </span>
          </div>
          <p className="text-xs text-slate-400">Home Broker Quantitativo para Ações da B3</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-200">B3 Online</span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Walk-Forward ML
          </span>
        </div>

        <button
          onClick={onOpenPortfolio}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surfaceHover border border-border hover:border-slate-600 text-xs font-medium text-slate-200 transition"
        >
          <Briefcase className="w-4 h-4 text-purple-400" />
          <span>Portfólio / Ordens</span>
        </button>
      </div>
    </header>
  );
};
