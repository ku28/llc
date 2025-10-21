import { useState } from 'react';
import { useRouter } from 'next/router';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!password || !confirm) return setError('Please fill both fields');
    if (password !== confirm) return setError('Passwords do not match');
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setSuccess('Password updated! You can now login.');
    else setError(data.error || 'Error resetting password');
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">New Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="p-2 border rounded w-full mb-4" />
        <label className="block mb-2">Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="p-2 border rounded w-full mb-4" />
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Updating...' : 'Reset Password'}</button>
      </form>
    </div>
  );
}
