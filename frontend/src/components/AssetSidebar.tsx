import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { AssetSummary } from '../types';

interface AssetSidebarProps {
  assets: AssetSummary[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  loading: boolean;
}

export const AssetSidebar: React.FC<AssetSidebarProps> = ({
  assets,
  selectedTicker,
  onSelectTicker,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = assets.filter(
    (asset) =>
      asset.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-80 h-[calc(100vh-4rem)] border-r border-border bg-[#111620] flex flex-col flex-shrink-0">
      {/* Search Bar */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ticker (ex: PETR4, VALE3)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1A212D] border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      {/* Asset List Header */}
      <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-border bg-surface/50 uppercase tracking-wider">
        <span>Ativo / Nome</span>
        <span>Preço / Variação</span>
      </div>

      {/* Vertical Asset List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500 animate-pulse">
            Carregando ativos da B3...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Nenhum ativo encontrado.
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isSelected = asset.ticker === selectedTicker;
            const isPositive = asset.daily_change >= 0;

            return (
              <button
                key={asset.ticker}
                onClick={() => onSelectTicker(asset.ticker)}
                className={`w-full px-4 py-3 text-left flex items-center justify-between transition group relative ${
                  isSelected
                    ? 'bg-purple-950/40 border-l-4 border-l-purple-500'
                    : 'hover:bg-surfaceHover/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-100 group-hover:text-purple-300 transition">
                      {asset.ticker.replace('.SA', '')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-slate-400">
                      B3
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
                    {asset.name}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold font-mono text-slate-100">
                    R$ {asset.current_price.toFixed(2)}
                  </div>
                  <div
                    className={`text-[11px] font-mono font-medium flex items-center justify-end gap-0.5 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}
                      {asset.daily_change_pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
