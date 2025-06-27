import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState } from 'react';

export default function SettingsPage() {
  const { user } = useFirebaseAuth();
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handlePasswordReset = async () => {
    setResetMsg('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetMsg('Password reset email sent! Please check your inbox or spam folder).');
    } catch (err) {
      setResetMsg('Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-zinc-100">Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-center items-start pt-16 px-4">
        <div className="w-full max-w-md bg-zinc-900/90 rounded-2xl shadow-xl border border-zinc-800 p-8">
          {/* Profile Section */}
          <div className="flex flex-col items-center mb-8">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarFallback className="bg-zinc-700 text-zinc-200 text-3xl font-medium">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-medium text-zinc-100 mb-1">Profile Settings</h2>
            <p className="text-sm text-zinc-400">Manage your account preferences</p>
          </div>

          {/* Email Field */}
          <div className="mb-6">
            <label className="block text-zinc-300 text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-not-allowed"
              value={user?.email || ''}
              readOnly
              disabled
            />
            <p className="text-xs text-zinc-500 mt-1">Your email address cannot be changed</p>
          </div>

          {/* Password Reset Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Password</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Click below to receive a password reset link via email
              </p>
            </div>
            
            <Button 
              onClick={handlePasswordReset} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={resetLoading}
            >
              {resetLoading ? 'Sending Reset Email...' : 'Send Password Reset Email'}
            </Button>

            {resetMsg && (
              <div className={`text-center text-sm font-medium p-3 rounded-lg ${
                resetMsg.includes('sent') 
                  ? 'text-green-400 bg-green-900/20 border border-green-800' 
                  : 'text-red-400 bg-red-900/20 border border-red-800'
              }`}>
                {resetMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}