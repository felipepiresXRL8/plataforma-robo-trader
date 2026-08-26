import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { AssetSidebar } from './components/AssetSidebar';
import { CandlestickChart } from './components/CandlestickChart';
import { RobotSignalCard } from './components/RobotSignalCard';
import { GeminiInsightCard } from './components/GeminiInsightCard';
import { TradeExecutionModal } from './components/TradeExecutionModal';
import { PortfolioModal } from './components/PortfolioModal';
import { marketApi, robotApi } from './services/api';
import { AssetSummary, HistoricalPrice, RobotAnalysisResult } from './types';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function App() {
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>('PETR4.SA');
  const [historicalPrices, setHistoricalPrices] = useState<HistoricalPrice[]>([]);
  const [timeframe, setTimeframe] = useState<string>('3M');
  const [analysis, setAnalysis] = useState<RobotAnalysisResult | null>(null);

  const [loadingAssets, setLoadingAssets] = useState<boolean>(true);
  const [loadingChart, setLoadingChart] = useState<boolean>(false);
  const [loadingRobot, setLoadingRobot] = useState<boolean>(false);

  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState<boolean>(false);

  // 1. Carrega lista de ativos
  useEffect(() => {
    async function loadAssets() {
      try {
        setLoadingAssets(true);
        const data = await marketApi.getMarketSummary();
        setAssets(data);
        if (data.length > 0 && !selectedTicker) {
          setSelectedTicker(data[0].ticker);
        }
      } catch (err) {
        console.error('Erro ao carregar resumo de mercado:', err);
      } finally {
        setLoadingAssets(false);
      }
    }
    loadAssets();
  }, []);

  // 2. Carrega histórico de preços quando o ativo ou timeframe mudar
  useEffect(() => {
    if (!selectedTicker) return;

    async function loadHistory() {
      try {
        setLoadingChart(true);
        const limitMap: Record<string, number> = {
          '1M': 30,
          '3M': 90,
          '6M': 180,
          '1A': 252,
        };
        const limit = limitMap[timeframe] || 90;
        const prices = await marketApi.getHistoricalPrices(selectedTicker, limit);
        setHistoricalPrices(prices);
      } catch (err) {
        console.error(`Erro ao carregar histórico para ${selectedTicker}:`, err);
      } finally {
        setLoadingChart(false);
      }
    }

    loadHistory();
  }, [selectedTicker, timeframe]);

  // Ativo selecionado atual
  const currentAsset = assets.find((a) => a.ticker === selectedTicker) || {
    ticker: selectedTicker,
    name: selectedTicker,
    sector: 'Ações B3',
    current_price: historicalPrices.length > 0 ? historicalPrices[historicalPrices.length - 1].close : 35.0,
    previous_close: historicalPrices.length > 1 ? historicalPrices[historicalPrices.length - 2].close : 34.0,
    daily_change: 1.0,
    daily_change_pct: 2.94,
    volume: 10000000,
    last_updated: new Date().toISOString(),
  };

  // 3. Executa o Robô Quant + Gemini
  const handleRunRobot = async () => {
    if (!selectedTicker) return;
    try {
      setLoadingRobot(true);
      const result = await robotApi.analyzeTicker(selectedTicker);
      setAnalysis(result);
    } catch (err) {
      console.error('Erro ao executar análise do robô:', err);
    } finally {
      setLoadingRobot(false);
    }
  };

  const isPositive = currentAsset.daily_change >= 0;

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col">
      {/* Top Header */}
      <Header onOpenPortfolio={() => setIsPortfolioModalOpen(true)} />

      {/* Main Home Broker Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Asset List */}
        <AssetSidebar
          assets={assets}
          selectedTicker={selectedTicker}
          onSelectTicker={(ticker) => {
            setSelectedTicker(ticker);
            setAnalysis(null); // Reseta análise anterior para novo ativo
          }}
          loading={loadingAssets}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Selected Asset Information Bar */}
          <div className="bg-[#111620] border border-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-extrabold text-white tracking-tight font-mono">
                    {currentAsset.ticker.replace('.SA', '')}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface border border-border text-slate-400 font-medium">
                    {currentAsset.sector}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{currentAsset.name}</p>
              </div>

              <div className="h-8 w-px bg-border hidden sm:block"></div>

              <div>
                <div className="text-xl font-bold font-mono text-slate-100">
                  R$ {currentAsset.current_price.toFixed(2)}
                </div>
                <div
                  className={`text-xs font-mono font-semibold flex items-center gap-1 ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>
                    {isPositive ? '+' : ''}
                    {currentAsset.daily_change.toFixed(2)} ({isPositive ? '+' : ''}
                    {currentAsset.daily_change_pct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="p-2 rounded-lg bg-surface border border-border">
                <span className="text-slate-500 block text-[10px]">Volume Negociado</span>
                <span className="font-mono text-slate-200 font-semibold">
                  {(currentAsset.volume / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="p-2 rounded-lg bg-surface border border-border">
                <span className="text-slate-500 block text-[10px]">Última Cotação</span>
                <span className="font-mono text-slate-200 font-semibold">
                  {currentAsset.last_updated ? currentAsset.last_updated.slice(0, 10) : 'Hoje'}
                </span>
              </div>
            </div>
          </div>

          {/* Candlestick & Volume Chart */}
          <CandlestickChart
            ticker={selectedTicker}
            data={historicalPrices}
            loading={loadingChart}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />

          {/* Bottom Grid: Quant Robot Signal + Gemini AI Insight */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <RobotSignalCard
              analysis={analysis}
              loading={loadingRobot}
              onRunRobot={handleRunRobot}
              onOpenTradeModal={() => setIsTradeModalOpen(true)}
            />

            <GeminiInsightCard analysis={analysis} loading={loadingRobot} />
          </div>
        </main>
      </div>

      {/* Trade Execution Modal */}
      <TradeExecutionModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        ticker={selectedTicker}
        currentPrice={currentAsset.current_price}
        analysis={analysis}
        onTradeExecuted={() => {}}
      />

      {/* Portfolio & History Modal */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
      />
    </div>
  );
}

export default App;
