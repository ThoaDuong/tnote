import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="privacy-policy-page" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'transparent', cursor: 'pointer', marginBottom: '24px', color: 'var(--text-secondary)' }}
      >
        <ArrowLeftIcon style={{ width: 20, height: 20 }} />
        Back
      </button>

      <h1 style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--text-primary)' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Last updated: May 1, 2026</p>

      <div style={{ lineHeight: '1.6', color: 'var(--text-primary)' }}>
        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>1. Information We Collect</h2>
        <p>When you use the TNote Chrome Extension and Web Application, we collect the information you explicitly provide, such as your notes, folder structures, and account details (via Google Login). We do not collect browsing history or track your web activity outside of the extension's explicit functionality.</p>

        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>2. How We Use Your Information</h2>
        <p>The information we collect is strictly used to provide the note-taking service. This includes saving your notes, syncing them across your devices, and personalizing your dashboard.</p>

        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>3. Data Storage and Security</h2>
        <p>Your notes and account data are stored securely. Authentication is handled via industry-standard protocols. The extension uses your local browser storage to cache notes for offline capabilities and faster load times.</p>

        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>4. Sharing of Information</h2>
        <p>We do not sell, rent, or trade your personal information or notes with third parties. Your data is strictly yours.</p>

        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>5. Your Rights</h2>
        <p>You have the right to access, edit, or delete your data at any time. You can delete notes directly from the dashboard, and you can revoke your account access at any time.</p>

        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>6. Changes to This Policy</h2>
        <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>

        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '12px' }}>Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us.</p>
      </div>
    </div>
  );
}
