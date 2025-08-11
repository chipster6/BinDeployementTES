
export interface Inconsistency {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  description: string;
  impact: string;
  recommendations?: string[];
  affectedFiles?: string[];
  affectedModels?: string[];
  affectedEndpoints?: any[];
  category: string;
  timestamp: Date;
}

export interface ValidationResult {
  status: 'CONSISTENT' | 'MINOR_ISSUES' | 'CRITICAL_ISSUE' | 'VALIDATION_ERROR';
  summary: string;
  inconsistencies: Inconsistency[];
  metrics?: Record<string, any>;
  error?: string;
}

export interface ValidationReport {
  summary: {
    totalInconsistencies: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    categories: number;
  };
  validation_results: Record<string, ValidationResult>;
  inconsistencies: Inconsistency[];
  recommendations: any[];
}
