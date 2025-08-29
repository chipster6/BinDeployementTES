# Implementation Plan

- [-] 1. Initialize TypeScript error baseline and validation infrastructure
  - Set up error quantification tooling and validation pipeline
  - Create baseline error metrics using `npm run typecheck:count` and `npm run typecheck:top`
  - Implement pre-commit validation workflow with `./scripts/repo-audit.sh`
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 2. Phase 1 - Foundational TypeScript Configuration Fixes
- [x] 2.1 Fix TypeScript configuration hygiene
  - Validate and correct `tsconfig.json` with `baseUrl: "src"` and path alias `"@/*": ["*"]`
  - Configure module interop settings based on current import patterns analysis
  - Write unit tests to validate TypeScript configuration correctness
  - _Requirements: 1.2, 4.1_

- [x] 2.2 Create global Express type augmentation
  - Implement `src/types/express.d.ts` with `req.user` type augmentation
  - Remove references to non-standard `Express.AuthenticatedRequest` type
  - Update `utils/typeGuards.ts` to use the new augmentation
  - Write tests to validate Express type augmentation works correctly
  - _Requirements: 1.2, 4.1, 6.2_

- [x] 2.3 Normalize logger imports and resolve duplicate exports
  - Unify logger imports/exports across the codebase for CJS vs ESM consistency
  - Resolve duplicate Timer exports in `utils/logger.ts` by keeping one and migrating usages
  - Update all logger import statements to use consistent import style
  - Write tests to ensure logger functionality remains intact after normalization
  - _Requirements: 1.2, 4.1, 6.5_

- [ ] 3.1 Standardize API response types
  - Define canonical `ApiResponse<T>` and `PaginatedData<T>` types in shared types module
  - Align `utils/responseFormatter.ts` with standardized response shapes
  - Update all controllers to use consistent response types
  - Write unit tests for response type consistency across controllers
  - _Requirements: 1.3, 4.2, 6.2_

- [ ] 3.2 Fix Result type invariants and combinators
  - Repair generic helpers in `src/types/Result.ts` to prevent `Result<T[], E|undefined>` widening
  - Ensure `isFailure/failure` combinators never widen E to `E | undefined`
  - Update all Result type usage across services to use fixed invariants
  - Write comprehensive tests for Result type combinators and edge cases
  - _Requirements: 1.3, 4.2, 6.1_

- [-] 4. Phase 3 - Vector and Weaviate Service Type Resolution
- [ ] 4.1 Implement Weaviate client type adapter
  - Create thin adapter interface for Weaviate client to handle ApiKey typing mismatches
  - Wrap configuration at the edge to ensure constructor receives expected types
  - Implement type-safe query methods with proper error handling
  - Write integration tests for Weaviate client adapter functionality
  - _Requirements: 1.4, 4.3, 6.2_

- [ ] 4.2 Replace unsafe optional chaining with proper type narrowing
  - Replace unsafe `update?.` and array indexing with early returns or guard clauses
  - Fix "possibly undefined" arithmetic by hoisting values into locals after guards
  - Implement proper type narrowing patterns throughout Vector and Weaviate services
  - Write unit tests to validate type narrowing logic and edge case handling
  - _Requirements: 1.4, 4.3, 6.1_

- [ ] 4.3 Standardize batch status type conventions
  - Choose consistent convention between `string | null` vs `string | undefined` for batch status
  - Update field definitions to use `undefined` for omitted fields consistently
  - Migrate all batch status handling to use standardized type convention
  - Write tests to ensure batch status type consistency across the system
  - _Requirements: 1.4, 4.3, 6.1_

- [ ] 5. Phase 4 - Dead Code Elimination and Import Path Normalization
- [ ] 5.1 Remove dead and duplicate modules
  - Identify and safely delete unused legacy modules (e.g., legacy Logger.ts if not used)
  - Remove duplicate type definitions and consolidate into shared modules
  - Clean up orphaned utility functions and unused imports
  - Write tests to ensure no functionality is broken by dead code removal
  - _Requirements: 1.5, 4.4, 6.4_

- [ ] 5.2 Normalize import paths and resolve inconsistencies
  - Standardize all imports to use `@/` alias consistently over relative imports
  - Fix import path drift and ensure consistent module resolution
  - Update all import statements to follow established conventions
  - Write linting rules to enforce consistent import path usage going forward
  - _Requirements: 1.5, 4.4, 6.5_

- [ ] 5.3 Audit and minimize TypeScript suppressions
  - Review all `// @ts-ignore` and `// @ts-nocheck` usage in the codebase
  - Replace suppressions with proper type fixes where possible
  - Limit remaining suppressions to max 2 occurrences with TODO links for third-party issues
  - Document remaining suppressions with clear rationale and issue tracking
  - _Requirements: 1.5, 4.4, 6.4_

- [ ] 6. Final Validation and Quality Assurance
- [ ] 6.1 Execute comprehensive validation pipeline
  - Run complete TypeScript type checking with `npm run type-check` to achieve 0 errors
  - Execute dependency validation with `npm run depcruise` to ensure no violations
  - Perform production build validation with `npm run build:production`
  - Run smoke tests with `npm run test:smoke` to ensure no regressions
  - _Requirements: 1.1, 3.3, 3.4, 3.5_

- [ ] 6.2 Validate system stability and contract compliance
  - Confirm no changes to `contracts/**` or public API shapes
  - Verify database schema and migrations remain unchanged
  - Validate that external behavior and contracts are preserved
  - Run full test suite to ensure no functional regressions
  - _Requirements: 2.1, 2.2, 2.5, 7.3_

- [ ] 6.3 Document remediation results and create maintenance guidelines
  - Generate final error count report showing before/after metrics
  - Document all keystone fixes and their impact on error reduction
  - Create maintenance guidelines for preventing TypeScript error regression
  - Establish ongoing monitoring and validation processes
  - _Requirements: 5.3, 5.4, 7.5_