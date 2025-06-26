import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Code, Users, Share2, PlayCircle, Github, Linkedin, Mail, Terminal, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import api from '@/lib/axios';

const features = [
  {
    title: 'Real-Time Collaborative Editing',
    desc: 'Edit code live with multiple users in the same room — changes appear instantly across all devices.',
    icon: () => <Code className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
  {
    title: 'Python Language Support',
    desc: 'Start coding in Python immediately with no setup required. More languages coming soon.',
    icon: () => <PlayCircle className="w-8 h-8 text-fuchsia-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
  {
    title: 'Secure & Verified Access',
    desc: 'Firebase-based login with email verification ensures only trusted users join your sessions.',
    icon: () => <Mail className="w-8 h-8 text-pink-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
  {
    title: 'Smart Room Management',
    desc: 'Create, join, rename, and organize rooms with ease. Manage access and participants efficiently.',
    icon: () => <Users className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
  {
    title: 'Live Join Requests & Notifications',
    desc: 'Users can request room access. Room owners get instant notifications to approve or deny.',
    icon: () => <Share2 className="w-8 h-8 text-fuchsia-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
  {
    title: 'Developer-Friendly Interface',
    desc: 'Professional dark theme with a fixed sidebar and responsive layout — built for long, focused sessions.',
    icon: () => <Terminal className="w-8 h-8 text-pink-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
];

const testimonials = [
  {
    quote: 'DevSync made our hackathon project a breeze. Real-time editing is a game changer!',
    name: 'Aarav Mehta',
    org: 'IIT Bombay',
  },
  {
    quote: 'The best collaborative code editor I have used. The UI is beautiful and intuitive.',
    name: 'Priya Sharma',
    org: 'BITS Pilani',
  },
  {
    quote: 'Our team could code together from anywhere. Loved the join request workflow!',
    name: 'Rahul Verma',
    org: 'NIT Trichy',
  },
];

const initialForm = {
  name: '',
  org: '',
  message: '',
  social: '',
};

const validateSocial = (url) => {
  if (!url) return true;
  return (
    url.startsWith('https://linkedin.com/') ||
    url.startsWith('https://twitter.com/')
  );
};

const commands = [
  'npx devsync',
  'Connecting to room...',
  'Collaborate. Code. Run — Together in Real-Time.',
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [cmdIdx, setCmdIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [typing, setTyping] = useState(true);

  React.useEffect(() => {
    let timeout;
    if (typing && cmdIdx < commands.length) {
      if (typed.length < commands[cmdIdx].length) {
        timeout = setTimeout(() => {
          setTyped(commands[cmdIdx].slice(0, typed.length + 1));
        }, 60);
      } else {
        timeout = setTimeout(() => {
          setTyping(false);
          setTimeout(() => {
            setCmdIdx((i) => (i + 1) % commands.length);
            setTyped('');
            setTyping(true);
          }, 1200);
        }, 800);
      }
    }
    return () => clearTimeout(timeout);
  }, [typed, typing, cmdIdx]);

  const handleGetStarted = () => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/auth');
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
    setFormSuccess('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.org.trim() || !form.message.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!validateSocial(form.social)) {
      setFormError('Social URL must start with https://linkedin.com/ or https://twitter.com/');
      return;
    }
    try {
      await api.post('/api/feedback', form);
      setFormSuccess('Thank you for your feedback!');
      setForm(initialForm);
    } catch (err) {
      setFormError('Failed to submit feedback. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Modern animated background blobs */}
      <div className="pointer-events-none -z-10">
        {/* Indigo/Fuchsia blob */}
        <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 opacity-40 rounded-full blur-3xl animate-blob1" />
        {/* Pink/Blue blob */}
        <div className="fixed bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-gradient-to-tr from-pink-400 via-blue-500 to-indigo-400 opacity-30 rounded-full blur-3xl animate-blob2" />
      </div>
      {/* Hero Section */}
      <section id="hero" className="flex flex-col items-center justify-center flex-1 py-16 px-4">
        <div className="max-w-2xl w-full flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight text-center bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">DevSync</h1>
          <p className="text-lg md:text-xl mb-8 text-center text-zinc-400 font-medium">Collaborate. Code. Run — Together in Real-Time.</p>
          <div className="w-full max-w-xl bg-zinc-900/90 border border-zinc-800 rounded-xl shadow-2xl p-6 mb-8">
            <div className="font-mono text-indigo-400 text-lg md:text-xl min-h-[2.5em]">
              <span className="animate-blink mr-2">$</span>
              <span>{typed}</span>
              {typing && <span className="border-r-2 border-indigo-400 animate-cursor ml-1" />}
            </div>
          </div>
          <button
            onClick={handleGetStarted}
            className="mt-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow transition-all duration-200 text-lg"
          >
            Try It Now
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="bg-zinc-900/90 rounded-xl p-6 flex flex-col items-center shadow-lg border border-zinc-800 hover:border-indigo-400 transition-all duration-200 group cursor-pointer hover:scale-105"
            >
              <div className="mb-4">{f.icon()}</div>
              <h3 className="text-xl font-semibold mb-2 text-center">{f.title}</h3>
              <p className="text-zinc-400 text-center">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">What Our Users Say</h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-zinc-900/90 rounded-xl p-6 shadow-lg border border-zinc-800 flex flex-col items-center hover:shadow-indigo-400/20 transition-all duration-200">
              <p className="italic text-lg mb-4 text-center">"{t.quote}"</p>
              <div className="font-semibold text-indigo-400">{t.name}</div>
              <div className="text-zinc-400 text-sm">{t.org}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feedback Form Section */}
      <section id="feedback" className="py-16 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">We Value Your Feedback</h2>
        <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto bg-zinc-900/90 rounded-xl p-8 shadow-lg flex flex-col gap-5 border border-zinc-800">
          <div>
            <label className="block mb-1 font-semibold">Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              className="w-full px-4 py-2 rounded bg-zinc-800 border border-zinc-700 focus:border-indigo-400 outline-none text-zinc-100"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">College/Organization <span className="text-red-400">*</span></label>
            <input
              type="text"
              name="org"
              value={form.org}
              onChange={handleFormChange}
              className="w-full px-4 py-2 rounded bg-zinc-800 border border-zinc-700 focus:border-indigo-400 outline-none text-zinc-100"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Feedback <span className="text-red-400">*</span></label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleFormChange}
              className="w-full px-4 py-2 rounded bg-zinc-800 border border-zinc-700 focus:border-indigo-400 outline-none text-zinc-100 min-h-[100px]"
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">LinkedIn or Twitter URL <span className="text-zinc-400">(optional)</span></label>
            <input
              type="url"
              name="social"
              value={form.social}
              onChange={handleFormChange}
              className={`w-full px-4 py-2 rounded bg-zinc-800 border ${form.social && !validateSocial(form.social) ? 'border-red-400' : 'border-zinc-700'} focus:border-indigo-400 outline-none text-zinc-100`}
              placeholder="https://linkedin.com/in/yourprofile or https://twitter.com/yourprofile"
              pattern="https://linkedin.com/.*|https://twitter.com/.*"
            />
            {form.social && !validateSocial(form.social) && (
              <div className="text-red-400 text-sm mt-1">URL must start with https://linkedin.com/ or https://twitter.com/</div>
            )}
          </div>
          {formError && <div className="text-red-400 text-center font-semibold">{formError}</div>}
          {formSuccess && <div className="text-indigo-400 text-center font-semibold">{formSuccess}</div>}
          <button
            type="submit"
            className="mt-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow transition-all duration-200 text-lg"
          >
            Submit Feedback
          </button>
        </form>
      </section>

      {/* Developed By Section */}
      <section id="developedby" className="py-8 px-4 text-center">
        <div className="text-lg text-zinc-400">Developed by <span className="text-indigo-400 font-bold">Shalvi Rajpura</span></div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-zinc-400 text-sm flex flex-col md:flex-row md:justify-between items-center gap-2">
        <div>© {new Date().getFullYear()} DevSync. All rights reserved.</div>
        <div className="flex gap-4">
          <a href="#hero" className="hover:text-indigo-400 transition">Home</a>
          <a href="#features" className="hover:text-indigo-400 transition">Features</a>
          <a href="#testimonials" className="hover:text-indigo-400 transition">Testimonials</a>
          <a href="#feedback" className="hover:text-indigo-400 transition">Feedback</a>
        </div>
      </footer>
      <style>{`
        .animate-blink { animation: blink 1.2s steps(2, start) infinite; }
        @keyframes blink { to { visibility: hidden; } }
        .animate-cursor { animation: cursor 0.8s steps(2, start) infinite; }
        @keyframes cursor { to { border-color: transparent; } }
        @keyframes blob1 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(40px) scale(1.1); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.07); }
        }
        .animate-blob1 { animation: blob1 12s ease-in-out infinite; }
        .animate-blob2 { animation: blob2 14s ease-in-out infinite; }
      `}</style>
    </div>
  );
} 