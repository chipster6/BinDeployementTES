/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - SOCKET MANAGER SERVICE
 * ============================================================================
 *
 * WebSocket connection management for real-time features.
 * Handles client connections, room management, and message broadcasting.
 *
 * Created by: Backend Development Agent
 * Date: 2025-08-10
 * Version: 1.0.0
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "@/config";
import { logger, logSecurityEvent } from "@/utils/logger";
import { redisClient } from "@/config/redis";

/**
 * Socket connection interface
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  sessionId?: string;
}

/**
 * Socket Manager Class
 */
class SocketManager {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private roomSubscriptions: Map<string, Set<string>> = new Map(); // roomId -> socketIds

  /**
   * Initialize Socket.IO server
   */
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    logger.info("✅ Socket Manager initialized successfully");
  }

  /**
   * Setup authentication and other middleware
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          logger.warn("Socket connection attempted without token", {
            socketId: socket.id,
            ip: socket.handshake.address,
          });
          return next(new Error("Authentication token required"));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        socket.userId = decoded.userId || decoded.sub;
        socket.userRole = decoded.role;
        socket.sessionId = decoded.sessionId;

        // Validate user still exists and is active (you would check database here)
        // For now, just log the authentication
        logger.debug("Socket authenticated", {
          socketId: socket.id,
          userId: socket.userId,
          role: socket.userRole,
        });

        next();
      } catch (error) {
        logSecurityEvent(
          "socket_auth_failed",
          { error: error.message },
          undefined,
          socket.handshake.address,
          "medium",
        );

        next(new Error("Invalid authentication token"));
      }
    });

    // Rate limiting middleware
    this.io.use((socket, next) => {
      // Implement rate limiting for socket connections
      // For now, just allow all connections
      next();
    });
  }

  /**
   * Setup event handlers for socket connections
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const { userId, userRole, sessionId } = socket;

    logger.info("Socket connected", {
      socketId: socket.id,
      userId,
      role: userRole,
      sessionId,
      ip: socket.handshake.address,
    });

    // Store connection
    this.connectedClients.set(socket.id, socket);

    // Track user's sockets
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
    }

    // Join user to their personal room
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join role-based room
    if (userRole) {
      socket.join(`role:${userRole}`);
    }

    // Setup event handlers for this socket
    this.setupSocketEventHandlers(socket);

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Send welcome message
    socket.emit("connected", {
      message: "Successfully connected to Waste Management System",
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Setup event handlers for individual socket
   */
  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    // GPS location updates (for drivers)
    socket.on("location_update", (data) => {
      this.handleLocationUpdate(socket, data);
    });

    // Route progress updates
    socket.on("route_progress", (data) => {
      this.handleRouteProgress(socket, data);
    });

    // Service event updates
    socket.on("service_event", (data) => {
      this.handleServiceEvent(socket, data);
    });

    // Join specific rooms (for real-time updates)
    socket.on("join_room", (data) => {
      this.handleJoinRoom(socket, data);
    });

    // Leave specific rooms
    socket.on("leave_room", (data) => {
      this.handleLeaveRoom(socket, data);
    });

    // General message handling
    socket.on("message", (data) => {
      this.handleMessage(socket, data);
    });

    // Ping/Pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });
  }

  /**
   * Handle GPS location updates from drivers
   */
  private handleLocationUpdate(socket: AuthenticatedSocket, data: any): void {
    try {
      const { vehicleId, latitude, longitude, timestamp, speed, heading } =
        data;

      if (!vehicleId || !latitude || !longitude) {
        socket.emit("error", { message: "Invalid location data" });
        return;
      }

      // Validate coordinates
      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        socket.emit("error", { message: "Invalid GPS coordinates" });
        return;
      }

      const locationData = {
        vehicleId,
        userId: socket.userId,
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
        speed: speed || 0,
        heading: heading || 0,
        socketId: socket.id,
      };

      // Store location in Redis for quick access
      this.storeLocationData(vehicleId, locationData);

      // Broadcast to subscribers (dispatchers, customers, etc.)
      this.broadcastToRoom(
        `vehicle:${vehicleId}`,
        "location_update",
        locationData,
      );

      // Also broadcast to role-based rooms
      this.broadcastToRoom("role:dispatcher", "location_update", locationData);
      this.broadcastToRoom("role:admin", "location_update", locationData);

      logger.debug("Location update processed", {
        vehicleId,
        userId: socket.userId,
        coordinates: [latitude, longitude],
      });
    } catch (error) {
      logger.error("Error handling location update:", error);
      socket.emit("error", { message: "Failed to process location update" });
    }
  }

  /**
   * Handle route progress updates
   */
  private handleRouteProgress(socket: AuthenticatedSocket, data: any): void {
    try {
      const { routeId, progress, currentStop, estimatedArrival } = data;

      const progressData = {
        routeId,
        userId: socket.userId,
        progress,
        currentStop,
        estimatedArrival,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to route subscribers
      this.broadcastToRoom(`route:${routeId}`, "route_progress", progressData);
      this.broadcastToRoom("role:dispatcher", "route_progress", progressData);

      logger.debug("Route progress updated", { routeId, progress });
    } catch (error) {
      logger.error("Error handling route progress:", error);
      socket.emit("error", { message: "Failed to process route progress" });
    }
  }

  /**
   * Handle service event updates
   */
  private handleServiceEvent(socket: AuthenticatedSocket, data: any): void {
    try {
      const { customerId, serviceType, status, notes } = data;

      const eventData = {
        customerId,
        userId: socket.userId,
        serviceType,
        status,
        notes,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to customer and admin channels
      this.broadcastToRoom(
        `customer:${customerId}`,
        "service_event",
        eventData,
      );
      this.broadcastToRoom("role:admin", "service_event", eventData);
      this.broadcastToRoom("role:dispatcher", "service_event", eventData);

      logger.debug("Service event updated", {
        customerId,
        serviceType,
        status,
      });
    } catch (error) {
      logger.error("Error handling service event:", error);
      socket.emit("error", { message: "Failed to process service event" });
    }
  }

  /**
   * Handle joining rooms for specific updates
   */
  private handleJoinRoom(socket: AuthenticatedSocket, data: any): void {
    try {
      const { room, reason } = data;

      // Validate room access based on user role
      if (!this.validateRoomAccess(socket, room)) {
        socket.emit("error", { message: "Access denied to room" });
        return;
      }

      socket.join(room);

      // Track room subscription
      if (!this.roomSubscriptions.has(room)) {
        this.roomSubscriptions.set(room, new Set());
      }
      this.roomSubscriptions.get(room)!.add(socket.id);

      socket.emit("joined_room", { room, timestamp: new Date().toISOString() });

      logger.debug("Socket joined room", {
        socketId: socket.id,
        userId: socket.userId,
        room,
        reason,
      });
    } catch (error) {
      logger.error("Error joining room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  }

  /**
   * Handle leaving rooms
   */
  private handleLeaveRoom(socket: AuthenticatedSocket, data: any): void {
    try {
      const { room } = data;

      socket.leave(room);

      // Remove from room subscription tracking
      if (this.roomSubscriptions.has(room)) {
        this.roomSubscriptions.get(room)!.delete(socket.id);
      }

      socket.emit("left_room", { room, timestamp: new Date().toISOString() });

      logger.debug("Socket left room", {
        socketId: socket.id,
        userId: socket.userId,
        room,
      });
    } catch (error) {
      logger.error("Error leaving room:", error);
    }
  }

  /**
   * Handle general messages
   */
  private handleMessage(socket: AuthenticatedSocket, data: any): void {
    try {
      // Implement message handling logic based on your needs
      logger.debug("Socket message received", {
        socketId: socket.id,
        userId: socket.userId,
        data,
      });

      // Echo back for now
      socket.emit("message_received", {
        message: "Message received",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error handling message:", error);
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(
    socket: AuthenticatedSocket,
    reason: string,
  ): void {
    const { userId } = socket;

    logger.info("Socket disconnected", {
      socketId: socket.id,
      userId,
      reason,
    });

    // Clean up connection tracking
    this.connectedClients.delete(socket.id);

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(socket.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Clean up room subscriptions
    this.roomSubscriptions.forEach((sockets, room) => {
      sockets.delete(socket.id);
    });
  }

  /**
   * Store location data in Redis
   */
  private async storeLocationData(
    vehicleId: string,
    locationData: any,
  ): Promise<void> {
    try {
      const key = `location:vehicle:${vehicleId}`;
      await redisClient.set(key, JSON.stringify(locationData), "EX", 300); // 5 minute expiry
    } catch (error) {
      logger.error("Failed to store location data in Redis:", error);
    }
  }

  /**
   * Validate if user can access a specific room
   */
  private validateRoomAccess(
    socket: AuthenticatedSocket,
    room: string,
  ): boolean {
    const { userId, userRole } = socket;

    // Admin and dispatcher can access all rooms
    if (userRole === "admin" || userRole === "dispatcher") {
      return true;
    }

    // Users can access their own rooms
    if (room === `user:${userId}`) {
      return true;
    }

    // Drivers can access their vehicle rooms
    if (userRole === "driver" && room.startsWith("vehicle:")) {
      // You would validate if this driver is assigned to this vehicle
      return true;
    }

    // Customers can access their own customer rooms
    if (userRole === "customer" && room.startsWith("customer:")) {
      // You would validate if this user owns this customer account
      return true;
    }

    return false;
  }

  /**
   * Broadcast message to a specific room
   */
  broadcastToRoom(room: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(room).emit(event, data);
      logger.debug(`Broadcast to room ${room}:`, { event, data });
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
      logger.debug(`Message sent to user ${userId}:`, { event, data });
    }
  }

  /**
   * Send message to all users with specific role
   */
  sendToRole(role: string, event: string, data: any): void {
    if (this.io) {
      this.io.to(`role:${role}`).emit(event, data);
      logger.debug(`Message sent to role ${role}:`, { event, data });
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get user's active connections
   */
  getUserConnections(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Disconnect all sockets for a user
   */
  disconnectUser(userId: string, reason?: string): void {
    const socketIds = this.getUserConnections(userId);
    socketIds.forEach((socketId) => {
      const socket = this.connectedClients.get(socketId);
      if (socket) {
        socket.emit("force_disconnect", {
          reason: reason || "Disconnected by system",
        });
        socket.disconnect(true);
      }
    });
  }

  /**
   * Get socket statistics
   */
  getStats(): any {
    return {
      connectedClients: this.connectedClients.size,
      activeUsers: this.userSockets.size,
      activeRooms: this.roomSubscriptions.size,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
export const socketManager = new SocketManager();

// Export class for testing
export { SocketManager };
export default socketManager;
