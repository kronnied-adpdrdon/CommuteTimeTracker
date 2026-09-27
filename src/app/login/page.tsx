'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');

  const handleSendOTP = () => {
    if (phone.length >= 10) setStep(2);
  };

  const handleVerify = () => {
    router.push('/');
  };

  return (
    <div className={styles.loginContainer}>
      {step === 2 && (
        <button className={styles.backButton} onClick={() => setStep(1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
      )}

      <div className={styles.logoWrapper} style={{ marginTop: step === 1 ? '40px' : '0' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
      </div>
      
      <h1 className={styles.title}>Track Commute</h1>
      <p className={styles.subtitle}>Track your commute.<br/>Know your time and distance.</p>

      {step === 1 ? (
        <>
          <p className={styles.inputLabel}>Enter your mobile number to continue</p>
          
          <div className={styles.phoneInputWrapper}>
            <div className={styles.countryCode}>+91 <span style={{marginLeft: '4px', fontSize: '0.8rem'}}>▼</span></div>
            <input 
              type="tel" 
              className={`input-field ${styles.phoneInput}`} 
              placeholder="Enter mobile number" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button className="btn-primary" onClick={handleSendOTP}>Send OTP</button>

          <p className={styles.termsText}>
            By continuing, you agree to our<br/>Terms of Use and Privacy Policy.
          </p>
        </>
      ) : (
        <>
          <p className={styles.inputLabel}>Enter the 6-digit OTP sent to<br/><strong style={{color: 'var(--text-primary)'}}>+91 {phone}</strong> <span style={{color: 'var(--primary-blue)', cursor: 'pointer'}}>✎</span></p>
          
          <div className={styles.otpInputWrapper}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <input key={i} type="text" maxLength={1} className={styles.otpBox} />
            ))}
          </div>

          <p className={styles.resendText}>Resend OTP in 00:30</p>

          <button className="btn-primary" onClick={handleVerify} style={{ opacity: 0.6 }}>Verify OTP</button>
        </>
      )}
    </div>
  );
}
