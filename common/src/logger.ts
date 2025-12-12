/**
 * Structured Logger for microservices
 * Best practice logging format cho production-ready applications
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  [key: string]: any
}

export class Logger {
  private application: string
  private service: string

  constructor(application: string, service?: string) {
    this.application = application
    this.service = service || application
  }

  /**
   * Format log entry theo structured logging best practice
   */
  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      application: this.application,
      service: this.service,
      message,
      ...context
    }

    return JSON.stringify(logEntry)
  }

  debug(message: string, context?: LogContext): void {
    console.log(this.formatLog(LogLevel.DEBUG, message, context))
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog(LogLevel.INFO, message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog(LogLevel.WARN, message, context))
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = error instanceof Error 
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          ...context
        }
      : { error, ...context }

    console.error(this.formatLog(LogLevel.ERROR, message, errorContext))
  }

  /**
   * Log Kafka event consumed
   */
  kafkaEventReceived(topic: string, event: any, context?: LogContext): void {
    this.info('Kafka event received', {
      event_type: 'kafka.consumed',
      topic,
      event_name: event.type || 'unknown',
      ...context
    })
  }

  /**
   * Log Kafka event published
   */
  kafkaEventPublished(topic: string, event: any, context?: LogContext): void {
    this.info('Kafka event published', {
      event_type: 'kafka.published',
      topic,
      event_name: event.type || 'unknown',
      ...context
    })
  }

  /**
   * Log Kafka event processing started
   */
  kafkaEventProcessing(topic: string, event: any, context?: LogContext): void {
    this.info('Processing Kafka event', {
      event_type: 'kafka.processing',
      topic,
      event_name: event.type || 'unknown',
      ...context
    })
  }

  /**
   * Log Kafka event processing completed
   */
  kafkaEventProcessed(topic: string, event: any, duration?: number, context?: LogContext): void {
    this.info('Kafka event processed successfully', {
      event_type: 'kafka.processed',
      topic,
      event_name: event.type || 'unknown',
      duration_ms: duration,
      ...context
    })
  }

  /**
   * Log Kafka event processing failed
   */
  kafkaEventFailed(topic: string, event: any, error: Error, context?: LogContext): void {
    this.error('Kafka event processing failed', error, {
      event_type: 'kafka.failed',
      topic,
      event_name: event.type || 'unknown',
      ...context
    })
  }
}

/**
 * Create logger instance cho service
 */
export const createLogger = (application: string, service?: string): Logger => {
  return new Logger(application, service)
}
