/**
 * Logger Type Definitions
 */

export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  verbose(message: string, meta?: any): void;
  silly(message: string, meta?: any): void;
}

export interface Timer {
  stop(): number;
  getElapsed(): number;
  elapsed: number;
}

export class TimerImpl implements Timer {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  stop(): number {
    return this.getElapsed();
  }
  
  getElapsed(): number {
    return Date.now() - this.startTime;
  }
  
  get elapsed(): number {
    return this.getElapsed();
  }
}

export const logger: Logger & {
  startTimer(): Timer;
  monitoring: {
    logServiceStart(serviceName: string, method: string, data?: any): void;
    logServiceSuccess(serviceName: string, method: string, timer: Timer, result?: any): void;
    logServiceError(serviceName: string, method: string, timer: Timer, error: any): void;
  };
  errorHandling: {
    handleError(error: any, context?: any): void;
    handleSuccess(message: string, data?: any): void;
  };
  security: {
    log(message: string, level: string, meta?: any): void;
  };
  siem: {
    logSecurityEvent(event: any): void;
  };

declare module '@/utils/logger' {
  export { logger, Logger, Timer };
}
