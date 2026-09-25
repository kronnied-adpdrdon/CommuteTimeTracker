'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    setIsLoading(true);
    // Mock API call to send OTP
    setTimeout(() => {
      setStep('otp');
      setIsLoading(false);
    }, 1000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setIsLoading(true);
    // Mock API call to verify OTP
    setTimeout(() => {
      setIsLoading(false);
      router.push('/');
    }, 1000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <h1>TrackOT</h1>
        <p>Simple & secure overtime tracking</p>
      </div>

      <div className={`glass-panel ${styles.loginCard}`}>
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="animate-fade-in">
            <div className={styles.formGroup}>
              <label htmlFor="phone">Mobile Number</label>
              <input
                id="phone"
                type="tel"
                className="input-field"
                placeholder="+1 (555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
            <p className={styles.otpInfo}>
              We will send a one-time password to verify your number. No password required.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="animate-fade-in">
            <div className={styles.formGroup}>
              <label htmlFor="otp">Enter OTP</label>
              <input
                id="otp"
                type="text"
                className="input-field"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.2rem' }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button 
              type="button" 
              className={styles.resendLink}
              onClick={() => setStep('phone')}
            >
              Change number or resend OTP
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
