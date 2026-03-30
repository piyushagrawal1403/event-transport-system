import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, User, Phone } from 'lucide-react';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const savedName = localStorage.getItem('guestName');
    const savedPhone = localStorage.getItem('guestPhone');
    if (savedName && savedPhone) {
      navigate('/home');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim()) {
      localStorage.setItem('guestName', name.trim());
      localStorage.setItem('guestPhone', phone.trim().replace(/[^\d]/g, '').replace(/^91/, '').slice(-10));
      navigate('/home');
    }
  };

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

        <form onSubmit={handleSubmit} className="wedding-shell rounded-2xl p-6 space-y-4">
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
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 wedding-button-primary"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
