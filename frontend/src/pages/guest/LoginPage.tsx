import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User, Phone, KeyRound, ShieldCheck, LoaderCircle } from 'lucide-react';
import { adminLogin, requestOtp, verifyOtp } from '../../api/client';
import { getAuthSession, getHomeRouteForRole, saveAuthSession, type UserRole } from '../../lib/auth';

type ApiError = { response?: { data?: { error?: string; details?: Record<string, string> | string[] } } };

const RECENT_GUEST_KEY = 'recentLogin.guest';
const RECENT_DRIVER_KEY = 'recentLogin.driver';
const RECENT_ADMIN_KEY = 'recentLogin.admin';

function extractApiError(err: unknown, fallback: string): string {
  const data = (err as ApiError)?.response?.data;
  if (data?.details) {
    if (Array.isArray(data.details)) {
      const msg = data.details[0];
      if (msg) return msg;
    } else {
      const msg = Object.values(data.details)[0];
      if (msg) return msg;
    }
  }
  return data?.error || fallback;
}

export default function LoginPage() {
  const [role, setRole] = useState<UserRole>('GUEST');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      navigate(getHomeRouteForRole(session.user.role), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    setOtpRequested(false);
    setOtp('');
    setDemoOtp('');
    setError('');

    if (typeof window === 'undefined') {
      return;
    }

    if (role === 'GUEST') {
      setUsername('');
      setPassword('');
      const saved = window.localStorage.getItem(RECENT_GUEST_KEY);
      setName('');
      setPhone('');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { name?: string; phone?: string };
          setName(parsed.name ?? '');
          setPhone(parsed.phone ?? '');
        } catch {
          window.localStorage.removeItem(RECENT_GUEST_KEY);
        }
      }
    } else if (role === 'DRIVER') {
      setUsername('');
      setPassword('');
      const saved = window.localStorage.getItem(RECENT_DRIVER_KEY);
      setPhone('');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { phone?: string };
          setPhone(parsed.phone ?? '');
        } catch {
          window.localStorage.removeItem(RECENT_DRIVER_KEY);
        }
      }
      setName('');
    } else {
      setName('');
      setPhone('');
      const saved = window.localStorage.getItem(RECENT_ADMIN_KEY);
      setUsername('');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { username?: string };
          setUsername(parsed.username ?? '');
        } catch {
          window.localStorage.removeItem(RECENT_ADMIN_KEY);
        }
      }
      setName('');
      setPhone('');
    }
  }, [role]);

  const sanitizePhone = (value: string) => {
    const digits = value.replace(/[^\d]/g, '');
    return digits.startsWith('91') && digits.length === 12 ? digits.substring(2) : digits.slice(-10);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const sanitizedPhone = sanitizePhone(phone);
      const response = role === 'GUEST'
        ? await requestOtp({ name: name.trim(), phone: sanitizedPhone, role: 'GUEST' })
        : await requestOtp({ phone: sanitizedPhone, role: 'DRIVER' });
      setPhone(sanitizedPhone);
      setOtpRequested(true);
      setDemoOtp(response.data.otp);
      setOtp(response.data.otp); // auto-fill OTP for convenience
      if (role === 'GUEST') {
        window.localStorage.setItem(RECENT_GUEST_KEY, JSON.stringify({ name: name.trim(), phone: sanitizedPhone }));
      } else {
        window.localStorage.setItem(RECENT_DRIVER_KEY, JSON.stringify({ phone: sanitizedPhone }));
      }
    } catch (err) {
      setError(extractApiError(err, 'Failed to request OTP. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await verifyOtp({
        phone: sanitizePhone(phone),
        otp: otp.trim(),
        role: role === 'GUEST' ? 'GUEST' : 'DRIVER',
      });
      saveAuthSession(response.data);
      navigate(getHomeRouteForRole(response.data.user.role), { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'Failed to verify OTP. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await adminLogin({ username: username.trim(), password });
      window.localStorage.setItem(RECENT_ADMIN_KEY, JSON.stringify({ username: username.trim() }));
      saveAuthSession(response.data);
      navigate(getHomeRouteForRole(response.data.user.role), { replace: true });
    } catch (err) {
      setError(extractApiError(err, 'Admin login failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isOtpRole = role === 'GUEST' || role === 'DRIVER';

  return (
    <div className="wedding-app-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="wedding-icon-tile mb-4">
            <Car className="w-8 h-8" style={{ color: 'var(--w-accent-strong)' }} />
          </div>
          <h1 className="text-4xl font-bold" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>Event Transport</h1>
          <p className="mt-2" style={{ color: 'var(--w-muted)' }}>Get a ride to and from the venue</p>
        </div>

        <div className="wedding-shell rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['GUEST', 'DRIVER', 'ADMIN'] as UserRole[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${role === option ? 'wedding-button-primary' : 'border border-[var(--w-border)] text-[var(--w-muted)]'}`}
              >
                {option === 'GUEST' ? 'Guest' : option === 'DRIVER' ? 'Driver' : 'Admin'}
              </button>
            ))}
          </div>

          {role === 'ADMIN' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--w-muted)', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Admin Username</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--w-muted)' }} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="wedding-input pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--w-muted)', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--w-muted)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="wedding-input pl-10"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 wedding-button-primary" disabled={submitting}>
                <span className="inline-flex items-center justify-center gap-2">
                  {submitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  Sign in as Admin
                </span>
              </button>
            </form>
          ) : (
            <form onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp} className="space-y-4">
              {role === 'GUEST' && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--w-muted)', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--w-muted)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="wedding-input pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--w-muted)', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--w-muted)' }} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="wedding-input pl-10"
                    required
                    disabled={otpRequested}
                  />
                </div>
              </div>

              {otpRequested && (
                <>
                  <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--w-border)', color: 'var(--w-muted)' }}>
                    Your OTP: <span className="font-mono font-bold tracking-[0.2em]" style={{ color: 'var(--w-accent-strong)' }}>{demoOtp}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--w-muted)', fontFamily: "'Cinzel', serif", letterSpacing: '0.05em' }}>Enter OTP</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--w-muted)' }} />
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        className="wedding-input pl-10 tracking-[0.35em]"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm border" style={{ color: '#991b1b', background: '#fef2f2', borderColor: '#fecaca' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="w-full py-3 wedding-button-primary" disabled={submitting || (role === 'GUEST' && !name.trim()) || !phone.trim() || (otpRequested && otp.trim().length !== 6)}>
                <span className="inline-flex items-center justify-center gap-2">
                  {submitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
                  {otpRequested ? 'Verify & Continue' : `Send ${isOtpRole ? 'OTP' : 'Code'}`}
                </span>
              </button>

              {otpRequested && (
                <button
                  type="button"
                  onClick={() => {
                    setOtpRequested(false);
                    setOtp('');
                    setDemoOtp('');
                    setError('');
                  }}
                  className="w-full py-3 rounded-xl border text-sm font-semibold"
                  style={{ borderColor: 'var(--w-border)', color: 'var(--w-muted)' }}
                >
                  Use a different number
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
