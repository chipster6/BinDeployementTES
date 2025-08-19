/**
 * ============================================================================
 * WEAVIATE VECTOR DATABASE CONNECTION SERVICE
 * ============================================================================
 *
 * COORDINATION SESSION: phase-1-weaviate-execution-parallel
 * 
 * Manages Weaviate vector database connections, schema setup, and
 * hybrid PostgreSQL + Weaviate operations for Phase 1 vector intelligence.
 *
 * COORDINATION WITH:
 * - Backend-Agent: Repository pattern integration for vector operations
 * - Performance-Optimization-Specialist: Connection pooling and optimization
 * - Innovation-Architect: Weaviate cluster configuration and schema management
 *
 * Created by: Database-Architect
 * Date: 2025-08-16
 * Version: 1.0.0
 */

import weaviate, { WeaviateClient, ApiKey, ConnectionParams } from 'weaviate-ts-client';
import { DatabaseConfig } from '../config/database.config';
import { Logger } from '../utils/Logger';
import { DatabaseConnection } from './DatabaseConnection';

/**
 * Weaviate class schema definitions for waste management entities
 */
export interface WeaviateClassSchema {
  class: string;
  description: string;
  properties: WeaviateProperty[];
  vectorizer: string;
  moduleConfig: any;
}

export interface WeaviateProperty {
  name: string;
  dataType: string[];
  description: string;
  moduleConfig?: any;
}

/**
 * Vector embedding result interface
 */
export interface VectorEmbeddingResult {
  id: string;
  vector?: number[];
  properties: Record<string, any>;
  score?: number;
  certainty?: number;
}

/**
 * Vector search query interface
 */
export interface VectorSearchQuery {
  className: string;
  query?: string;
  vector?: number[];
  limit?: number;
  offset?: number;
  where?: any;
  additional?: string[];
}

/**
 * Weaviate connection and operations manager
 */
export class WeaviateConnection {
  private client: WeaviateClient | null = null;
  private config: DatabaseConfig['weaviate'];
  private logger: Logger;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    config: DatabaseConfig['weaviate'],
    logger: Logger = new Logger('WeaviateConnection')
  ) {
    this.config = config;
    this.logger = logger;
    this.maxRetries = config.retries;
    this.retryDelay = config.retryDelay;
  }

  /**
   * Initialize Weaviate connection with retry logic
   */
  public async connect(): Promise<void> {
    try {
      this.logger.info('Connecting to Weaviate vector database', {
        host: this.config.host,
        port: this.config.port,
        scheme: this.config.scheme
      });

      const connectionParams: ConnectionParams = {
        scheme: this.config.scheme,
        host: `${this.config.host}:${this.config.port}`,
      };

      // Add authentication if API key is provided
      if (this.config.apiKey) {
        connectionParams.apiKey = new ApiKey(this.config.apiKey);
      }

      // Add OpenAI API key for vectorization if provided
      const headers: Record<string, string> = {};
      if (this.config.openaiApiKey) {
        headers['X-OpenAI-Api-Key'] = this.config.openaiApiKey;
      }

      this.client = weaviate.client(connectionParams);

      // Test connection
      await this.testConnection();
      
      this.isConnected = true;
      this.connectionRetries = 0;
      
      this.logger.info('Successfully connected to Weaviate vector database');

      // Initialize schema if needed
      await this.initializeSchema();

    } catch (error) {
      this.logger.error('Failed to connect to Weaviate', { error: error.message });
      
      if (this.connectionRetries < this.maxRetries) {
        this.connectionRetries++;
        this.logger.info(`Retrying Weaviate connection (${this.connectionRetries}/${this.maxRetries}) in ${this.retryDelay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connect();
      }
      
      throw new Error(`Failed to connect to Weaviate after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  /**
   * Test Weaviate connection health
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Weaviate client not initialized');
    }

    try {
      const meta = await this.client.misc.metaGetter().do();
      this.logger.debug('Weaviate connection test successful', {
        version: meta.version,
        hostname: meta.hostname
      });
    } catch (error) {
      throw new Error(`Weaviate connection test failed: ${error.message}`);
    }
  }

  /**
   * Initialize Weaviate schema for waste management entities
   */
  private async initializeSchema(): Promise<void> {
    if (!this.client) {
      throw new Error('Weaviate client not initialized');
    }

    this.logger.info('Initializing Weaviate schema for waste management entities');

    const schemas = this.getWeaviateSchemas();

    for (const schema of schemas) {
      try {
        // Check if class already exists
        const existingSchema = await this.client.schema.classGetter().withClassName(schema.class).do();
        
        if (existingSchema) {
          this.logger.debug(`Weaviate class '${schema.class}' already exists, skipping creation`);
          continue;
        }
      } catch (error) {
        // Class doesn't exist, continue with creation
      }

      try {
        await this.client.schema.classCreator().withClass(schema).do();
        this.logger.info(`Created Weaviate class: ${schema.class}`);
      } catch (error) {
        this.logger.error(`Failed to create Weaviate class: ${schema.class}`, { error: error.message });
        throw error;
      }
    }

    this.logger.info('Weaviate schema initialization completed');
  }

  /**
   * Get Weaviate class schemas for waste management entities
   */
  private getWeaviateSchemas(): WeaviateClassSchema[] {
    return [
      {
        class: 'OperationalRoute',
        description: 'Waste collection routes with optimization metadata',
        vectorizer: 'text2vec-openai',
        moduleConfig: {
          'text2vec-openai': {
            model: 'ada',
            modelVersion: '002',
            type: 'text'
          }
        },
        properties: [
          {
            name: 'routeId',
            dataType: ['string'],
            description: 'Unique route identifier from PostgreSQL'
          },
          {
            name: 'routeName',
            dataType: ['string'],
            description: 'Human-readable route name'
          },
          {
            name: 'routeType',
            dataType: ['string'],
            description: 'Type of route (residential, commercial, industrial)'
          },
          {
            name: 'territory',
            dataType: ['string'],
            description: 'Geographic territory or zone'
          },
          {
            name: 'status',
            dataType: ['string'],
            description: 'Current route status'
          },
          {
            name: 'description',
            dataType: ['text'],
            description: 'Detailed route description and notes'
          },
          {
            name: 'estimatedDistance',
            dataType: ['number'],
            description: 'Estimated route distance in miles'
          },
          {
            name: 'estimatedDuration',
            dataType: ['number'],
            description: 'Estimated route duration in minutes'
          },
          {
            name: 'optimizationScore',
            dataType: ['number'],
            description: 'AI optimization score (0-100)'
          },
          {
            name: 'binCount',
            dataType: ['int'],
            description: 'Number of bins on this route'
          },
          {
            name: 'customerCount',
            dataType: ['int'],
            description: 'Number of customers served by this route'
          },
          {
            name: 'lastUpdated',
            dataType: ['date'],
            description: 'Last update timestamp'
          }
        ]
      },
      {
        class: 'WasteBin',
        description: 'Waste bins with IoT sensor data and location information',
        vectorizer: 'text2vec-openai',
        moduleConfig: {
          'text2vec-openai': {
            model: 'ada',
            modelVersion: '002',
            type: 'text'
          }
        },
        properties: [
          {
            name: 'binId',
            dataType: ['string'],
            description: 'Unique bin identifier from PostgreSQL'
          },
          {
            name: 'binIdExternal',
            dataType: ['string'],
            description: 'External bin ID for customer reference'
          },
          {
            name: 'binType',
            dataType: ['string'],
            description: 'Type of bin (trash, recycling, compost, hazardous)'
          },
          {
            name: 'status',
            dataType: ['string'],
            description: 'Current bin status'
          },
          {
            name: 'capacity',
            dataType: ['number'],
            description: 'Bin capacity in gallons'
          },
          {
            name: 'currentLevel',
            dataType: ['number'],
            description: 'Current fill level percentage (0-100)'
          },
          {
            name: 'serviceFrequency',
            dataType: ['int'],
            description: 'Service frequency in days'
          },
          {
            name: 'lastServiceDate',
            dataType: ['date'],
            description: 'Last service date'
          },
          {
            name: 'nextServiceDate',
            dataType: ['date'],
            description: 'Next scheduled service date'
          },
          {
            name: 'customerName',
            dataType: ['string'],
            description: 'Customer company name'
          },
          {
            name: 'address',
            dataType: ['text'],
            description: 'Full address of bin location'
          },
          {
            name: 'notes',
            dataType: ['text'],
            description: 'Additional notes and instructions'
          },
          {
            name: 'coordinates',
            dataType: ['geoCoordinates'],
            description: 'GPS coordinates of bin location'
          }
        ]
      },
      {
        class: 'Customer',
        description: 'Customer information with service preferences and history',
        vectorizer: 'text2vec-openai',
        moduleConfig: {
          'text2vec-openai': {
            model: 'ada',
            modelVersion: '002',
            type: 'text'
          }
        },
        properties: [
          {
            name: 'customerId',
            dataType: ['string'],
            description: 'Unique customer identifier from PostgreSQL'
          },
          {
            name: 'companyName',
            dataType: ['string'],
            description: 'Customer company name'
          },
          {
            name: 'contactName',
            dataType: ['string'],
            description: 'Primary contact person'
          },
          {
            name: 'businessType',
            dataType: ['string'],
            description: 'Type of business or industry'
          },
          {
            name: 'status',
            dataType: ['string'],
            description: 'Customer account status'
          },
          {
            name: 'serviceLevel',
            dataType: ['string'],
            description: 'Service level (basic, premium, enterprise)'
          },
          {
            name: 'address',
            dataType: ['text'],
            description: 'Customer address'
          },
          {
            name: 'description',
            dataType: ['text'],
            description: 'Customer description and notes'
          },
          {
            name: 'binCount',
            dataType: ['int'],
            description: 'Number of bins assigned to customer'
          },
          {
            name: 'monthlyRevenue',
            dataType: ['number'],
            description: 'Monthly recurring revenue'
          },
          {
            name: 'signupDate',
            dataType: ['date'],
            description: 'Customer signup date'
          },
          {
            name: 'lastServiceDate',
            dataType: ['date'],
            description: 'Last service date'
          }
        ]
      },
      {
        class: 'ServiceEvent',
        description: 'Service events and maintenance activities with outcomes',
        vectorizer: 'text2vec-openai',
        moduleConfig: {
          'text2vec-openai': {
            model: 'ada',
            modelVersion: '002',
            type: 'text'
          }
        },
        properties: [
          {
            name: 'eventId',
            dataType: ['string'],
            description: 'Unique service event identifier'
          },
          {
            name: 'eventType',
            dataType: ['string'],
            description: 'Type of service event'
          },
          {
            name: 'status',
            dataType: ['string'],
            description: 'Event completion status'
          },
          {
            name: 'binId',
            dataType: ['string'],
            description: 'Associated bin ID'
          },
          {
            name: 'routeId',
            dataType: ['string'],
            description: 'Associated route ID'
          },
          {
            name: 'driverName',
            dataType: ['string'],
            description: 'Driver who performed the service'
          },
          {
            name: 'vehicleId',
            dataType: ['string'],
            description: 'Vehicle used for service'
          },
          {
            name: 'description',
            dataType: ['text'],
            description: 'Detailed event description'
          },
          {
            name: 'notes',
            dataType: ['text'],
            description: 'Additional notes and observations'
          },
          {
            name: 'duration',
            dataType: ['int'],
            description: 'Service duration in minutes'
          },
          {
            name: 'scheduledTime',
            dataType: ['date'],
            description: 'Scheduled service time'
          },
          {
            name: 'startedTime',
            dataType: ['date'],
            description: 'Actual start time'
          },
          {
            name: 'completedTime',
            dataType: ['date'],
            description: 'Completion time'
          }
        ]
      },
      {
        class: 'KnowledgeBase',
        description: 'Operational knowledge and troubleshooting information',
        vectorizer: 'text2vec-openai',
        moduleConfig: {
          'text2vec-openai': {
            model: 'ada',
            modelVersion: '002',
            type: 'text'
          }
        },
        properties: [
          {
            name: 'articleId',
            dataType: ['string'],
            description: 'Unique knowledge base article identifier'
          },
          {
            name: 'title',
            dataType: ['string'],
            description: 'Knowledge article title'
          },
          {
            name: 'category',
            dataType: ['string'],
            description: 'Knowledge category (operations, maintenance, troubleshooting)'
          },
          {
            name: 'tags',
            dataType: ['string[]'],
            description: 'Searchable tags'
          },
          {
            name: 'content',
            dataType: ['text'],
            description: 'Full article content'
          },
          {
            name: 'summary',
            dataType: ['text'],
            description: 'Brief summary of the article'
          },
          {
            name: 'author',
            dataType: ['string'],
            description: 'Article author'
          },
          {
            name: 'viewCount',
            dataType: ['int'],
            description: 'Number of times viewed'
          },
          {
            name: 'usefulness',
            dataType: ['number'],
            description: 'Usefulness rating (1-10)'
          },
          {
            name: 'lastUpdated',
            dataType: ['date'],
            description: 'Last update timestamp'
          },
          {
            name: 'createdDate',
            dataType: ['date'],
            description: 'Article creation date'
          }
        ]
      }
    ];
  }

  /**
   * Insert or update vector embeddings in Weaviate
   */
  public async upsertVector(
    className: string,
    id: string,
    properties: Record<string, any>,
    vector?: number[]
  ): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('Weaviate client not connected');
    }

    try {
      this.logger.debug(`Upserting vector to Weaviate class: ${className}`, { id });

      let dataObject = this.client.data
        .creator()
        .withClassName(className)
        .withId(id)
        .withProperties(properties);

      if (vector && vector.length > 0) {
        dataObject = dataObject.withVector(vector);
      }

      const result = await dataObject.do();
      
      this.logger.debug(`Successfully upserted vector to Weaviate`, { 
        className, 
        id: result.id 
      });

      return result.id;
    } catch (error) {
      this.logger.error(`Failed to upsert vector to Weaviate`, {
        className,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Batch insert vectors for better performance
   */
  public async batchUpsertVectors(
    className: string,
    objects: Array<{
      id: string;
      properties: Record<string, any>;
      vector?: number[];
    }>
  ): Promise<string[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Weaviate client not connected');
    }

    if (objects.length === 0) {
      return [];
    }

    try {
      this.logger.debug(`Batch upserting ${objects.length} vectors to Weaviate class: ${className}`);

      let batcher = this.client.batch.objectsBatcher();
      
      objects.forEach(obj => {
        let dataObject = {
          class: className,
          id: obj.id,
          properties: obj.properties,
        };

        if (obj.vector && obj.vector.length > 0) {
          (dataObject as any).vector = obj.vector;
        }

        batcher = batcher.withObject(dataObject);
      });

      const result = await batcher.do();
      
      const successfulIds = result
        .filter(item => !item.result?.errors)
        .map(item => item.id);

      const errors = result.filter(item => item.result?.errors);
      if (errors.length > 0) {
        this.logger.warn(`Batch upsert had ${errors.length} errors`, { errors });
      }

      this.logger.debug(`Successfully batch upserted ${successfulIds.length}/${objects.length} vectors`);

      return successfulIds;
    } catch (error) {
      this.logger.error(`Failed to batch upsert vectors to Weaviate`, {
        className,
        count: objects.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search vectors by text query
   */
  public async searchByText(
    query: VectorSearchQuery
  ): Promise<VectorEmbeddingResult[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Weaviate client not connected');
    }

    try {
      this.logger.debug(`Performing text search in Weaviate`, { 
        className: query.className,
        query: query.query,
        limit: query.limit 
      });

      let searcher = this.client.graphql
        .get()
        .withClassName(query.className)
        .withLimit(query.limit || 10);

      if (query.offset) {
        searcher = searcher.withOffset(query.offset);
      }

      if (query.query) {
        searcher = searcher.withNearText({ concepts: [query.query] });
      }

      if (query.where) {
        searcher = searcher.withWhere(query.where);
      }

      if (query.additional) {
        searcher = searcher.withAdditional(query.additional);
      } else {
        searcher = searcher.withAdditional(['certainty', 'distance']);
      }

      const result = await searcher.do();
      
      const objects = result.data?.Get?.[query.className] || [];
      
      this.logger.debug(`Text search returned ${objects.length} results`);

      return objects.map((obj: any) => ({
        id: obj.id || obj._additional?.id,
        properties: obj,
        certainty: obj._additional?.certainty,
        score: obj._additional?.distance ? 1 - obj._additional.distance : undefined
      }));
    } catch (error) {
      this.logger.error(`Failed to search vectors in Weaviate`, {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search vectors by similarity
   */
  public async searchByVector(
    query: VectorSearchQuery
  ): Promise<VectorEmbeddingResult[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('Weaviate client not connected');
    }

    if (!query.vector || query.vector.length === 0) {
      throw new Error('Vector is required for vector search');
    }

    try {
      this.logger.debug(`Performing vector search in Weaviate`, { 
        className: query.className,
        vectorDimensions: query.vector.length,
        limit: query.limit 
      });

      let searcher = this.client.graphql
        .get()
        .withClassName(query.className)
        .withNearVector({ vector: query.vector })
        .withLimit(query.limit || 10);

      if (query.offset) {
        searcher = searcher.withOffset(query.offset);
      }

      if (query.where) {
        searcher = searcher.withWhere(query.where);
      }

      if (query.additional) {
        searcher = searcher.withAdditional(query.additional);
      } else {
        searcher = searcher.withAdditional(['certainty', 'distance', 'vector']);
      }

      const result = await searcher.do();
      
      const objects = result.data?.Get?.[query.className] || [];
      
      this.logger.debug(`Vector search returned ${objects.length} results`);

      return objects.map((obj: any) => ({
        id: obj.id || obj._additional?.id,
        vector: obj._additional?.vector,
        properties: obj,
        certainty: obj._additional?.certainty,
        score: obj._additional?.distance ? 1 - obj._additional.distance : undefined
      }));
    } catch (error) {
      this.logger.error(`Failed to search vectors in Weaviate`, {
        query,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete vector by ID
   */
  public async deleteVector(className: string, id: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('Weaviate client not connected');
    }

    try {
      this.logger.debug(`Deleting vector from Weaviate`, { className, id });

      await this.client.data
        .deleter()
        .withClassName(className)
        .withId(id)
        .do();

      this.logger.debug(`Successfully deleted vector from Weaviate`, { className, id });
    } catch (error) {
      this.logger.error(`Failed to delete vector from Weaviate`, {
        className,
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get Weaviate cluster health status
   */
  public async getHealthStatus(): Promise<{
    healthy: boolean;
    version?: string;
    hostname?: string;
    responseTime: number;
  }> {
    if (!this.client) {
      return {
        healthy: false,
        responseTime: 0
      };
    }

    const startTime = Date.now();
    
    try {
      const meta = await this.client.misc.metaGetter().do();
      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        version: meta.version,
        hostname: meta.hostname,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.logger.warn(`Weaviate health check failed`, { 
        error: error.message,
        responseTime 
      });

      return {
        healthy: false,
        responseTime
      };
    }
  }

  /**
   * Close Weaviate connection
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      this.logger.info('Disconnecting from Weaviate vector database');
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected to Weaviate
   */
  public isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }
}

/**
 * Singleton Weaviate connection instance
 */
export class WeaviateConnectionManager {
  private static instance: WeaviateConnection | null = null;
  private static config: DatabaseConfig['weaviate'] | null = null;

  /**
   * Initialize the Weaviate connection manager
   */
  public static initialize(config: DatabaseConfig['weaviate']): void {
    this.config = config;
  }

  /**
   * Get or create Weaviate connection instance
   */
  public static async getInstance(): Promise<WeaviateConnection> {
    if (!this.config) {
      throw new Error('WeaviateConnectionManager not initialized. Call initialize() first.');
    }

    if (!this.instance) {
      this.instance = new WeaviateConnection(this.config);
      await this.instance.connect();
    }

    if (!this.instance.isHealthy()) {
      await this.instance.connect();
    }

    return this.instance;
  }

  /**
   * Close all connections
   */
  public static async closeAll(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
    }
  }
}