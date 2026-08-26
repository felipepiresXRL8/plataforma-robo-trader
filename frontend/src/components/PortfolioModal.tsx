import React, { useEffect, useState } from 'react';
import { X, Briefcase, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { tradeApi } from '../services/api';
import { Trade, PortfolioSummary } from '../types';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tradesData, summaryData] = await Promise.all([
        tradeApi.getTrades(),
        tradeApi.getPortfolio(),
      ]);
      setTrades(tradesData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Erro ao carregar dados do portfólio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151A23] border border-border rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Portfólio & Histórico de Ordens</h3>
              <p className="text-xs text-slate-400">Ordens simuladas persistidas no banco SQL</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-surface hover:bg-surfaceHover text-slate-400 hover:text-white transition border border-border"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-surface hover:bg-surfaceHover text-slate-400 hover:text-white transition border border-border"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Portfolio Stats Cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3 bg-surface rounded-xl border border-border">
              <div className="text-[11px] text-slate-400 font-medium">Total de Ordens</div>
              <div className="text-lg font-mono font-bold text-slate-100 mt-0.5">
                {summary.total_trades}
              </div>
            </div>
            <div className="p-3 bg-surface rounded-xl border border-border">
              <div className="text-[11px] text-emerald-400 font-medium">Volume Compras</div>
              <div className="text-lg font-mono font-bold text-emerald-300 mt-0.5">
                R$ {summary.total_buy_volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 bg-surface rounded-xl border border-border">
              <div className="text-[11px] text-rose-400 font-medium">Volume Vendas</div>
              <div className="text-lg font-mono font-bold text-rose-300 mt-0.5">
                R$ {summary.total_sell_volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Trades Table */}
        <div className="flex-1 overflow-y-auto border border-border rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface/80 text-slate-400 border-b border-border font-semibold text-[11px]">
                <th className="py-2.5 px-3">Data/Hora</th>
                <th className="py-2.5 px-3">Ativo</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-right">Qtd</th>
                <th className="py-2.5 px-3 text-right">Preço</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans text-xs">
                    Nenhuma ordem executada ainda.
                  </td>
                </tr>
              ) : (
                trades.map((trade) => {
                  const isBuy = trade.action === 'BUY';
                  const total = trade.price * trade.quantity;

                  return (
                    <tr key={trade.id} className="hover:bg-surfaceHover/50 transition">
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                        {trade.executed_at.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-200">
                        {trade.ticker.replace('.SA', '')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBuy
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isBuy ? 'COMPRA' : 'VENDA'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{trade.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">R$ {trade.price.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                        R$ {total.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-slate-400">
                          {trade.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
