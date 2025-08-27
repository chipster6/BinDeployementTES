/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { 
      name: "no-circular", 
      severity: "error", 
      from: {}, 
      to: { circular: true } 
    },
    {
      name: "no-domain-imports-legacy",
      severity: "error",
      from: { 
        path: "^backend-implementation/src/domain/" 
      },
      to: { 
        path: "^backend-implementation/src/(controllers|services|models|infrastructure)"
      },
      comment: "Domain layer should not import from any other layer"
    },
    {
      name: "no-application-imports-legacy",
      severity: "error",
      from: { 
        path: "^backend-implementation/src/application/" 
      },
      to: { 
        path: "^backend-implementation/src/(controllers|services|models|infrastructure)"
      },
      comment: "Application layer should not import from controllers, services, models, or infrastructure"
    },
    {
      name: "infrastructure-can-import-models",
      severity: "warn",
      from: { 
        path: "^backend-implementation/src/infrastructure/" 
      },
      to: { 
        path: "^backend-implementation/src/controllers"
      },
      comment: "Infrastructure should not import controllers (but models/services OK during transition)"
    }
  ],
  options: { 
    doNotFollow: { path: "node_modules" }, 
    tsPreCompilationDeps: true, 
    combinedDependencies: true 
  }
};
