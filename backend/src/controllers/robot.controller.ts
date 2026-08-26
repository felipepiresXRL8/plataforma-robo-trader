import { Request, Response, NextFunction } from 'express';
import { RobotService } from '../services/robot.service';

export class RobotController {
  private robotService: RobotService;

  constructor(robotService: RobotService) {
    this.robotService = robotService;
  }

  public analyzeTicker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticker = String(req.params.ticker);
      const result = await this.robotService.analyzeAndGenerateJustification(ticker);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  public getLatestSignal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticker = String(req.params.ticker);
      const result = await this.robotService.getLatestSignal(ticker);
      if (!result.signal) {
        res.status(404).json({ error: `Nenhum sinal gerado para o ativo ${ticker.toUpperCase()}` });
        return;
      }
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  public getAllSignals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const signals = await this.robotService.getAllSignals(limit, offset);
      res.json({ data: signals });
    } catch (error) {
      next(error);
    }
  };
}
