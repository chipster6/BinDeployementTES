---
inclusion: fileMatch
fileMatchPattern:
  - 'backend-implementation/src/**/*.ts'
  - 'backend-implementation/src/**/*.tsx'
  - 'backend-implementation/types/**/*.ts'
  - 'backend-implementation/tsconfig*.json'
---

# TypeScript Zero-Error Steering (ts_refactor)

## Scope & Boundaries

**Allowed**
- `backend-implementation/src/**`
- `backend-implementation/types/**`
- `backend-implementation/tsconfig*.json`
- Import-path normalization and type fixes only

**Out of Scope (escalate)**
- `contracts/**` (Architecture Agent)
- `docs/**`
- `gateway/**`
- `backend-implementation/db/**` (DB-Architect)
- Public API shapes / external wire contracts

## Hard Rules

1. **No regressions**: Do **not** exceed the saved TS baseline.
2. **Behavior stable**: No runtime/contract changes.
3. **Safety**: No DB schema/migration edits.
4. **Small diffs**: ≤300 LOC per commit; one concern per commit.
5. **Conventional commits**: Include TS error delta in subject.
6. **Suppressions**: ≤2 `@ts-ignore` per PR; prefer `@ts-expect-error` with TODO/link.
7. **Imports**: Prefer `@/` alias; do large-scale normalization in Phase 4.
8. **Validation gates** must pass: depcruise, prod build, smoke tests, TS enforce.

## Required Commands (must exist & be used)

- `npm run typecheck:enforce` (baseline regression gate)
- `npm run typecheck:modified` (fast local focus on edited files)
- `npm run dep:cruise`
- `npm run build:production`
- `npm run test:smoke`

## Preferred TS Patterns

```ts
// ✅ Narrowing & helpers
function isUser(x: unknown): x is User {
  return !!x && typeof x === 'object' && 'id' in (x as any);
}

export function ok<T>(data: T): ApiResponse<T> { 
  return { success: true, data }; 
}

// ✅ Alias imports
import { UserService } from '@/services/UserService';
import type { ApiResponse } from '@/types/api';
```

### Avoid

```ts
// ❌ Assertions without checks
const u = thing as User;

// ❌ any
function f(x: any): any {}

// ❌ fragile deep relatives
import { q } from '../../../utils/whatever';
```

## Config Guidance (do not auto-flip)

- Keep `strict: true`.
- Use Node's module resolution (NodeNext/Node16), not bundler.
- Ensure `baseUrl: "src"` and `paths: { "@/*": ["*"] }`.

## Phase Map (what to fix first)

**P1 Keystone**: tsconfig hygiene, src/types/express.d.ts augmentation, logger normalization (single logger export & one Timer).

**P2 Shared Types**: unify ApiResponse<T>, PaginatedData<T>, and fix Result<T,E> combinators (no E | undefined widening).

**P3 Vector/Weaviate**: adapter for client key types; replace unsafe optional chaining with guards; standardize undefined over null.

**P4 Cleanup**: dead code removal, global @/ normalization, audit remaining suppressions.

## Validation Workflow

**Local fast check**: `npm run typecheck:modified`

**Pre-push/PR gates**:
- `npm run typecheck:enforce` (blocking)
- `npm run dep:cruise` (blocking)
- `npm run build:production` (blocking)
- `npm run test:smoke` (blocking)

If a fix requires contract/DB changes → STOP & escalate.