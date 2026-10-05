// Writes docs/privacy-policy.md and docs/terms.md from src/lib/legal.ts (the single source of truth).
// Run: npm run export:legal
import { writeFileSync } from 'node:fs';
import { PRIVACY_POLICY, TERMS, toMarkdown } from '../src/lib/legal.ts';

writeFileSync(new URL('../docs/privacy-policy.md', import.meta.url), toMarkdown(PRIVACY_POLICY));
writeFileSync(new URL('../docs/terms.md', import.meta.url), toMarkdown(TERMS));
console.log('Wrote docs/privacy-policy.md and docs/terms.md');
