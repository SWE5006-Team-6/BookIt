import type { ReportType } from './report-types';

export interface ReportStrategy<TReport = unknown> {
  readonly type: ReportType;
  generate(month?: string, now?: Date): Promise<TReport>;
}
