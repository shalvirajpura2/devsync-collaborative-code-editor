import { useState, useEffect } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useNavigate } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Github, Mail } from 'lucide-react';
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthPage() {
  const { user, loading, error, login, signup } = useFirebaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState("");
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

  if (user && isSignup && !user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100">
        <div className="w-full max-w-md bg-zinc-900/90 rounded-xl shadow-2xl border border-zinc-800 p-8 flex flex-col items-center">
          <span className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent mb-2">DevSync</span>
          <span className="text-zinc-400 text-sm mb-6">Collaborate. Code. Run — Together in Real-Time.</span>
          <h2 className="text-xl font-bold mb-2 text-center">Verify Your Email</h2>
          <p className="mb-4 text-center text-zinc-300">
            A verification link has been sent to <span className="font-semibold text-indigo-300">{user.email}</span>.<br />
            Please verify your email to continue (check spam folder too).
          </p>
          <Button onClick={sendVerification} disabled={resendLoading || verificationSent} className="mb-2 w-full">
            {resendLoading ? 'Sending...' : verificationSent ? 'Verification Sent' : 'Resend Verification Email'}
          </Button>
          {resendError && <div className="text-red-400 text-sm text-center mb-2">{resendError}</div>}
          <div className="mt-8 flex flex-col items-center gap-2 text-zinc-400 text-xs">
            <div className="flex gap-2">
              <a href="https://github.com/shalvirajpura" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors"><Github className="w-5 h-5" /></a>
              <a href="mailto:shalvirajpura@gmail.com" className="hover:text-pink-400 transition-colors"><Mail className="w-5 h-5" /></a>
            </div>
            <span>Built by Shalvi Rajpura</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900/90 rounded-xl shadow-2xl border border-zinc-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <span className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent mb-2">DevSync</span>
          <span className="text-zinc-400 text-sm mb-2">Collaborate. Code. Run — Together in Real-Time.</span>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="bg-zinc-800 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-400 text-sm text-center">{error}</div>}
          <Button type="submit" className="mt-2 w-full text-lg font-semibold">
            {isSignup ? "Sign Up" : "Login"}
          </Button>
        </form>
        <div className="flex justify-between items-center mt-4">
          <button
            className="text-indigo-400 hover:underline text-sm"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Already have an account? Login" : "No account? Sign Up"}
          </button>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2 text-zinc-400 text-xs">
          <div className="flex gap-2">
            <a href="https://github.com/shalvirajpura" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors"><Github className="w-5 h-5" /></a>
            <a href="mailto:shalvirajpura@gmail.com" className="hover:text-pink-400 transition-colors"><Mail className="w-5 h-5" /></a>
          </div>
          <span>Built by Shalvi Rajpura</span>
        </div>
      </div>
    </div>
  );
} 