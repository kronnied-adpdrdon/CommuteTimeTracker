'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import styles from '../../page.module.css';
import PageHeader from '@/components/PageHeader';
import { SettingsGroup } from '@/components/SettingsList';
import { commute } from '@/lib/commute';
import { batteryAdvice } from '@/lib/setup/logic';
import { useSetup } from '@/lib/setup';

/** One question that opens to show its answer. */
function HelpItem({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className={styles.helpItem}>
      <summary>
        <span>{question}</span>
        <svg className={styles.helpChevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className={styles.helpBody}>{children}</div>
    </details>
  );
}

const InlineLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className={styles.linkButton} style={{ padding: 0 }}>{children}</Link>
);

/** Help and FAQ: short how-tos first, then the same questions as the website (less the ones only a visitor asks). */
export default function HelpPage() {
  const { manufacturer } = useSetup();
  const advice = batteryAdvice(manufacturer);

  return (
    <>
      <PageHeader title="Help and FAQ" />
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SettingsGroup title="How to">
          <HelpItem question="Automatic or Start and Stop?">
            <p>
              <strong>Automatic:</strong> save your Home and Office. A trip starts when you leave one, at any time of day, and is saved when you reach the other. You don&apos;t tap anything.
            </p>
            <p>
              <strong>Start and Stop:</strong> tap Start Tracking when you leave and Stop when you arrive, on Home, the widget or the notification.
            </p>
            <p>
              Switch in <InlineLink href="/settings/automatic">Automatic start and stop</InlineLink>.
            </p>
          </HelpItem>
          <HelpItem question="A trip started when I wasn't commuting">
            <p>Tap <strong>Not a commute</strong> on the notification or on Home, and the trip is thrown away.</p>
            <p>With automatic, you often won&apos;t need to: a detour that brings you back to where you started is dropped by itself, and so is any trip shorter than 5 minutes.</p>
          </HelpItem>
          <HelpItem question="Fix or delete a trip">
            <p>
              In <InlineLink href="/history">History</InlineLink>, tap the pencil next to a trip to change its start and end times, its distance, or whether it was to work or to home. The bin deletes it.
            </p>
            <p>Edited trips are marked with * in reports.</p>
          </HelpItem>
          <HelpItem question="Add the home-screen widget">
            <p>Touch and hold an empty spot on your home screen, tap <strong>Widgets</strong>, find <strong>MYCE</strong> and drag it onto the screen.</p>
            <p>It starts and stops a trip without opening the app, and shows today&apos;s total when no trip is running. Touch and hold it to make it wider.</p>
          </HelpItem>
          <HelpItem question={`Stop ${advice?.brand ?? 'your phone'} from closing MYCE`}>
            <p>Some phones close apps in the background to save battery. Then an automatic trip can start late, or a reminder can go missing.</p>
            <ol className={styles.setupList}>
              <li>Tap <strong>Open app settings</strong> below.</li>
              <li>{advice?.advice ?? 'Tap Battery and choose "Unrestricted".'}</li>
            </ol>
            <button className={styles.secondaryButton} style={{ marginTop: 4 }} onClick={() => commute.openSettings()}>
              Open app settings
            </button>
          </HelpItem>
          <HelpItem question="Change Home, Office or the circle size">
            <p>
              Change the addresses in <InlineLink href="/settings/places">Home and Office</InlineLink>. Make the circle around each one bigger or smaller in{' '}
              <InlineLink href="/settings/automatic">Automatic start and stop</InlineLink>: bigger if trips start late or don&apos;t end, smaller if they start while you&apos;re still at home.
            </p>
          </HelpItem>
        </SettingsGroup>

        <SettingsGroup title="Questions">
          <HelpItem question="How does automatic start and stop know it's a commute?">
            <p>
              Your phone watches for you crossing a circle around your Home and your Office, 150 metres out by default. Leaving one starts a trip; the trip is saved only when you arrive at the other. A detour to the shop that brings you back home is thrown away, and so is anything shorter than five minutes.
            </p>
          </HelpItem>
          <HelpItem question="Will it drain my battery?">
            <p>
              While you&apos;re not travelling, automatic mode relies on Android&apos;s own location circles, the same system your phone already runs for other apps, rather than keeping GPS on. GPS runs only while a trip is being recorded, and a notification always shows then. As with any app that uses GPS, battery use goes up during the trip itself.
            </p>
          </HelpItem>
          <HelpItem question="Do I need an account?">
            <p>
              No. Your Google account already does the two things an account would: Google Play remembers that you bought Pro, and Android&apos;s backup can restore your trips on a new phone.
            </p>
          </HelpItem>
          <HelpItem question="What leaves my phone?">
            <p>
              Your trips don&apos;t, unless you choose to share. When you search for an address, the text you type is sent to an address lookup service to find it. If you turn on &quot;Share commute times&quot;, rough details of each trip are sent without your name or exact locations. Turning it off deletes what was shared. See <InlineLink href="/settings/sharing">Help improve MYCE</InlineLink> and the{' '}
              <InlineLink href="/privacy">privacy policy</InlineLink>.
            </p>
          </HelpItem>
          <HelpItem question="Is my data sold?">
            <p>
              Your own data never is. If you turn on sharing, MYCE may publish or sell statistics made from many people&apos;s shared commute times, such as average commute times by area and hour. Those numbers always combine at least 20 people and contain nothing that could identify anyone. Nothing is used for advertising.
            </p>
          </HelpItem>
          <HelpItem question="How do I delete my data?">
            <p>
              Delete trips one at a time in History, or all at once in <InlineLink href="/settings/data">Your data</InlineLink>. Uninstalling the app removes everything on the phone.
            </p>
          </HelpItem>
        </SettingsGroup>

        <p className={styles.cardText} style={{ textAlign: 'center' }}>
          Still stuck? <InlineLink href="/feedback">Send feedback</InlineLink> or <InlineLink href="/report-bug">report a bug</InlineLink>.
        </p>
      </div>
    </>
  );
}
