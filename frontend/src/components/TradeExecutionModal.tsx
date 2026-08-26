import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { tradeApi } from '../services/api';
import { RobotAnalysisResult } from '../types';

interface TradeExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  currentPrice: number;
  analysis: RobotAnalysisResult | null;
  onTradeExecuted: () => void;
}

export const TradeExecutionModal: React.FC<TradeExecutionModalProps> = ({
  isOpen,
  onClose,
  ticker,
  currentPrice,
  analysis,
  onTradeExecuted,
}) => {
  const defaultAction = analysis?.signal.signal_type === 'SELL' ? 'SELL' : 'BUY';
  const [action, setAction] = useState<'BUY' | 'SELL'>(defaultAction);
  const [quantity, setQuantity] = useState<number>(100);
  const [price, setPrice] = useState<number>(currentPrice || 35.0);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalValue = quantity * price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await tradeApi.executeTrade({
        ticker,
        signal_id: analysis?.signal.id,
        action,
        price,
        quantity,
      });

      setSuccessMsg(`Ordem de ${action === 'BUY' ? 'COMPRA' : 'VENDA'} de ${quantity}x ${ticker} executada com sucesso!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onTradeExecuted();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Erro ao executar ordem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#151A23] border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-100 mb-1">
          Executar Ordem Simulada (Paper Trading)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Ativo: <span className="text-purple-400 font-bold">{ticker}</span> | Persistência relacional em SQLite
        </p>

        {successMsg ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-emerald-300">{successMsg}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Action Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-surface rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setAction('BUY')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  action === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                COMPRAR
              </button>
              <button
                type="button"
                onClick={() => setAction('SELL')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  action === 'SELL'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                VENDER
              </button>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Quantidade (Ações)
                </label>
                <input
                  type="number"
                  min={1}
                  step={100}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Preço Limite (R$)
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 bg-surface rounded-xl border border-border space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Valor Total da Ordem:</span>
                <span className="font-mono font-bold text-slate-100">
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {analysis && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Vínculo com Sinal:</span>
                  <span className="text-purple-300 font-mono">Sinal #{analysis.signal.id} ({analysis.signal.signal_type})</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                action === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950'
              }`}
            >
              {loading ? 'Executando Ordem...' : `Confirmar Ordem de ${action === 'BUY' ? 'Compra' : 'Venda'}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
