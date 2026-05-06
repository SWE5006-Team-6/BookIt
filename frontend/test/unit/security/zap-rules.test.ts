/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const workflow = readFileSync(resolve(repoRoot, '.github/workflows/dast.yml'), 'utf8');
const frontendRules = readFileSync(
  resolve(repoRoot, '.zap/rules-frontend.tsv'),
  'utf8',
);
const backendRules = readFileSync(
  resolve(repoRoot, '.zap/rules-backend.tsv'),
  'utf8',
);

const ruleAction = (rules: string, alertId: string) => {
  const line = rules
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${alertId}\t`));

  if (!line) {
    throw new Error(`Missing ZAP rule ${alertId}`);
  }

  return line.split('\t')[1];
};

describe('ZAP scan rules', () => {
  it('uses target-specific rules for frontend and backend scans', () => {
    expect(workflow).toContain('rules_file_name: ".zap/rules-frontend.tsv"');
    expect(workflow).toContain('rules_file_name: ".zap/rules-backend.tsv"');
    expect(workflow).not.toContain('rules_file_name: ".zap/rules.tsv"');
  });

  it('ignores the Chakra style CSP exception only for the frontend scan', () => {
    expect(ruleAction(frontendRules, '10055')).toBe('IGNORE');
    expect(ruleAction(backendRules, '10055')).toBe('WARN');
  });
});
