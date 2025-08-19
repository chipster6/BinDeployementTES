// packages/agent-sdk/schemas.ts
import { z } from "zod";

export const HandoffEnvelope = z.object({
  runId: z.string(),
  to: z.string(),
  from: z.string(),
  timestamp: z.string(),
  summary: z.string(),
  dependenciesResolved: z.array(z.string()),
  artifacts: z.array(z.object({
    kind: z.string(),
    version: z.string(),
    uri: z.string(),
    mime: z.string(),
    meta: z.record(z.any())
  })),
  decisions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  risks: z.array(z.string()),
  nextActions: z.array(z.string())
});
export type HandoffEnvelope = z.infer<typeof HandoffEnvelope>;

export const ArtifactKinds = {
  ArchitectureSpec: "ArchitectureSpec",
  SecurityStandard: "SecurityStandard",
  DBSchema: "DBSchema",
  APIContracts: "APIContracts",
  APIClient: "APIClient",
  WebhookSpec: "WebhookSpec",
  CachingPlan: "CachingPlan",
  BackendRoutes: "BackendRoutes",
  FrontendComponents: "FrontendComponents",
  ErrorHandlingPolicy: "ErrorHandlingPolicy",
  TestReport: "TestReport",
  DocsBundle: "DocsBundle",
  CICDPipeline: "CICDPipeline",
} as const;

export type ArtifactKind = typeof ArtifactKinds[keyof typeof ArtifactKinds];
