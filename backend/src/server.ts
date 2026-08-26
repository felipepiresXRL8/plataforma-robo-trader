import { createApp } from './app';
import { config } from './config';
import { seedDatabase } from './db/seed';

async function bootstrap() {
  try {
    const { app, repositories, db } = await createApp();

    // Executa auto-seed se a tabela de ativos estiver vazia
    const assetCount = repositories.assetRepo.count();
    if (assetCount === 0) {
      console.log('[Server] Banco de dados vazio. Executando seed inicial com ativos do Ibovespa...');
      await seedDatabase(db);
    }

    app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Servidor Backend rodando em http://localhost:${config.port}`);
      console.log(`📊 Ambiente: ${config.nodeEnv}`);
      console.log(`🤖 Integração Gemini: ${config.gemini.apiKey ? 'Ativa' : 'Modo Fallback'}`);
      console.log(`📈 Python Bot URL: ${config.pythonBotUrl}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('[Server Bootstrap Error]', error);
    process.exit(1);
  }
}

bootstrap();
