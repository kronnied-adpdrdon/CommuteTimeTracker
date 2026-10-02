import ComposeForm from '@/components/ComposeForm';
import PageHeader from '@/components/PageHeader';

export default function FeedbackPage() {
  return (
    <>
      <PageHeader title="Send feedback" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ComposeForm mode="feedback" />
      </div>
    </>
  );
}
