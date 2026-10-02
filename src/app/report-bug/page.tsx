import ComposeForm from '@/components/ComposeForm';
import PageHeader from '@/components/PageHeader';

export default function ReportBugPage() {
  return (
    <>
      <PageHeader title="Report a bug" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ComposeForm mode="bug" />
      </div>
    </>
  );
}
