import LegalPage from '@/components/LegalPage';
import { PRIVACY_POLICY } from '@/lib/legal';

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY_POLICY} other={{ href: '/terms', label: 'Read the Terms and Conditions' }} />;
}
