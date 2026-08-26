import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { HistoricalPrice } from '../types';

interface CandlestickChartProps {
  ticker: string;
  data: HistoricalPrice[];
  loading: boolean;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  ticker,
  data,
  loading,
  timeframe,
  onTimeframeChange,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cria o gráfico Lightweight Charts
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E14' },
        textColor: '#94A3B8',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: '#171E2B' },
        horzLines: { color: '#171E2B' },
      },
      crosshair: {
        vertLine: { color: '#6366F1', width: 1, style: 2 },
        horzLine: { color: '#6366F1', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#232B3B',
      },
      timeScale: {
        borderColor: '#232B3B',
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
    });

    // Série de Candles
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00C076',
      downColor: '#FF4D4F',
      borderVisible: false,
      wickUpColor: '#00C076',
      wickDownColor: '#FF4D4F',
    });

    // Série de Volume (Histograma)
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Escala separada para volume no rodapé
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Atualiza os dados do gráfico quando os preços mudarem
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    // Formata candles para a biblioteca
    const formattedCandles = data.map((item) => ({
      time: item.timestamp.split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    const formattedVolumes = data.map((item) => ({
      time: item.timestamp.split('T')[0],
      value: item.volume,
      color: item.close >= item.open ? 'rgba(0, 192, 118, 0.4)' : 'rgba(255, 77, 79, 0.4)',
    }));

    candleSeriesRef.current.setData(formattedCandles);
    volumeSeriesRef.current.setData(formattedVolumes);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div className="bg-[#111620] border border-border rounded-xl p-4 flex flex-col relative overflow-hidden">
      {/* Chart Top Controls */}
      <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300">
            {ticker}
          </span>
          <span className="text-xs text-slate-400">Gráfico Histórico Diário (OHLCV)</span>
        </div>

        <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
          {['1M', '3M', '6M', '1A'].map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded transition ${
                timeframe === tf
                  ? 'bg-purple-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full h-[380px]">
        {loading && (
          <div className="absolute inset-0 bg-[#0B0E14]/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse">
              <span>Carregando dados históricos...</span>
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
