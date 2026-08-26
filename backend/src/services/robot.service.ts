import { SignalRepository } from '../repositories/signal.repository';
import { JustificationRepository } from '../repositories/justification.repository';
import { AssetRepository } from '../repositories/asset.repository';
import { PythonBotClient } from '../clients/python-bot.client';
import { GeminiService } from './gemini.service';
import { RobotAnalysisResponseDTO, TradeSignal, AIJustification } from '../types';

export class RobotService {
  private signalRepo: SignalRepository;
  private justificationRepo: JustificationRepository;
  private assetRepo: AssetRepository;
  private pythonBotClient: PythonBotClient;
  private geminiService: GeminiService;

  constructor(
    signalRepo: SignalRepository,
    justificationRepo: JustificationRepository,
    assetRepo: AssetRepository,
    pythonBotClient: PythonBotClient,
    geminiService: GeminiService
  ) {
    this.signalRepo = signalRepo;
    this.justificationRepo = justificationRepo;
    this.assetRepo = assetRepo;
    this.pythonBotClient = pythonBotClient;
    this.geminiService = geminiService;
  }

  /**
   * Pipeline completo: Robô Estatístico (LightGBM) -> Persistência SQL -> Agente Gemini -> Persistência SQL
   */
  public async analyzeAndGenerateJustification(ticker: string): Promise<RobotAnalysisResponseDTO> {
    const formattedTicker = ticker.toUpperCase().trim();
    const asset = this.assetRepo.findByTicker(formattedTicker);

    // 1. Executa o Robô Estatístico Python (LightGBM)
    const botResult = await this.pythonBotClient.analyzeTicker(formattedTicker);

    // 2. Persiste o Sinal no SQLite
    const savedSignal = this.signalRepo.create({
      ticker: formattedTicker,
      signal_type: botResult.signal,
      confidence: botResult.confidence,
      strategy: botResult.strategy,
      features: {
        indicators: botResult.indicators,
        top_features: botResult.top_features,
        raw: botResult.historical_metrics,
      },
    });

    // 3. Chama o Agente de IA (Gemini) com os dados quantitativos reais
    const aiResult = await this.geminiService.generateJustification({
      ticker: formattedTicker,
      signal: botResult.signal,
      confidence: botResult.confidence,
      strategy: botResult.strategy,
      indicators: botResult.indicators,
      top_features: botResult.top_features,
      assetName: asset?.name,
      sector: asset?.sector,
    });

    // 4. Persiste a Justificativa no SQLite vinculada ao sinal
    const savedJustification = this.justificationRepo.create({
      signal_id: savedSignal.id!,
      ticker: formattedTicker,
      justification_text: aiResult.justification_text,
      model_used: aiResult.model_used,
      sentiment: aiResult.sentiment,
      risk_factors: aiResult.risk_factors,
    });

    // 5. Retorna o DTO consolidado
    return {
      ticker: formattedTicker,
      signal: {
        id: savedSignal.id!,
        signal_type: savedSignal.signal_type,
        confidence: savedSignal.confidence,
        strategy: savedSignal.strategy,
        indicators: savedSignal.features.indicators,
        top_features: savedSignal.features.top_features || [],
        created_at: savedSignal.created_at,
      },
      ai_justification: {
        id: savedJustification.id!,
        text: savedJustification.justification_text,
        sentiment: savedJustification.sentiment,
        risk_factors: savedJustification.risk_factors,
        model: savedJustification.model_used,
        created_at: savedJustification.created_at,
      },
    };
  }

  public async getLatestSignal(ticker: string): Promise<{
    signal: TradeSignal | null;
    justification: AIJustification | null;
  }> {
    const formattedTicker = ticker.toUpperCase().trim();
    const signal = this.signalRepo.findLatestByTicker(formattedTicker);
    let justification: AIJustification | null = null;
    if (signal?.id) {
      justification = this.justificationRepo.findBySignalId(signal.id);
    }
    return { signal, justification };
  }

  public async getAllSignals(limit = 50, offset = 0): Promise<TradeSignal[]> {
    return this.signalRepo.findAll(limit, offset);
  }
}
