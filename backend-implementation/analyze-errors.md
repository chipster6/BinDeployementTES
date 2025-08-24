# TypeScript Error Analysis Report

## Summary
- **Total Errors**: 5201
- **Unique Error Codes**: 34+
- **Files Affected**: Multiple across controllers, services, models, and routes

## Top Error Patterns

### 1. TS2339 - Property does not exist (250 occurrences)
Most common pattern - properties missing on types, especially:
- `req.ip`, `req.params`, `req.query` on AuthenticatedRequest
- Properties on req.body being treated as ReadableStream

### 2. TS2304 - Cannot find name (141 occurrences)
Missing imports or undefined types

### 3. TS2345 - Argument not assignable (124 occurrences)
Type mismatches in function arguments

### 4. TS2554 - Expected X arguments (68 occurrences)
Function call signature mismatches

### 5. TS2323 - Type not assignable (46 occurrences)
Type assignment incompatibilities

### 6. TS1484 - Export = in ambient context (45 occurrences)
Module declaration issues

## Most Affected Files
1. RouteOptimizationService.ts - 112 errors
2. MLSecurityController.ts - 97 errors
3. errorPrediction.ts - 81 errors
4. BillingService.ts - 79 errors
5. AI routes index - 77 errors

## Root Cause Categories Identified
1. **Request Type Issues** - AuthenticatedRequest missing Express properties
2. **req.body Type Issues** - Being treated as ReadableStream instead of parsed JSON
3. **Missing Type Imports** - Many undefined types
4. **Module Declaration Issues** - Ambient context problems
5. **Function Signature Mismatches** - Wrong argument counts/types
