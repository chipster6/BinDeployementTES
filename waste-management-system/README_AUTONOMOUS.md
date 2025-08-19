# Autonomous Workflow Bundle

This bundle adds:
- `.autonomous/workflow.yaml` — the dependency DAG
- `packages/agent-sdk/schemas.ts` — shared HandoffEnvelope + artifact kinds
- `tools/orchestrator.ts` — runs agents in topological order and persists handoffs

## Install (Node 20+)

```bash
npm i -D typescript ts-node @types/node
npm i zod js-yaml toposort
```

Add scripts to your repo `package.json`:
```json
{
  "scripts": {
    "orchestrate": "ts-node tools/orchestrator.ts"
  }
}
```

Create `tsconfig.json` if you don't have one:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["tools/**/*.ts", "packages/**/*.ts"]
}
```

## Wire up your model

In `tools/orchestrator.ts`, implement `invokeClaude(agentId, prompt)` to call Claude Code/Tools (or your runtime). The function **must** return a JSON string matching `HandoffEnvelope`.

**Temporary path:** have each agent return artifacts with `meta.inlineContent` (string or `{base64}`) so the orchestrator can persist them. Later, replace with your file-store integration.

## Agent prompt contract

Each agent must:
1. Read only the artifact kinds emitted by its dependencies.
2. Emit only its declared kinds (see `workflow.yaml`).
3. Return a single HandoffEnvelope JSON with any artifacts referenced by `uri` and content provided via `meta.inlineContent` (until you swap in storage).

Recommended per-agent system preamble:
```
You are <AGENT_ID>. Consume only provided artifacts. Emit only <KIND_1, KIND_2,...>.
If inputs are missing, produce openQuestions instead of guessing.
Return ONLY a JSON HandoffEnvelope. Do not include prose.
```

## Run a full workflow

```bash
# Optionally set a run id
export RUN_ID=$(date +%s)

# Execute
npm run orchestrate
```

Artifacts and envelopes will be written under `.autonomous/runs/$RUN_ID/`.

## Smoke test with a stub

Before wiring the real model, temporarily edit `invokeClaude` to return a minimal no-op envelope for the first agent and watch the pipeline succeed. Example return (stringified):
```json
{
  "runId": "123",
  "to": "ARCHITECTURE AGENT",
  "from": "ARCHITECTURE AGENT",
  "timestamp": "2025-08-09T00:00:00Z",
  "summary": "no-op for smoke test",
  "dependenciesResolved": [],
  "artifacts": [{
    "kind": "ArchitectureSpec",
    "version": "1.0.0",
    "uri": "inline://ArchitectureSpec@1.0.0",
    "mime": "application/json",
    "meta": {
      "inlineContent": "{\"name\": \"Test\"}"
    }
  }],
  "decisions": [],
  "openQuestions": [],
  "risks": [],
  "nextActions": []
}
```

## Folder hygiene

Add this to `.gitignore` if desired:
```
.autonomous/runs/
```

## Next steps
- Replace the temporary inline content path with a shared object store for artifacts (e.g., S3, GCS, or local blob store).
- Add per-agent system prompts to your model config.
- Extend `ArtifactKinds` if you add new, stable deliverables.
- Enforce semver on `version` fields to enable delta builds.
