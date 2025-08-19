// tools/orchestrator.ts
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import toposort from "toposort";
import { z } from "zod";
import { HandoffEnvelope as HandoffEnvelopeSchema } from "../packages/agent-sdk/schemas";

type AgentDef = { id: string; requires: string[]; emits: string[] };

const ROOT = path.resolve(".autonomous");
const RUN = process.env.RUN_ID ?? Date.now().toString();
const RUN_DIR = path.join(ROOT, "runs", RUN);
const ENVELOPES_DIR = path.join(RUN_DIR, "envelopes");
const ARTIFACTS_DIR = path.join(RUN_DIR, "artifacts");

function readWorkflow(): AgentDef[] {
  const y = yaml.load(fs.readFileSync(path.join(ROOT, "workflow.yaml"), "utf8")) as any;
  if (!Array.isArray(y?.agents)) throw new Error("workflow.yaml missing 'agents' array");
  return y.agents as AgentDef[];
}

function depsToEdges(agents: AgentDef[]) {
  const edges: [string, string][] = [];
  agents.forEach(a => (a.requires || []).forEach(r => edges.push([r, a.id])));
  return edges;
}

function latestArtifacts(kinds: string[]) {
  if (!fs.existsSync(ARTIFACTS_DIR)) return [];
  const all = fs.readdirSync(ARTIFACTS_DIR);
  return kinds.flatMap(k =>
    all
      .filter(f => f.startsWith(`${k}@`))
      .sort()
      .slice(-1)
      .map(f => ({ kind: k, uri: path.join(ARTIFACTS_DIR, f) }))
  );
}

function extForMime(mime: string) {
  if (mime.includes("json")) return "json";
  if (mime.includes("markdown") || mime.includes("md")) return "md";
  if (mime.includes("yaml") || mime.includes("yml")) return "yaml";
  if (mime.includes("sql")) return "sql";
  if (mime.includes("octet-stream")) return "bin";
  if (mime.includes("text")) return "txt";
  return "dat";
}

/**
 * Replace this with your real model invocation.
 * It must return a stringified JSON matching the HandoffEnvelope schema.
 */
async function invokeClaude(agentId: string, prompt: string): Promise<string> {
  throw new Error(`[invokeClaude] Not implemented. You must connect this to Claude Code/Tools (or your LLM runtime).
Expected behavior:
- Send 'prompt' as system+user content to the agent with id = ${agentId}.
- Ensure the model returns ONLY valid JSON for HandoffEnvelope.
`);
}

/**
 * Reads binary or text content referenced by artifacts in the envelope from the model output.
 * For initial integration, allow agents to include inline content via artifacts[n].meta.inlineContent.
 */
function resolveArtifactContent(artifact: any): Buffer {
  if (artifact?.meta?.inlineContent != null) {
    const content = artifact.meta.inlineContent;
    if (typeof content === "string") return Buffer.from(content, "utf8");
    if (content?.base64) return Buffer.from(content.base64, "base64");
  }
  // If your runtime returns file handles, implement fetching here.
  throw new Error(`Artifact content for ${artifact.kind}@${artifact.version} is not resolvable. Provide meta.inlineContent or integrate storage fetch.`);
}

async function invokeAgent(agentId: string, context: { artifacts: { kind: string; uri: string }[] }) {
  const prompt = [
    `You are ${agentId}.`,
    `Consume only the provided artifacts.`,
    `Emit ONLY your declared artifact kinds.`,
    `Return a JSON string matching the HandoffEnvelope schema exactly.`,
    `Artifacts provided:\n${context.artifacts.map(a => `- ${a.kind}: ${a.uri}`).join("\n")}`,
    ``,
    `Rules:`,
    `- If required inputs are missing, emit an envelope with openQuestions explaining the missing kinds; do not fabricate.`,
    `- If no changes are needed, emit a no-op envelope (artifacts: []) with a summary.`,
  ].join("\n\n");

  const response = await invokeClaude(agentId, prompt);
  const parsed = HandoffEnvelopeSchema.parse(JSON.parse(response));
  return parsed;
}

async function main() {
  fs.mkdirSync(ENVELOPES_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const agents = readWorkflow();
  const order = toposort(depsToEdges(agents));

  for (const id of order) {
    const def = agents.find(a => a.id === id)!;
    const neededKinds = new Set<string>();
    (def.requires || []).forEach(r => {
      const req = agents.find(a => a.id === r);
      (req?.emits || []).forEach(k => neededKinds.add(k));
    });

    const context = { artifacts: latestArtifacts([...neededKinds]) };
    const env = await invokeAgent(def.id, context);

    const idx = `${String(order.indexOf(id) + 1).padStart(3, "0")}-${id.replace(/\s+/g, "_")}`;
    fs.writeFileSync(path.join(ENVELOPES_DIR, `${idx}.json`), JSON.stringify(env, null, 2));

    for (const a of env.artifacts) {
      const out = path.join(ARTIFACTS_DIR, `${a.kind}@${a.version}.${extForMime(a.mime)}`);
      if (!fs.existsSync(out)) {
        const content = resolveArtifactContent(a);
        fs.writeFileSync(out, content);
      }
    }
  }

  // Emit manifest
  const manifest = fs.readdirSync(ENVELOPES_DIR).map(f =>
    JSON.parse(fs.readFileSync(path.join(ENVELOPES_DIR, f), "utf8"))
  );
  fs.writeFileSync(path.join(RUN_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
