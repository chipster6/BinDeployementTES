/**
 * ============================================================================
 * WASTE MANAGEMENT SYSTEM - USER SESSION TEST FIXTURES
 * ============================================================================
 */

import { Transaction } from 'sequelize';
import { UserSession } from '@/models/UserSession';

export interface UserSessionTestData {
  userId?: string;
  token?: string;
  expiresAt?: Date;
  isActive?: boolean;
  metadata?: any;
}

export class UserSessionFixtures {
  private counter = 1;

  public getSessionData(overrides: UserSessionTestData = {}): any {
    const index = this.counter++;
    return {
      userId: overrides.userId || this.generateUUID(),
      token: overrides.token || `test-token-${index}-${Date.now()}`,
      expiresAt: overrides.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: overrides.isActive ?? true,
      metadata: overrides.metadata || {
        ip: '127.0.0.1',
        userAgent: 'Test User Agent',
        loginTime: new Date(),
      },
    };
  }

  public async createSession(sessionData: UserSessionTestData = {}, transaction?: Transaction): Promise<UserSession> {
    const data = this.getSessionData(sessionData);
    return await UserSession.create(data, { transaction });
  }

  public async cleanup(transaction?: Transaction): Promise<void> {
    await UserSession.destroy({ where: {}, force: true, transaction });
  }

  public resetCounter(): void { this.counter = 1; }
  
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default UserSessionFixtures;