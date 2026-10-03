import LegalPage from '@/components/LegalPage';
import { TERMS } from '@/lib/legal';

export default function TermsPage() {
  return <LegalPage doc={TERMS} other={{ href: '/privacy', label: 'Read the Privacy Policy' }} />;
}
