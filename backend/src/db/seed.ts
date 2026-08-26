import { DatabaseConnection, AppDatabase } from './connection';

export const IBOVESPA_TOP_ASSETS = [
  { ticker: 'PETR4.SA', name: 'Petrobras PN', sector: 'Petróleo e Gás' },
  { ticker: 'VALE3.SA', name: 'Vale ON', sector: 'Mineração e Siderurgia' },
  { ticker: 'ITUB4.SA', name: 'Itaú Unibanco PN', sector: 'Financeiro' },
  { ticker: 'BBDC4.SA', name: 'Bradesco PN', sector: 'Financeiro' },
  { ticker: 'BBAS3.SA', name: 'Banco do Brasil ON', sector: 'Financeiro' },
  { ticker: 'WEGE3.SA', name: 'WEG ON', sector: 'Bens Industriais' },
  { ticker: 'RENT3.SA', name: 'Localiza ON', sector: 'Aluguel de Carros' },
  { ticker: 'ABEV3.SA', name: 'Ambev ON', sector: 'Bebidas' },
  { ticker: 'MGLU3.SA', name: 'Magazine Luiza ON', sector: 'Varejo' },
  { ticker: 'B3SA3.SA', name: 'B3 ON', sector: 'Serviços Financeiros' },
  { ticker: 'PRIO3.SA', name: 'PRIO ON', sector: 'Petróleo e Gás' },
  { ticker: 'RADL3.SA', name: 'RaiaDrogasil ON', sector: 'Saúde / Farmácias' },
  { ticker: 'EQTL3.SA', name: 'Equatorial Energia ON', sector: 'Utilidade Pública' },
  { ticker: 'SUZB3.SA', name: 'Suzano ON', sector: 'Papel e Celulose' },
  { ticker: 'GGBR4.SA', name: 'Gerdau PN', sector: 'Siderurgia' },
];

export async function seedDatabase(customDb?: AppDatabase): Promise<void> {
  const db = customDb || (await DatabaseConnection.getInstance());

  const insertAsset = db.prepare(`
    INSERT INTO assets (ticker, name, sector)
    VALUES (@ticker, @name, @sector)
    ON CONFLICT(ticker) DO UPDATE SET
      name = excluded.name,
      sector = excluded.sector,
      updated_at = CURRENT_TIMESTAMP
  `);

  const insertPrice = db.prepare(`
    INSERT OR REPLACE INTO historical_prices (ticker, timestamp, open, high, low, close, volume)
    VALUES (@ticker, @timestamp, @open, @high, @low, @close, @volume)
  `);

  db.transaction(() => {
    // 1. Inserir Ativos
    for (const asset of IBOVESPA_TOP_ASSETS) {
      insertAsset.run({
        '@ticker': asset.ticker,
        '@name': asset.name,
        '@sector': asset.sector,
      });
    }

    // 2. Inserir histórico inicial sintético de 90 dias para cada ativo
    const now = new Date();
    for (const asset of IBOVESPA_TOP_ASSETS) {
      let basePrice = 20.0 + Math.random() * 60.0;
      for (let i = 90; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        // Pula fins de semana
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dateStr = date.toISOString().split('T')[0];
        const changePercent = (Math.random() - 0.49) * 0.04;
        const open = basePrice;
        const close = open * (1 + changePercent);
        const high = Math.max(open, close) * (1 + Math.random() * 0.015);
        const low = Math.min(open, close) * (1 - Math.random() * 0.015);
        const volume = Math.floor(1000000 + Math.random() * 15000000);

        insertPrice.run({
          '@ticker': asset.ticker,
          '@timestamp': dateStr,
          '@open': Number(open.toFixed(2)),
          '@high': Number(high.toFixed(2)),
          '@low': Number(low.toFixed(2)),
          '@close': Number(close.toFixed(2)),
          '@volume': volume,
        });

        basePrice = close;
      }
    }
  });

  console.log(`[Seed] Inseridos ${IBOVESPA_TOP_ASSETS.length} ativos e histórico de preços com sucesso.`);
}

// Execução direta via CLI
if (require.main === module) {
  seedDatabase()
    .then(() => {
      DatabaseConnection.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
