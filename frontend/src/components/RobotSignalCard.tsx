import React from 'react';
import { Play, Bot, BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RobotAnalysisResult } from '../types';

interface RobotSignalCardProps {
  analysis: RobotAnalysisResult | null;
  loading: boolean;
  onRunRobot: () => void;
  onOpenTradeModal: () => void;
}

export const RobotSignalCard: React.FC<RobotSignalCardProps> = ({
  analysis,
  loading,
  onRunRobot,
  onOpenTradeModal,
}) => {
  const signalType = analysis?.signal.signal_type;
  const confidence = analysis ? (analysis.signal.confidence * 100).toFixed(1) : null;
  const indicators = analysis?.signal.indicators;
  const topFeatures = analysis?.signal.top_features || [];

  return (
    <div className="bg-[#111620] border border-border rounded-xl p-5 flex flex-col justify-between">
      {/* Top Header & Run Button */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Robô Trader Quant</h3>
              <p className="text-[11px] text-slate-400">Modelo LightGBM com Walk-Forward</p>
            </div>
          </div>

          <button
            onClick={onRunRobot}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition shadow-md ${
              loading
                ? 'bg-purple-900/50 text-purple-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/30'
            }`}
          >
            {loading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                <span>Analisando...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Rodar Robô</span>
              </>
            )}
          </button>
        </div>

        {/* Signal Content */}
        {analysis ? (
          <div className="space-y-4">
            {/* Recommendation Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                signalType === 'BUY'
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : signalType === 'SELL'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-surface/80">
                  {signalType === 'BUY' ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : signalType === 'SELL' ? (
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Minus className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider font-semibold opacity-80">
                    Recomendação Quantitativa
                  </div>
                  <div className="text-lg font-extrabold tracking-tight">
                    {signalType === 'BUY' ? 'SINAL DE COMPRA' : signalType === 'SELL' ? 'SINAL DE VENDA' : 'MANTER / NEUTRO'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] opacity-80 font-medium">Confiança Estatística</div>
                <div className="text-base font-mono font-bold">{confidence}%</div>
              </div>
            </div>

            {/* Technical Indicators Grid */}
            {indicators && (
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-slate-400 font-medium">RSI (14)</div>
                  <div className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                    {indicators.rsi_14 ?? 'N/D'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {indicators.rsi_14 && indicators.rsi_14 < 35
                      ? 'Sobrevendido'
                      : indicators.rsi_14 && indicators.rsi_14 > 65
                      ? 'Sobrecomprado'
                      : 'Neutro'}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-slate-400 font-medium">Spread EMA (9/21)</div>
                  <div className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                    {indicators.ema_delta !== undefined ? `${indicators.ema_delta > 0 ? '+' : ''}${indicators.ema_delta}%` : 'N/D'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Diferencial Médias</div>
                </div>

                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-slate-400 font-medium">Volatilidade (20d)</div>
                  <div className="text-sm font-mono font-bold text-slate-100 mt-0.5">
                    {indicators.volatility_20 !== undefined ? `${(indicators.volatility_20 * 100).toFixed(1)}%` : 'N/D'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Realizada Anualizada</div>
                </div>
              </div>
            )}

            {/* Feature Importance List */}
            {topFeatures.length > 0 && (
              <div className="p-3 rounded-lg bg-surface/50 border border-border">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Variáveis com Maior Peso na Árvore (Feature Importance)</span>
                </div>
                <div className="space-y-1.5">
                  {topFeatures.slice(0, 3).map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400 text-[11px]">{feat.feature}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, feat.importance * 100 * 2.5)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-slate-300 text-[11px] w-8 text-right">
                          {(feat.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <Bot className="w-10 h-10 text-slate-600 mb-2 opacity-50" />
            <p>Selecione o ativo e clique em <strong>"Rodar Robô"</strong> para calcular a decisão com o modelo LightGBM.</p>
          </div>
        )}
      </div>

      {/* Action Button to execute paper trade */}
      {analysis && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-slate-400">Pronto para simular?</span>
          <button
            onClick={onOpenTradeModal}
            className="px-3.5 py-1.5 rounded-lg bg-surfaceHover hover:bg-slate-700 border border-border text-xs font-semibold text-purple-300 hover:text-white transition"
          >
            Executar Ordem Simulada
          </button>
        </div>
      )}
    </div>
  );
};
