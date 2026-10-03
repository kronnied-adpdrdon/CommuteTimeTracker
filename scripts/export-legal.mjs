// Writes docs/privacy-policy.md and docs/terms.md from src/lib/legal.ts (the single source of truth).
// Run: npm run export:legal   (optionally NEXT_PUBLIC_SUPPORT_EMAIL=you@example.com to include a contact address)
import { writeFileSync } from 'node:fs';
import { PRIVACY_POLICY, TERMS, toMarkdown } from '../src/lib/legal.ts';

const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || undefined;
writeFileSync(new URL('../docs/privacy-policy.md', import.meta.url), toMarkdown(PRIVACY_POLICY, email));
writeFileSync(new URL('../docs/terms.md', import.meta.url), toMarkdown(TERMS, email));
console.log('Wrote docs/privacy-policy.md and docs/terms.md');
