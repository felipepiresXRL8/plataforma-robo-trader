import React from 'react';
import { Sparkles, Brain, AlertTriangle } from 'lucide-react';
import { RobotAnalysisResult } from '../types';

interface GeminiInsightCardProps {
  analysis: RobotAnalysisResult | null;
  loading: boolean;
}

export const GeminiInsightCard: React.FC<GeminiInsightCardProps> = ({
  analysis,
  loading,
}) => {
  const justification = analysis?.ai_justification;

  return (
    <div className="bg-[#111620] border border-border rounded-xl p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 shadow-sm shadow-purple-950">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Agente de IA Explicativo</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-900/50 text-purple-300 border border-purple-700/50 font-mono">
                  Gemini API
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Tese de investimento fundamentada em dados reais</p>
            </div>
          </div>

          {justification && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                justification.sentiment === 'BULLISH'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : justification.sentiment === 'BEARISH'
                  ? 'bg-rose-950/50 border-rose-500/50 text-rose-300'
                  : 'bg-amber-950/50 border-amber-500/50 text-amber-300'
              }`}
            >
              Sentimento: {justification.sentiment}
            </span>
          )}
        </div>

        {/* AI Justification Content */}
        {loading ? (
          <div className="py-8 space-y-3 animate-pulse">
            <div className="h-4 bg-surface rounded w-3/4"></div>
            <div className="h-4 bg-surface rounded w-full"></div>
            <div className="h-4 bg-surface rounded w-5/6"></div>
            <div className="h-4 bg-surface rounded w-2/3"></div>
          </div>
        ) : justification ? (
          <div className="space-y-4">
            {/* Thesis Text */}
            <div className="p-4 rounded-xl bg-surface/70 border border-border text-xs leading-relaxed text-slate-200 font-sans">
              <p className="whitespace-pre-line">{justification.text}</p>
            </div>

            {/* Risk Factors */}
            {justification.risk_factors && justification.risk_factors.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400/90 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Fatores de Risco & Atenção</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {justification.risk_factors.map((risk, index) => (
                    <span
                      key={index}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-amber-950/30 border border-amber-800/40 text-amber-300/90 flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      {risk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
            <Brain className="w-10 h-10 text-slate-600 mb-2 opacity-50" />
            <p>A justificativa da IA com base nos indicadores numéricos aparecerá aqui assim que o robô for acionado.</p>
          </div>
        )}
      </div>

      {justification && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-slate-500">
          <span>Modelo: {justification.model}</span>
          <span>Contexto: Ingestão de Features Reais</span>
        </div>
      )}
    </div>
  );
};
