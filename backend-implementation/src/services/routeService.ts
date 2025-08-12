import { Application } from "express";
import { glob } from "glob";
import path from "path";
import { logger } from "@/utils/logger";
import { config } from "@/config";
import healthRoutes from "@/routes/health";

export class RouteService {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  public async initialize(): Promise<void> {
    logger.info("Initializing routes...");

    // Register health routes first (outside API prefix)
    this.app.use("/health", healthRoutes);
    logger.info("- /health routes registered");

    const routePath = path.join(__dirname, "../routes/**/*.routes.{ts,js}");
    const routeFiles = await glob(routePath);

    for (const file of routeFiles) {
      const routeModule = await import(file);
      if (routeModule.default) {
        const routeName = path.basename(file).split(".")[0];
        this.app.use(
          `/api/${config.api.version}/${routeName}`,
          routeModule.default,
        );
        logger.info(`- /${routeName} routes registered`);
      }
    }

    // 404 handler for undefined API routes
    this.app.use("/api/*", (req, res) => {
      res.status(404).json({
        error: "not_found",
        message: `The requested API endpoint does not exist: ${req.originalUrl}`,
      });
    });

    logger.info("Routes initialized successfully");
  }
}
