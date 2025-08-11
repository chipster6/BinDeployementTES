
import { ConsistencyValidator } from './consistency-validator/ConsistencyValidator';
import { logger } from './consistency-validator/logger';
import chokidar from 'chokidar';
import path from 'path';

async function main() {
  const validator = new ConsistencyValidator();
  const args = process.argv.slice(2);

  if (args.includes('--watch')) {
    logger.info('Starting continuous consistency monitoring...');
    
    await validator.runFullValidation();
    logger.info(`Initial validation completed.`);

    const watcher = chokidar.watch([
      path.join(validator.config.artifactsDir, '**/*'),
      path.join(validator.config.backendDir, 'src/**/*')
    ], {
      ignored: /node_modules/,
      persistent: true
    });

    let validationTimeout: NodeJS.Timeout;
    watcher.on('change', (filePath) => {
      logger.info(`File changed: ${path.basename(filePath)}`);
      
      clearTimeout(validationTimeout);
      validationTimeout = setTimeout(async () => {
        logger.info('Running consistency validation...');
        const result = await validator.runFullValidation();
        if (result.criticalIssues > 0) {
          logger.error(`${result.criticalIssues} critical inconsistencies detected!`);
        } else {
          logger.info('Consistency validation passed');
        }
      }, 2000);
    });

    logger.info('Continuous monitoring active...');
  } else {
    const result = await validator.runFullValidation();
    const exitCode = result.criticalIssues > 0 ? 1 : 0;
    process.exit(exitCode);
  }
}

main().catch(error => {
  logger.error('VALIDATION SYSTEM ERROR:', error);
  process.exit(1);
});
