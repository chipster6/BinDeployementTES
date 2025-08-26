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
