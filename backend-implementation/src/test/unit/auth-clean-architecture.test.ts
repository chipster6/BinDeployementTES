/**
 * Clean Architecture Auth Tests
 * 
 * Unit tests for the new clean architecture authentication components.
 * Tests use cases, repositories, and controllers in isolation.
 */
import { Login } from "../../application/auth/use-cases/Login";
import { AuthRepo } from "../../application/auth/ports/AuthRepo";
import { User } from "../../domain/auth/entities/User";
import { BadRequest } from "../../shared/errors";

// Mock repository for testing
class MockAuthRepo implements AuthRepo {
  private users: User[] = [
    { id: "user1", email: "test@example.com", roles: ["user"], tenantId: "org1" },
    { id: "admin1", email: "admin@example.com", roles: ["admin"], tenantId: "org1" }
  ];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    // Mock: accept "password123" for any user
    return password === "password123";
  }

  async mintAccessToken(user: User): Promise<string> {
    return `jwt.token.for.${user.id}`;
  }
}

describe("Clean Architecture Auth Components", () => {
  let authRepo: MockAuthRepo;
  let loginUseCase: Login;

  beforeEach(() => {
    authRepo = new MockAuthRepo();
    loginUseCase = new Login(authRepo);
  });

  describe("Login Use Case", () => {
    it("should successfully login with valid credentials", async () => {
      const input = {
        email: "test@example.com",
        password: "password123"
      };

      const result = await loginUseCase.execute(input);

      expect(result).toBeDefined();
      expect(result.token).toBe("jwt.token.for.user1");
      expect(result.user).toEqual({
        id: "user1",
        email: "test@example.com",
        roles: ["user"]
      });
    });

    it("should throw BadRequest for invalid email", async () => {
      const input = {
        email: "nonexistent@example.com",
        password: "password123"
      };

      await expect(loginUseCase.execute(input)).rejects.toThrow(BadRequest);
      await expect(loginUseCase.execute(input)).rejects.toThrow("Invalid credentials");
    });

    it("should throw BadRequest for invalid password", async () => {
      const input = {
        email: "test@example.com",
        password: "wrongpassword"
      };

      await expect(loginUseCase.execute(input)).rejects.toThrow(BadRequest);
      await expect(loginUseCase.execute(input)).rejects.toThrow("Invalid credentials");
    });

    it("should handle admin user login", async () => {
      const input = {
        email: "admin@example.com",
        password: "password123"
      };

      const result = await loginUseCase.execute(input);

      expect(result.user.roles).toContain("admin");
      expect(result.token).toBe("jwt.token.for.admin1");
    });
  });

  describe("Auth Repository Interface", () => {
    it("should find user by email", async () => {
      const user = await authRepo.findByEmail("test@example.com");
      
      expect(user).toBeDefined();
      expect(user?.id).toBe("user1");
      expect(user?.email).toBe("test@example.com");
    });

    it("should return null for non-existent user", async () => {
      const user = await authRepo.findByEmail("nonexistent@example.com");
      expect(user).toBeNull();
    });

    it("should verify correct password", async () => {
      const isValid = await authRepo.verifyPassword("user1", "password123");
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const isValid = await authRepo.verifyPassword("user1", "wrongpassword");
      expect(isValid).toBe(false);
    });

    it("should mint access token for user", async () => {
      const user: User = { id: "test123", email: "test@example.com", roles: ["user"] };
      const token = await authRepo.mintAccessToken(user);
      
      expect(token).toBe("jwt.token.for.test123");
    });
  });

  describe("Error Handling", () => {
    it("should use proper error types", () => {
      const error = new BadRequest("Test error");
      
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.status).toBe(400);
      expect(error.message).toBe("Test error");
    });
  });
});