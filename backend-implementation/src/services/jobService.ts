import { logger } from "@/utils/logger";
import { jobQueue } from "@/services/jobQueue";
import { config } from "@/config";

export class JobService {
  public async initialize(): Promise<void> {
    if (config.queue.enabled) {
      logger.info("Initializing job queue...");
      try {
        await jobQueue.initialize();
        logger.info("Job queue initialized successfully");
      } catch (error) {
        logger.error("Job queue initialization failed:", error);
        // Do not throw, as the queue might not be critical
      }
    }
  }

  public async close(): Promise<void> {
    if (config.queue.enabled && jobQueue.isInitialized()) {
      await jobQueue.close();
      logger.info("Job queue closed");
    }
  }
}
