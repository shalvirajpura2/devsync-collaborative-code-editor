import { Button } from '@/components/ui/button';
import { Code, Users, Share2, PlayCircle, Github, Linkedin, Mail, Terminal, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

const features = [
  {
    icon: <Code className="w-8 h-8 text-indigo-400 mb-2" />, title: 'Real-Time Collaboration',
    desc: 'Edit code together with instant updates for all participants.'
  },
  {
    icon: <PlayCircle className="w-8 h-8 text-green-400 mb-2" />, title: 'Run Python Instantly',
    desc: 'Execute code and see output in a shared terminal panel.'
  },
  {
    icon: <Share2 className="w-8 h-8 text-pink-400 mb-2" />, title: 'Easy Sharing',
    desc: 'Invite others by email or UID. Share projects securely.'
  },
  {
    icon: <Users className="w-8 h-8 text-yellow-400 mb-2" />, title: `See Who's Coding`,
    desc: 'View all participants in each room, with email and role.'
  },
];

const testimonials = [
  {
    name: 'Alex Devlin',
    title: 'Full Stack Engineer',
    quote: 'DevSync makes remote pair programming effortless. The real-time code and output is a game changer!'
  },
  {
    name: 'Priya Shah',
    title: 'Python Mentor',
    quote: 'I use DevSync for all my coding workshops. Sharing and collaborating is seamless and fun.'
  },
  {
    name: 'Chris Lee',
    title: 'Open Source Contributor',
    quote: 'The best collaborative editor for hackathons. Love the dark theme and instant feedback.'
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useFirebaseAuth();
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Simple auto-advance for testimonials
  // (in production, use a carousel lib or Framer Motion for more polish)
  // eslint-disable-next-line
  useState(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((i) => (i + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100 flex flex-col font-sans">
      {/* Background Glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute left-1/2 top-1/4 w-[60vw] h-[60vw] -translate-x-1/2 rounded-full bg-indigo-700/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 w-[40vw] h-[40vw] bg-pink-500/10 blur-2xl" />
      </div>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-16 gap-12 flex-1">
        {/* Left: Text */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            DevSync
          </h1>
          <p className="text-2xl md:text-3xl mb-8 text-zinc-300 max-w-xl">
            Collaborate. Code. Run — <span className="text-indigo-300 font-bold">Together in Real-Time.</span>
          </p>
          <Button size="lg" className="text-lg px-8 py-4 font-semibold shadow-lg" onClick={handleGetStarted}>
            Get Started
          </Button>
        </div>
        {/* Right: Code/Terminal Mockup */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-md bg-zinc-900/80 rounded-xl shadow-2xl border border-zinc-800 p-6 overflow-hidden">
            <div className="absolute top-2 left-4 flex gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <pre className="mt-8 text-left text-sm md:text-base font-mono text-zinc-200 animate-pulse">
{`def greet(name):
    print(f"Hello, {name}!")

greet("DevSync")
# Output: Hello, DevSync!`}
            </pre>
            <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-zinc-400">
              <Terminal className="w-4 h-4" /> Live Terminal
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-8 px-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="flex flex-col items-center bg-zinc-800/80 rounded-xl p-6 shadow-lg border border-zinc-700 transition-transform hover:scale-105 hover:shadow-2xl group"
            >
              {f.icon}
              <h3 className="font-bold mb-1 text-lg group-hover:text-indigo-300 transition-colors">{f.title}</h3>
              <p className="text-sm text-zinc-400 text-center">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built By Section */}
      <section className="py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-zinc-400">Built by</span>
          <span className="font-bold text-lg">Shalvi Rajpura</span>
          <div className="flex gap-4 justify-center mt-2">
            <a href="https://github.com/shalvirajpura" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors"><Github className="w-6 h-6" /></a>
            <a href="https://linkedin.com/in/shalvirajpura" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors"><Linkedin className="w-6 h-6" /></a>
            <a href="mailto:shalvirajpura@gmail.com" className="hover:text-pink-400 transition-colors"><Mail className="w-6 h-6" /></a>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-zinc-900/80 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center">What Developers Say</h2>
          <div className="flex justify-center">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`w-80 mx-2 bg-zinc-800 rounded-xl p-6 shadow-lg border border-zinc-700 transition-opacity duration-700 ${i === testimonialIdx ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 z-0'} absolute md:static`}
                style={{ transition: 'opacity 0.7s, transform 0.7s' }}
              >
                <Quote className="w-6 h-6 text-indigo-400 mb-2" />
                <p className="text-zinc-200 mb-4 italic">“{t.quote}”</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-zinc-100">{t.name}</span>
                  <span className="text-xs text-zinc-400">{t.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback / Contact Section */}
      <section className="py-16">
        <div className="max-w-lg mx-auto bg-zinc-800/80 rounded-xl p-8 shadow-lg border border-zinc-700">
          <h2 className="text-xl font-bold mb-4 text-center">Feedback & Contact</h2>
          <form className="flex flex-col gap-4">
            <input className="bg-zinc-900 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Name" />
            <input className="bg-zinc-900 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Email" type="email" />
            <textarea className="bg-zinc-900 border border-zinc-700 rounded px-4 py-2 text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Message" rows={4} />
            <Button type="submit" className="mt-2">Send</Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-500 border-t border-zinc-800">
        &copy; {new Date().getFullYear()} DevSync. Built for developers by Shalvi Rajpura.
      </footer>
    </div>
  );
} 