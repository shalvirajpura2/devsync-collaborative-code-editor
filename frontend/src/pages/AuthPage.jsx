import { useState, useEffect } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Github, Mail, Eye, EyeOff, Lock } from 'lucide-react';
import { sendEmailVerification, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import DevSyncLogo from '@/assets/devsync-logo.png';
import AuthGirlImg from '@/assets/auth girl.png';
import axios from 'axios';

export default function AuthPage() {
  const { user, loading, error, login, signup } = useFirebaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && submitted && isSignup && !user.emailVerified && !verificationSent) {
      sendVerification();
    }
    // If user is logged in and verified, redirect
    if (user && user.emailVerified && submitted) {
      navigate('/app');
    }
  }, [user, submitted, isSignup, verificationSent, navigate]);

  // Auto-refresh for email verification
  useEffect(() => {
    if (user && isSignup && !user.emailVerified) {
      const interval = setInterval(async () => {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          navigate('/app');
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, isSignup, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (isSignup) {
      await signup(email, password);
      // Verification will be sent in useEffect
    } else {
      await login(email, password);
    }
  };

  const sendVerification = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      try {
        await sendEmailVerification(auth.currentUser);
        setVerificationSent(true);
        setResendError("");
      } catch (err) {
        setResendError("Failed to send verification email.");
      }
    }
  };

  const handleForgotPassword = async () => {
    setForgotMsg("");
    setForgotLoading(true);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setForgotMsg("Please enter your email address first.");
      setForgotLoading(false);
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setForgotMsg("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setForgotMsg("Failed to send reset email. Please check the email address and try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Add a function to map Firebase error codes to user-friendly messages
  const getFriendlyError = (err) => {
    if (!err) return '';
    if (typeof err === 'string') {
      if (err.includes('auth/invalid-credential')) return 'Invalid email or password.';
      if (err.includes('auth/user-not-found')) return 'No account found with this email.';
      if (err.includes('auth/wrong-password')) return 'Incorrect password.';
      if (err.includes('auth/email-already-in-use')) return 'This email is already registered.';
      if (err.includes('auth/weak-password')) return 'Password should be at least 6 characters.';
      if (err.includes('auth/invalid-email')) return 'Please enter a valid email address.';
      return 'Authentication failed. Please try again.';
    }
    return 'Authentication failed. Please try again.';
  };

  if (user && isSignup && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100">
        <div className="w-full max-w-md bg-zinc-900/90 rounded-xl shadow-2xl border border-zinc-800 p-8 flex flex-col items-center">
          <img src={DevSyncLogo} alt="DevSync Logo" className="w-32 h-12 object-contain shadow-lg mb-2" />
          <h2 className="text-xl font-bold mb-2 text-center">Verify Your Email</h2>
          <p className="mb-4 text-center text-zinc-300">
            A verification link has been sent to <span className="font-semibold text-indigo-300">{user.email}</span>.<br />
            Please verify your email to continue (check spam folder too).
          </p>
          <Button onClick={sendVerification} disabled={resendLoading || verificationSent} className="mb-2 w-full">
            {resendLoading ? 'Sending...' : verificationSent ? 'Verification Sent' : 'Resend Verification Email'}
          </Button>
          {resendError && <div className="text-red-400 text-sm text-center mb-2">{resendError}</div>}
        
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100">
      <div className="flex w-full max-w-4xl bg-zinc-900/90 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden min-h-[32rem]">
        {/* Left Side (Form) */}
        <div className="flex-1 flex flex-col justify-center p-8 h-full">
          <img src={DevSyncLogo} alt="DevSync Logo" className="w-36 h-14 object-contain mb-8" />
          <h2 className="text-3xl font-bold mb-2">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="text-zinc-400 mb-8">{isSignup ? 'Sign up to get started with DevSync.' : 'Please enter your details'}</p>
          <form className="flex flex-col gap-6" onSubmit={handleSubmit} autoComplete="on">
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-zinc-300 text-sm mb-1">Email address</label>
              <input
                className="bg-zinc-800 border border-zinc-700 rounded px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                id="email"
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1 relative">
  <label htmlFor="password" className="text-zinc-300 text-sm mb-1">Password</label>
  
  <input
    className="bg-zinc-800 border border-zinc-700 rounded px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full pr-12"
    placeholder="Enter your password"
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={e => setPassword(e.target.value)}
    required
    id="password"
    autoComplete={isSignup ? "new-password" : "current-password"}
  />

  <button
    type="button"
    tabIndex={-1}
    className="absolute right-3 top-[50px] transform -translate-y-1/2 text-zinc-400 hover:text-indigo-400"
    onClick={() => setShowPassword(v => !v)}
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
  </button>
</div>

            <div className="flex justify-end mb-2">
              {!isSignup && (
                <button type="button" className="text-indigo-400 hover:underline text-sm font-medium transition-all" onClick={handleForgotPassword} disabled={forgotLoading}>Forgot password?</button>
              )}
            </div>
            {!isSignup && forgotMsg && (
              <div className={`mb-2 text-center font-semibold ${forgotMsg.toLowerCase().includes('sent') ? 'text-green-400' : 'text-red-400'}`}>{forgotMsg}</div>
            )}
            {error && <div className="text-red-400 text-sm text-center font-semibold -mt-2">{getFriendlyError(error)}</div>}
            <Button type="submit" className="w-full text-lg font-semibold shadow-lg py-3 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Loading...</span>
              ) : isSignup ? "Sign Up" : "Sign in"}
            </Button>
          </form>
          <div className="flex flex-col items-center mt-6 gap-2">
            <span className="text-zinc-400 text-sm">Don't have an account? <button className="text-indigo-400 hover:underline font-medium" onClick={() => setIsSignup(!isSignup)}>Sign up</button></span>
          </div>
        </div>
        {/* Right Side (Illustration) */}
        <div className="hidden md:flex flex-col items-center justify-center w-1/2 bg-gradient-to-br from-indigo-900 via-fuchsia-900 to-pink-900 p-10 h-full">
          <img src={AuthGirlImg} alt="Illustration" className="w-[32rem] h-[28rem] object-contain mb-8" />
        </div>
      </div>
    </div>
  );
} 