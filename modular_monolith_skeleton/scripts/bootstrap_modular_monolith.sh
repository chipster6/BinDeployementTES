#!/usr/bin/env bash
set -euo pipefail

ROOT="backend-implementation"
SRC="$ROOT/src"

# --- Folders ---
mkdir -p "$SRC"/{domain,application,infrastructure,shared,bff}
mkdir -p "$SRC"/domain/{auth,bin}/entities
mkdir -p "$SRC"/application/{auth,bin}/{use-cases,ports}
mkdir -p "$SRC"/infrastructure/{db,web}/repositories
mkdir -p "$SRC"/shared/{validation,errors,config,authz,observability}
mkdir -p contracts
mkdir -p gateway
mkdir -p tests/unit/{auth,bin}

# --- Shared: validation (Zod) ---
cat > "$SRC/shared/validation/schemas.ts" <<'TS'
import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Bin
export const createBinSchema = z.object({
  serialNumber: z.string().min(1),
  type: z.enum(["ROLL_OFF","FRONT_LOAD","REAR_LOAD"]).default("ROLL_OFF"),
  capacity: z.number().int().min(1),
  customerId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

// Express middleware helpers
export type Schema<T> = z.ZodType<T>;
export const validate =
  <T>(schema: Schema<T>) =>
  (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.error.issues });
    req.validated = parsed.data;
    next();
  };
TS

# --- Shared: errors ---
cat > "$SRC/shared/errors/index.ts" <<'TS'
export class AppError extends Error { constructor(public code: string, message: string, public status = 400, public meta: any = {}) { super(message); } }
export class BadRequest extends AppError { constructor(msg="Bad request", meta?: any){ super("BAD_REQUEST", msg, 400, meta);} }
export class Forbidden extends AppError { constructor(msg="Forbidden", meta?: any){ super("FORBIDDEN", msg, 403, meta);} }
export class NotFound extends AppError { constructor(msg="Not found", meta?: any){ super("NOT_FOUND", msg, 404, meta);} }
export class DomainError extends AppError { constructor(msg="Domain error", meta?: any){ super("DOMAIN_ERROR", msg, 422, meta);} }

// Express error mapper
export const errorMiddleware = (err: any, _req: any, res: any, _next: any) => {
  if (err instanceof AppError) return res.status(err.status).json({ error: err.code, message: err.message, meta: err.meta });
  return res.status(500).json({ error: "INTERNAL", message: "Unexpected error" });
};
TS

# --- Shared: config (Zod-validated env) ---
cat > "$SRC/shared/config/index.ts" <<'TS'
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development","test","production"]).default("development"),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ISSUER: z.string().default("bindeploy"),
  DATABASE_URL: z.string().url().optional(), // monolith default
  // add per-adapter URLs as needed
});

export const CONFIG = envSchema.parse(process.env);
TS

# --- Shared: authz (policy stub) ---
cat > "$SRC/shared/authz/policy.ts" <<'TS'
import { Forbidden } from "../errors";
export type Subject = { id: string; roles: string[]; tenantId?: string };
export function enforce(subject: Subject, action: string, _resource: any) {
  // Replace with ABAC/OPA later. For now: require any role.
  if (!subject || !subject.roles || subject.roles.length === 0) throw new Forbidden(`Missing permission for ${action}`);
}
TS

# --- Domain entities ---
cat > "$SRC/domain/auth/entities/User.ts" <<'TS'
export type User = { id: string; email: string; roles: string[]; tenantId?: string };
TS

cat > "$SRC/domain/bin/entities/Bin.ts" <<'TS'
export type Bin = {
  id: string;
  serialNumber: string;
  type: "ROLL_OFF"|"FRONT_LOAD"|"REAR_LOAD";
  capacity: number;
  customerId: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE"|"INACTIVE"|"MAINTENANCE";
};
TS

# --- Application ports (interfaces) ---
cat > "$SRC/application/auth/ports/AuthRepo.ts" <<'TS'
import { User } from "../../../domain/auth/entities/User";
export interface AuthRepo {
  findByEmail(email: string): Promise<User | null>;
  verifyPassword(userId: string, password: string): Promise<boolean>;
  mintAccessToken(user: User): Promise<string>; // use real signer later
}
TS

cat > "$SRC/application/bin/ports/BinRepo.ts" <<'TS'
import { Bin } from "../../../domain/bin/entities/Bin";
export type CreateBinDTO = Omit<Bin,"id"|"status"> & { status?: Bin["status"] };
export interface BinRepo {
  create(dto: CreateBinDTO): Promise<Bin>;
  get(id: string): Promise<Bin | null>;
}
TS

# --- Use-cases ---
cat > "$SRC/application/auth/use-cases/Login.ts" <<'TS'
import { AuthRepo } from "../ports/AuthRepo";
import { BadRequest } from "../../../shared/errors";

export class Login {
  constructor(private repo: AuthRepo) {}
  async execute(input: { email: string; password: string }) {
    const user = await this.repo.findByEmail(input.email);
    if (!user) throw new BadRequest("Invalid credentials");
    const ok = await this.repo.verifyPassword(user.id, input.password);
    if (!ok) throw new BadRequest("Invalid credentials");
    const token = await this.repo.mintAccessToken(user);
    return { token, user: { id: user.id, email: user.email, roles: user.roles } };
  }
}
TS

cat > "$SRC/application/bin/use-cases/CreateBin.ts" <<'TS'
import { BinRepo, CreateBinDTO } from "../ports/BinRepo";
import { DomainError } from "../../../shared/errors";
import { enforce, Subject } from "../../../shared/authz/policy";

export class CreateBin {
  constructor(private repo: BinRepo) {}
  async execute(input: CreateBinDTO, subject: Subject) {
    enforce(subject, "bin:create", { customerId: input.customerId });
    if (input.capacity <= 0) throw new DomainError("Capacity must be positive");
    const created = await this.repo.create({ ...input, status: "ACTIVE" });
    return created;
  }
}
TS

# --- Infrastructure: repository stubs (replace with Sequelize impls) ---
cat > "$SRC/infrastructure/db/AuthRepoSequelize.ts" <<'TS'
import { AuthRepo } from "../../application/auth/ports/AuthRepo";
import { User } from "../../domain/auth/entities/User";

// TODO: wire to your Sequelize models
export class AuthRepoSequelize implements AuthRepo {
  async findByEmail(email: string): Promise<User | null> { /* impl */ return null; }
  async verifyPassword(_userId: string, _password: string): Promise<boolean> { /* impl */ return false; }
  async mintAccessToken(user: User): Promise<string> { /* impl */ return "mock.jwt.token"; }
}
TS

cat > "$SRC/infrastructure/db/BinRepoSequelize.ts" <<'TS'
import { BinRepo, CreateBinDTO } from "../../application/bin/ports/BinRepo";
import { Bin } from "../../domain/bin/entities/Bin";

// TODO: wire to your Sequelize models
export class BinRepoSequelize implements BinRepo {
  async create(dto: CreateBinDTO): Promise<Bin> {
    return {
      id: "BIN-" + Math.random().toString(36).slice(2),
      serialNumber: dto.serialNumber,
      type: dto.type,
      capacity: dto.capacity,
      customerId: dto.customerId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      status: dto.status ?? "ACTIVE",
    };
  }
  async get(_id: string): Promise<Bin | null> { /* impl */ return null; }
}
TS

# --- Web: thin controllers (Express routers) ---
cat > "$SRC/infrastructure/web/AuthController.ts" <<'TS'
import { Router } from "express";
import { validate, loginSchema } from "../../shared/validation/schemas";
import { Login } from "../../application/auth/use-cases/Login";
import { AuthRepoSequelize } from "../db/AuthRepoSequelize";

export const authRouter = Router();
const login = new Login(new AuthRepoSequelize());

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const out = await login.execute(req.validated);
    res.status(200).json(out);
  } catch (e) { next(e); }
});
TS

cat > "$SRC/infrastructure/web/BinController.ts" <<'TS'
import { Router } from "express";
import { validate, createBinSchema } from "../../shared/validation/schemas";
import { CreateBin } from "../../application/bin/use-cases/CreateBin";
import { BinRepoSequelize } from "../db/BinRepoSequelize";

export const binRouter = Router();
const createBin = new CreateBin(new BinRepoSequelize());

// Example auth subject extraction (replace with real auth middleware)
function subjectFrom(req: any){ return { id: req.user?.id ?? "system", roles: req.user?.roles ?? ["admin"] }; }

binRouter.post("/bins", validate(createBinSchema), async (req, res, next) => {
  try {
    const out = await createBin.execute(req.validated, subjectFrom(req));
    res.status(201).json(out);
  } catch (e) { next(e); }
});
TS

# --- BFF (in-process composite read example) ---
cat > "$SRC/bff/handlers.ts" <<'TS'
import { Router } from "express";
// In monolith, call application layer directly; later, swap to HTTP calls.
export const bffRouter = Router();
bffRouter.get("/dashboard/ops-kpis", async (_req, res) => {
  // TODO: wire to ops + analytics read models
  res.json({ binsCount: 0, dossier: { pickups: 0, avgFillBeforePickup: 0 } });
});
TS

# --- API wiring example (integration point for your existing app) ---
cat > "$SRC/infrastructure/web/server.example.ts" <<'TS'
import express from "express";
import { authRouter } from "./AuthController";
import { binRouter } from "./BinController";
import { bffRouter } from "../../bff/handlers";
import { errorMiddleware } from "../../shared/errors";

export function buildApp(){
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use("/ops", binRouter);
  app.use("/bff", bffRouter);
  app.use(errorMiddleware);
  return app;
}

// If you want a standalone server for local test:
// const app = buildApp();
// app.listen(8080, () => console.log("API on :8080"));
TS

# --- OpenAPI stubs for contracts ---
cat > contracts/auth-service.openapi.yaml <<'YAML'
openapi: 3.0.3
info: { title: auth-service, version: 0.1.0 }
paths:
  /auth/login:
    post:
      summary: Login and mint access token
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties: { email: {type: string, format: email}, password: {type: string, minLength: 8} }
              required: [email, password]
      responses:
        "200": { description: OK, content: { application/json: { schema: { type: object, properties: { token: {type: string} } } } } }
YAML

cat > contracts/operations-service.openapi.yaml <<'YAML'
openapi: 3.0.3
info: { title: operations-service, version: 0.1.0 }
paths:
  /ops/bins:
    post:
      summary: Create bin
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBin'
      responses:
        "201": { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/Bin' } } } }
components:
  schemas:
    CreateBin:
      type: object
      properties:
        serialNumber: { type: string }
        type: { type: string, enum: [ROLL_OFF, FRONT_LOAD, REAR_LOAD] }
        capacity: { type: integer, minimum: 1 }
        customerId: { type: string }
        latitude: { type: number, minimum: -90, maximum: 90 }
        longitude: { type: number, minimum: -180, maximum: 180 }
      required: [serialNumber, type, capacity, customerId, latitude, longitude]
    Bin:
      type: object
      properties:
        id: { type: string }
        serialNumber: { type: string }
        type: { type: string }
        capacity: { type: integer }
        customerId: { type: string }
        latitude: { type: number }
        longitude: { type: number }
        status: { type: string, enum: [ACTIVE, INACTIVE, MAINTENANCE] }
      required: [id, serialNumber, type, capacity, customerId, status]
YAML

# --- Gateway (nginx) stub for local dev (optional) ---
cat > gateway/nginx.conf <<'NGINX'
events {}
http {
  server {
    listen 8080;
    location /auth/ { proxy_pass http://localhost:8080/auth/; }
    location /ops/  { proxy_pass http://localhost:8080/ops/; }
    location /bff/  { proxy_pass http://localhost:8080/bff/; }
  }
}
NGINX

# --- dependency-cruiser rules to enforce boundaries ---
cat > .dependency-cruiser.js <<'JS'
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "enforce-layers",
      severity: "error",
      from: { path: "^backend-implementation/src/(domain|application|infrastructure|shared|bff)" },
      to: [
        { path: "^backend-implementation/src/domain", allowed: true },
        { path: "^backend-implementation/src/application", allowed: true },
        { path: "^backend-implementation/src/infrastructure", allowed: true },
        { path: "^backend-implementation/src/shared", allowed: true },
        { path: "^backend-implementation/src/bff", allowed: true },
      ]
    },
    // Disallow infra importing web controllers directly from other domains, etc., if you tighten later.
  ],
  options: { doNotFollow: { path: "node_modules" }, tsPreCompilationDeps: true, combinedDependencies: true }
};
JS

# --- Unit test skeletons (Vitest/Jest interchangeable) ---
cat > tests/unit/auth/login.usecase.test.ts <<'TS'
import { describe, it, expect } from "vitest";
import { Login } from "../../../backend-implementation/src/application/auth/use-cases/Login";

class FakeAuthRepo {
  user = { id: "U1", email: "a@b.com", roles: ["admin"] };
  async findByEmail(email:string){ return email===this.user.email ? this.user : null; }
  async verifyPassword(){ return true; }
  async mintAccessToken(){ return "token"; }
}
describe("Login use-case", () => {
  it("mints token for valid creds", async () => {
    const uc = new Login(new FakeAuthRepo() as any);
    const out = await uc.execute({ email: "a@b.com", password: "password123" });
    expect(out.token).toBe("token");
  });
});
TS

cat > tests/unit/bin/createBin.usecase.test.ts <<'TS'
import { describe, it, expect } from "vitest";
import { CreateBin } from "../../../backend-implementation/src/application/bin/use-cases/CreateBin";

class FakeBinRepo {
  async create(dto:any){ return { id:"BIN1", status:"ACTIVE", ...dto }; }
}
describe("CreateBin use-case", () => {
  it("creates with ACTIVE status", async () => {
    const uc = new CreateBin(new FakeBinRepo() as any);
    const subject = { id:"U1", roles:["admin"] };
    const out = await uc.execute({ serialNumber:"SN1", type:"ROLL_OFF", capacity:10, customerId:"C1", latitude:0, longitude:0 }, subject as any);
    expect(out.id).toBe("BIN1");
    expect(out.status).toBe("ACTIVE");
  });
});
TS

echo "Skeleton created."
