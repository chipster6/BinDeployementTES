/**
 * Event Bus Port - Dependency Inversion Interface
 * 
 * Breaks circular dependencies in service layers by providing
 * pub/sub communication instead of direct service imports.
 */

export interface EventBusPort {
  /**
   * Publish an event to a topic
   */
  publish<T>(topic: string, event: T): Promise<void>;
  
  /**
   * Subscribe to events on a topic
   */
  subscribe<T>(topic: string, handler: (event: T) => Promise<void>): void;
  
  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string, handler?: Function): void;
}

export interface ErrorReporterPort {
  /**
   * Report an error to monitoring systems
   */
  reportError(error: Error, context?: Record<string, unknown>): Promise<void>;
  
  /**
   * Report a custom event
   */
  reportEvent(event: string, data?: Record<string, unknown>): Promise<void>;
  
  /**
   * Set error context
   */
  setContext(key: string, value: unknown): void;
}