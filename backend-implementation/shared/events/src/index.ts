/**
 * ============================================================================
 * SHARED EVENTS - DOMAIN EVENTS & EVENT SOURCING
 * ============================================================================
 * 
 * Event-driven communication infrastructure for inter-service communication.
 * Implements outbox pattern, event versioning, and reliable event delivery.
 */

import EventEmitter from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import type { 
  DomainEvent,
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  BinCreatedEvent,
  BinCapacityUpdatedEvent,
  BinCollectedEvent,
  RouteOptimizedEvent,
  ServiceOrderScheduledEvent,
  PickupCompletedEvent,
  PaymentProcessedEvent,
  TraceContext
} from '@waste-mgmt/types';

// =============================================================================
// EVENT STORE INTERFACE
// =============================================================================

export interface EventStore {
  append(events: DomainEvent[]): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]>;
  getEventsByType(eventType: string, fromTimestamp?: string): Promise<DomainEvent[]>;
  getAllEvents(fromTimestamp?: string, limit?: number): Promise<DomainEvent[]>;
}

// =============================================================================
// OUTBOX PATTERN IMPLEMENTATION
// =============================================================================

export interface OutboxEvent {
  id: string;
  aggregate_id: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: string;
  processed_at?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface OutboxStore {
  insert(events: OutboxEvent[]): Promise<void>;
  getPendingEvents(limit?: number): Promise<OutboxEvent[]>;
  markAsProcessed(eventIds: string[]): Promise<void>;
  markAsFailed(eventId: string, error: string): Promise<void>;
  incrementRetry(eventId: string): Promise<void>;
}

// =============================================================================
// IN-MEMORY IMPLEMENTATIONS (FOR DEVELOPMENT)
// =============================================================================

export class InMemoryEventStore implements EventStore {
  private events: DomainEvent[] = [];

  async append(events: DomainEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<DomainEvent[]> {
    return this.events
      .filter(event => event.aggregate_id === aggregateId)
      .filter(event => {
        if (fromVersion === undefined) return true;
        const eventVersion = parseInt(event.event_version);
        return eventVersion >= fromVersion;
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getEventsByType(eventType: string, fromTimestamp?: string): Promise<DomainEvent[]> {
    return this.events
      .filter(event => event.event_type === eventType)
      .filter(event => {
        if (!fromTimestamp) return true;
        return event.timestamp >= fromTimestamp;
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getAllEvents(fromTimestamp?: string, limit?: number): Promise<DomainEvent[]> {
    let filtered = this.events;
    
    if (fromTimestamp) {
      filtered = filtered.filter(event => event.timestamp >= fromTimestamp);
    }
    
    filtered.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    return filtered;
  }
}

export class InMemoryOutboxStore implements OutboxStore {
  private events: OutboxEvent[] = [];

  async insert(events: OutboxEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async getPendingEvents(limit: number = 100): Promise<OutboxEvent[]> {
    return this.events
      .filter(event => 
        event.status === 'pending' && 
        (!event.next_retry_at || new Date(event.next_retry_at) <= new Date())
      )
      .slice(0, limit);
  }

  async markAsProcessed(eventIds: string[]): Promise<void> {
    for (const event of this.events) {
      if (eventIds.includes(event.id)) {
        event.status = 'completed';
        event.processed_at = new Date().toISOString();
      }
    }
  }

  async markAsFailed(eventId: string, error: string): Promise<void> {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.status = 'failed';
    }
  }

  async incrementRetry(eventId: string): Promise<void> {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.retry_count += 1;
      if (event.retry_count < event.max_retries) {
        event.status = 'pending';
        // Exponential backoff: 2^retry_count minutes
        const backoffMinutes = Math.pow(2, event.retry_count);
        event.next_retry_at = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
      } else {
        event.status = 'failed';
      }
    }
  }
}

// =============================================================================
// EVENT BUS IMPLEMENTATION
// =============================================================================

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
  context?: TraceContext
) => Promise<void> | void;

export class EventBus extends EventEmitter {
  private eventStore: EventStore;
  private outboxStore: OutboxStore;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    eventStore?: EventStore,
    outboxStore?: OutboxStore
  ) {
    super();
    this.eventStore = eventStore || new InMemoryEventStore();
    this.outboxStore = outboxStore || new InMemoryOutboxStore();
  }

  /**
   * Publish domain event (stored in outbox for reliable delivery)
   */
  async publish<T extends DomainEvent>(
    eventType: T['event_type'],
    aggregateId: string,
    aggregateType: string,
    payload: T['payload'],
    traceContext?: TraceContext
  ): Promise<void> {
    const event: DomainEvent = {
      event_id: uuidv4(),
      event_type: eventType,
      event_version: '1.0',
      aggregate_id: aggregateId,
      aggregate_type: aggregateType,
      timestamp: new Date().toISOString(),
      payload,
      metadata: {
        trace_id: traceContext?.trace_id,
        span_id: traceContext?.span_id,
        service: process.env.SERVICE_NAME || 'unknown'
      }
    };

    // Store in event store for audit/replay
    await this.eventStore.append([event]);

    // Store in outbox for reliable delivery
    const outboxEvent: OutboxEvent = {
      id: uuidv4(),
      aggregate_id: aggregateId,
      event_type: eventType,
      event_data: event,
      created_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3,
      status: 'pending'
    };

    await this.outboxStore.insert([outboxEvent]);

    // Process immediately (also processed by background job)
    this.processOutboxEvents();
  }

  /**
   * Subscribe to domain events
   */
  subscribe<T extends DomainEvent>(
    eventType: T['event_type'],
    handler: EventHandler<T>
  ): void {
    this.on(eventType, handler);
  }

  /**
   * Unsubscribe from domain events
   */
  unsubscribe<T extends DomainEvent>(
    eventType: T['event_type'],
    handler: EventHandler<T>
  ): void {
    this.off(eventType, handler);
  }

  /**
   * Process outbox events (called by background job)
   */
  async processOutboxEvents(): Promise<void> {
    const pendingEvents = await this.outboxStore.getPendingEvents(10);
    
    for (const outboxEvent of pendingEvents) {
      try {
        // Mark as processing
        const event = outboxEvent.event_data as DomainEvent;
        
        // Emit to local subscribers
        this.emit(event.event_type, event, {
          trace_id: event.metadata?.trace_id,
          span_id: event.metadata?.span_id
        });

        // Mark as processed
        await this.outboxStore.markAsProcessed([outboxEvent.id]);
        
      } catch (error) {
        console.error(`Failed to process outbox event ${outboxEvent.id}:`, error);
        
        // Increment retry count
        await this.outboxStore.incrementRetry(outboxEvent.id);
      }
    }
  }

  /**
   * Start background processing of outbox events
   */
  startProcessing(intervalMs: number = 5000): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processOutboxEvents().catch(error => {
        console.error('Outbox processing error:', error);
      });
    }, intervalMs);
  }

  /**
   * Stop background processing
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Get event history for an aggregate
   */
  async getEventHistory(aggregateId: string): Promise<DomainEvent[]> {
    return this.eventStore.getEvents(aggregateId);
  }

  /**
   * Replay events for an aggregate (useful for rebuilding state)
   */
  async replayEvents(aggregateId: string, handler: EventHandler): Promise<void> {
    const events = await this.getEventHistory(aggregateId);
    
    for (const event of events) {
      await handler(event);
    }
  }
}

// =============================================================================
// TYPED EVENT PUBLISHERS
// =============================================================================

export class CustomerEventPublisher {
  constructor(private eventBus: EventBus) {}

  async customerCreated(
    customerId: string,
    organizationId: string,
    email: string,
    name: string,
    traceContext?: TraceContext
  ): Promise<void> {
    await this.eventBus.publish<CustomerCreatedEvent>(
      'customer.created',
      customerId,
      'customer',
      {
        customer_id: customerId,
        organization_id: organizationId,
        email,
        name,
        status: 'active'
      },
      traceContext
    );
  }

  async customerUpdated(
    customerId: string,
    changes: Record<string, any>,
    previousValues: Record<string, any>,
    traceContext?: TraceContext
  ): Promise<void> {
    await this.eventBus.publish<CustomerUpdatedEvent>(
      'customer.updated',
      customerId,
      'customer',
      {
        customer_id: customerId,
        changes,
        previous_values: previousValues
      },
      traceContext
    );
  }
}

export class BinEventPublisher {
  constructor(private eventBus: EventBus) {}

  async binCreated(
    binId: string,
    customerId: string,
    binType: string,
    capacity: number,
    location: { latitude: number; longitude: number; address?: string },
    traceContext?: TraceContext
  ): Promise<void> {
    await this.eventBus.publish<BinCreatedEvent>(
      'bin.created',
      binId,
      'bin',
      {
        bin_id: binId,
        customer_id: customerId,
        bin_type: binType,
        capacity,
        location
      },
      traceContext
    );
  }

  async binCapacityUpdated(
    binId: string,
    previousLevel: number,
    currentLevel: number,
    capacity: number,
    needsCollection: boolean,
    traceContext?: TraceContext
  ): Promise<void> {
    await this.eventBus.publish<BinCapacityUpdatedEvent>(
      'bin.capacity.updated',
      binId,
      'bin',
      {
        bin_id: binId,
        previous_level: previousLevel,
        current_level: currentLevel,
        capacity,
        needs_collection: needsCollection
      },
      traceContext
    );
  }

  async binCollected(
    binId: string,
    routeId: string,
    collectedBy: string,
    volumeCollected: number,
    traceContext?: TraceContext
  ): Promise<void> {
    await this.eventBus.publish<BinCollectedEvent>(
      'bin.collected',
      binId,
      'bin',
      {
        bin_id: binId,
        route_id: routeId,
        collected_at: new Date().toISOString(),
        collected_by: collectedBy,
        volume_collected: volumeCollected
      },
      traceContext
    );
  }
}

// =============================================================================
// SAGA PATTERN SUPPORT
// =============================================================================

export interface SagaStep<T = any> {
  name: string;
  execute: () => Promise<T>;
  compensate: (result?: T) => Promise<void>;
}

export class Saga {
  private steps: Array<{ step: SagaStep; result?: any }> = [];
  private completed: Array<{ step: SagaStep; result: any }> = [];

  constructor(public readonly sagaId: string) {}

  /**
   * Add a step to the saga
   */
  async step<T>(
    name: string,
    execute: () => Promise<T>,
    compensate: (result?: T) => Promise<void>
  ): Promise<T> {
    const sagaStep: SagaStep<T> = { name, execute, compensate };
    
    try {
      const result = await execute();
      this.completed.push({ step: sagaStep, result });
      return result;
    } catch (error) {
      // If step fails, run compensation for all completed steps
      await this.compensate();
      throw error;
    }
  }

  /**
   * Run compensation for all completed steps (in reverse order)
   */
  async compensate(): Promise<void> {
    const reversedSteps = [...this.completed].reverse();
    
    for (const { step, result } of reversedSteps) {
      try {
        await step.compensate(result);
      } catch (error) {
        console.error(`Saga compensation failed for step ${step.name}:`, error);
        // Continue with other compensations even if one fails
      }
    }
    
    this.completed = [];
  }
}

// =============================================================================
// EXPORTS  
// =============================================================================

// Classes and functions are exported inline above
// Types are exported inline above