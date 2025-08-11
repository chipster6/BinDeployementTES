
import path from 'path';

const baseDir = process.cwd();

export const config = {
  baseDir,
  artifactsDir: path.join(baseDir, 'artifacts'),
  backendDir: path.join(baseDir, 'backend-implementation'),
};
