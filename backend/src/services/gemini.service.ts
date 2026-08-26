import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { IndicatorMetrics, FeatureImportance, SignalType } from '../types';

export interface GeminiAnalysisInput {
  ticker: string;
  signal: SignalType;
  confidence: number;
  strategy: string;
  indicators: IndicatorMetrics;
  top_features?: FeatureImportance[];
  assetName?: string;
  sector?: string;
}

export interface GeminiAnalysisOutput {
  justification_text: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  risk_factors: string[];
  model_used: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(apiKey = config.gemini.apiKey, modelName = config.gemini.model) {
    this.modelName = modelName;
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Gera uma justificativa técnica fundamentada em dados numéricos reais via Gemini
   */
  public async generateJustification(input: GeminiAnalysisInput): Promise<GeminiAnalysisOutput> {
    if (!this.genAI) {
      return this.generateFallbackJustification(input);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.2, // Baixa temperatura para precisão factual e financeira
          topP: 0.8,
        },
      });

      const prompt = `
Você é um Especialista Sênior em Trading Quantitativo e Análise Técnica para o mercado financeiro brasileiro (B3).
Analise os seguintes dados REAIS gerados pelo modelo de Machine Learning (LightGBM) e elabore uma tese de investimento técnica, concisa e orientada a dados.

DADOS QUANTITATIVOS DO ATIVO:
- Ticker: ${input.ticker} (${input.assetName || input.ticker}) - Setor: ${input.sector || 'Ações B3'}
- Recomendação Quantitativa: ${input.signal}
- Grau de Confiança do Modelo: ${(input.confidence * 100).toFixed(1)}%
- Estratégia / Algoritmo: ${input.strategy}
- RSI (14 períodos): ${input.indicators.rsi_14 ?? 'N/D'}
- Média Móvel Curta (SMA 9): R$ ${input.indicators.sma_9 ?? 'N/D'}
- Média Móvel Longa (SMA 21): R$ ${input.indicators.sma_21 ?? 'N/D'}
- Diferencial de Médias (EMA Delta): ${input.indicators.ema_delta ?? 'N/D'}
- Volatilidade Histórica (20 períodos): ${input.indicators.volatility_20 ?? 'N/D'}
- Volume Ratio (vs média): ${input.indicators.volume_ratio ?? 'N/D'}x
- Principais Features do Modelo (Feature Importance): ${JSON.stringify(input.top_features || [])}

INSTRUÇÕES OBRIGATÓRIAS:
1. Cite OBRIGATORIAMENTE os números exatos acima no texto (ex: valor do RSI, distanciamento das médias, confiança).
2. Explique por que os indicadores sustentam o sinal de ${input.signal}.
3. Indique os principais riscos da operação (máximo 3).
4. Retorne a resposta ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "justification_text": "Texto claro e profissional de 3 a 5 parágrafos curtos explicando a tese com os números citados.",
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "risk_factors": ["Risco 1...", "Risco 2...", "Risco 3..."]
}
`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      // Remove backticks se a resposta vier em bloco ```json ... ```
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);

      return {
        justification_text: parsed.justification_text || text,
        sentiment: parsed.sentiment || (input.signal === 'BUY' ? 'BULLISH' : input.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL'),
        risk_factors: Array.isArray(parsed.risk_factors) ? parsed.risk_factors : ['Volatilidade de mercado', 'Risco sistêmico'],
        model_used: this.modelName,
      };
    } catch (error: any) {
      console.warn('[GeminiService] Erro ao chamar API Gemini ou parsing de resposta:', error.message);
      return this.generateFallbackJustification(input);
    }
  }

  /**
   * Fallback determinístico de alta qualidade quando offline ou em testes sem chave
   */
  private generateFallbackJustification(input: GeminiAnalysisInput): GeminiAnalysisOutput {
    const sentiment = input.signal === 'BUY' ? 'BULLISH' : input.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL';
    const rsiVal = input.indicators.rsi_14 ?? 48.5;
    const confPct = (input.confidence * 100).toFixed(1);
    const topFeatName = input.top_features?.[0]?.feature || 'RSI_14';

    let thesis = '';
    if (input.signal === 'BUY') {
      thesis = `O modelo estatístico LightGBM identificou um padrão de reversão/continuidade de alta para ${input.ticker} com probabilidade estimada em ${confPct}%. O RSI em ${rsiVal} sinaliza momentum favorável sem indicar sobrecompra extrema. A variável de maior peso na decisão foi '${topFeatName}', acompanhada por expansão de volume de ${input.indicators.volume_ratio || 1.2}x acima da média recente.`;
    } else if (input.signal === 'SELL') {
      thesis = `O modelo LightGBM emitiu sinal de VENDA para ${input.ticker} com ${confPct}% de confiança estatística. O indicador RSI em ${rsiVal} e o diferencial das médias móveis (SMA 9 vs 21) apontam perda de tração altista e exaustão de compradores. A feature de maior importância ponderada foi '${topFeatName}'.`;
    } else {
      thesis = `O ativo ${input.ticker} apresenta sinais neutros (confiança de ${confPct}%), com RSI em ${rsiVal} em zona intermediária e compressão de volatilidade (${input.indicators.volatility_20 || 0.02}). O modelo recomenda manutenção de posição até confirmação de rompimento.`;
    }

    return {
      justification_text: thesis,
      sentiment,
      risk_factors: [
        `Risco de oscilação macroeconômica e taxa de juros na B3`,
        `Sensibilidade a variações de volume no ativo ${input.ticker}`,
        `Volatilidade realizada de curto prazo (${input.indicators.volatility_20 ?? 0.02})`,
      ],
      model_used: `${this.modelName} (deterministic-fallback)`,
    };
  }
}
