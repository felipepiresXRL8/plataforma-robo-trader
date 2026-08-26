import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis do .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/trading_platform.db'),
  pythonBotUrl: process.env.PYTHON_BOT_URL || 'http://localhost:8000',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },
};
