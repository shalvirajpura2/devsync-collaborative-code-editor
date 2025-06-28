import React, { useState, useEffect, useRef } from 'react';
import DevSyncLogo from '@/assets/devsync-logo.png';
import DashboardImg from '@/assets/dashboard.png';
import CodeEditorImg from '@/assets/code_editor.png';
import CpModeImg from '@/assets/cpmode.png';
import RoomChatImg from '@/assets/room chat.png';
import { Code, Users, Share2, PlayCircle, Mail, Terminal, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import api from '@/lib/axios';
import { getIdToken } from "firebase/auth";

const features = [
  {
    title: 'Real-Time Collaborative Editing',
    desc: 'Edit code live with multiple users in the same room — changes appear instantly across all devices.',
    icon: () => <Code className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
  {
    title: 'Real-Time Room Chat',
    desc: 'Send messages to everyone in your room with persistent chat history. Only the owner can clear chat for all.',
    icon: () => <MessageCircle className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-125 transition-transform" />,
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
    title: 'Competitive Programming (CP) Mode',
    desc: 'Run code against multiple test cases, see pass/fail results, and collaborate on problem-solving in real time.',
    icon: () => <Terminal className="w-8 h-8 text-pink-400 mb-2 group-hover:scale-125 transition-transform" />,
  },
];

const testimonials = [
  {
    quote: 'DevSync made our hackathon project a breeze. Real-time editing is a game changer!',
    name: 'Aarav Mehta',
    org: 'IIT Bombay',
    linkedin: 'https://linkedin.com/in/example-aarav',
  },
  {
    quote: 'The best collaborative code editor I have used. The UI is beautiful and intuitive.',
    name: 'Priya Sharma',
    org: 'BITS Pilani',
    linkedin: 'https://linkedin.com/in/example-priya',
  },
  {
    quote: 'Our team could code together from anywhere. Loved the join request workflow!',
    name: 'Rahul Verma',
    org: 'NIT Trichy',
    linkedin: 'https://linkedin.com/in/example-rahul',
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

const aboutLines = [
  'Built for teams who want to code together, instantly.',
  'No setup, no friction—just real-time collaboration in a beautiful, modern editor.',
  'Secure, verified access. Live join requests. Developer-friendly interface. Feedback-driven.'
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
  const [terminalLine, setTerminalLine] = useState(0);
  const [modalImg, setModalImg] = useState(null);
  const screenshots = [
    { src: DashboardImg, label: 'Dashboard' },
    { src: CodeEditorImg, label: 'Code Editor' },
    { src: RoomChatImg, label: 'Room Chat' },
    { src: CpModeImg, label: 'CP Mode' },
  ];
  const [screenshotIdx, setScreenshotIdx] = useState(0);
  const carouselRef = useRef(null);
  let touchStartX = null;
  let touchEndX = null;

  // Terminal typewriter effect for multiple lines
  useEffect(() => {
    let timeout;
    if (typing) {
      if (typed.length < aboutLines[terminalLine].length) {
        timeout = setTimeout(() => {
          setTyped(aboutLines[terminalLine].slice(0, typed.length + 1));
        }, 32);
      } else {
        timeout = setTimeout(() => {
          setTyping(false);
          setTimeout(() => {
            setTerminalLine((i) => (i + 1) % aboutLines.length);
            setTyped('');
            setTyping(true);
          }, 1200);
        }, 800);
      }
    }
    return () => clearTimeout(timeout);
  }, [typed, typing, terminalLine]);

  useEffect(() => {
    if (user) {
      user.getIdToken().then(token => {
        // console.log('Firebase ID Token:', token);
      });
    }
  }, [user]);

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

  const scrollToIdx = (idx) => {
    setScreenshotIdx(idx);
    document.getElementById(`screenshot-img-${idx}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX !== null && touchEndX !== null) {
      const diff = touchStartX - touchEndX;
      if (diff > 50 && screenshotIdx < screenshots.length - 1) {
        scrollToIdx(screenshotIdx + 1);
      } else if (diff < -50 && screenshotIdx > 0) {
        scrollToIdx(screenshotIdx - 1);
      }
    }
    touchStartX = null;
    touchEndX = null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-10 py-4 fixed top-0 left-0 z-40 backdrop-blur-sm bg-transparent border-b border-zinc-800/60">
        <div className="flex items-center gap-3 items-center">
          <img src={DevSyncLogo} alt="DevSync Logo" className="w-32 h-12 object-contain shadow-lg" style={{margin: 0}} />
        </div>
        <nav className="flex gap-10 text-base font-medium tracking-wide items-center">
          <a href="#hero" className="transition-all duration-200 hover:text-violet-400">Home</a>
          <a href="#features" className="transition-all duration-200 hover:text-violet-400">Features</a>
          <a href="#testimonials" className="transition-all duration-200 hover:text-violet-400">Testimonials</a>
          <a href="#feedback" className="transition-all duration-200 hover:text-violet-400">Feedback</a>
        </nav>
      </header>
      {/* Hero Section */}
      <section
        id="hero"
        className="relative flex flex-col items-center justify-center w-full h-[100vh] pt-24 overflow-hidden"
        style={{ minHeight: '100vh' }}
      >
        {/* Subtle grid + gradient background */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-radial from-[#23272f] via-[#18181b] to-transparent opacity-90" style={{background: 'radial-gradient(ellipse at 60% 40%, #23272f 60%, #18181b 100%)'}} />
          <svg width="100%" height="100%" className="w-full h-full absolute inset-0" style={{mixBlendMode: 'overlay'}}>
            <defs>
              <pattern id="modernGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3f3f46" strokeWidth="1.2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#modernGrid)" />
          </svg>
        </div>
        <div className="flex flex-col items-center justify-center w-full z-10">
          {/* Tagline and subheading */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent drop-shadow">
              Collaborate. Code. Launch.
            </h1>
            <p className="mt-3 text-lg md:text-xl text-zinc-300 font-medium max-w-2xl mx-auto">
              The fastest way to code together. No setup. No friction. Just real-time collaboration, built by developers for developers.
            </p>
          </div>
          {/* Terminal block: realistic, modern, with typewriter effect */}
          <div className="bg-zinc-900/95 rounded-xl shadow-2xl border border-zinc-800 px-8 pt-6 pb-8 flex flex-col items-start w-full max-w-xl relative min-h-[200px]">
            {/* Terminal bar with dots */}
            <div className="absolute left-0 top-0 w-full h-8 bg-zinc-800/80 rounded-t-xl flex items-center px-4">
              <span className="w-3 h-3 rounded-full bg-red-400 mr-2"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
              <span className="w-3 h-3 rounded-full bg-green-400"></span>
            </div>
            {/* Terminal content */}
            <div className="mt-10 font-mono text-base md:text-lg text-white w-full min-h-[80px]">
              <span>
                {typed}
                <span className="animate-blink">|</span>
              </span>
            </div>
          </div>
          {/* CTA Button: margin above, prominent but not flashy */}
          <div className="relative mt-10 flex flex-col items-center w-full">
          <button
  onClick={handleGetStarted}
  className="relative px-8 py-3 
    bg-transparent 
    border border-[#a78bfa] 
    text-[#7c3aed] font-bold text-lg 
    rounded-xl 
    shadow-[0_0_12px_rgba(167,139,250,0.4)] 
    hover:shadow-[0_0_18px_rgba(167,139,250,0.6)] 
    hover:text-[#6b21a8] hover:border-[#c4b5fd]
    transition-all duration-200 ease-in-out 
    backdrop-blur-sm 
    flex items-center gap-2 group"
>
  Try DevSync Now
  <span className="inline-block ml-2 transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
</button>


            {/* Scroll cue with label */}
            <div className="flex flex-col items-center mt-6">
              <svg className="w-7 h-7 text-violet-400 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              <span className="mt-2 text-zinc-400 text-sm tracking-wide">Scroll to explore</span>
            </div>
          </div>
        </div>
      </section>
      {/* Why/Founder Section */}
      <section className="py-16 px-4 flex flex-col items-center" id="why">
        <div className="max-w-2xl bg-zinc-900/80 rounded-lg p-8 border border-zinc-800 shadow-xl flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-4 text-center">Why I Built DevSync</h2>
          <span className="text-lg text-zinc-300 text-center mb-2">
            I created DevSync because coding together should be as easy as sharing a link. After struggling to collaborate on code with friends and teammates, I wanted something instant, beautiful, and truly real-time—so I made it. Whether you're building with friends, teaching, or hacking on a project, DevSync lets you collaborate in real time—no installs, no waiting, just code and create together.<br/><br/>
            <span className="italic">— Shalvi Rajpura</span>
            
          </span>
         
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
      {/* Screenshots Section */}
      <section id="screenshots" className="py-16 px-4 bg-zinc-900/80 relative overflow-x-hidden">
        <h2 className="text-3xl font-bold mb-2 text-center">See DevSync in Action</h2>
        <p className="text-zinc-400 text-center mb-8 text-lg max-w-2xl mx-auto">Screenshots from real sessions: explore the dashboard, code editor, chat, and CP mode. Click any image to enlarge.</p>
        <div className="relative flex flex-col items-center w-full">
          <div className="relative flex items-center justify-center w-full max-w-[520px] mx-auto" style={{height: '280px'}}>
            {/* Left Arrow */}
            <button
              className="absolute left-[-48px] top-1/2 -translate-y-1/2 z-20 bg-zinc-900/90 hover:bg-indigo-700/80 text-white rounded-full p-3 focus:outline-indigo-400 focus:outline-2 transition-all duration-200 group hidden md:block"
              onClick={() => scrollToIdx(Math.max(0, screenshotIdx - 1))}
              disabled={screenshotIdx === 0}
              aria-label="Previous screenshot"
              tabIndex={0}
              style={{ left: '-48px' }}
            >
              <svg width="38" height="38" fill="none" viewBox="0 0 24 24" className="group-hover:drop-shadow-glow"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-zinc-900/90 hover:bg-indigo-700/80 text-white rounded-full p-2 focus:outline-indigo-400 focus:outline-2 transition-all duration-200 group md:hidden"
              onClick={() => scrollToIdx(Math.max(0, screenshotIdx - 1))}
              disabled={screenshotIdx === 0}
              aria-label="Previous screenshot"
              tabIndex={0}
              style={{ left: '8px' }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" className="group-hover:drop-shadow-glow"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {/* Carousel Images */}
            <div
              ref={carouselRef}
              className="overflow-hidden w-full max-w-[420px] h-[260px] md:h-[260px] rounded-xl select-none relative bg-zinc-900"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-in-out h-full relative"
                style={{ transform: `translateX(-${screenshotIdx * 100}%)` }}
              >
                {screenshots.map((img, idx) => {
                  const isActive = idx === screenshotIdx;
                  return (
                    <div
                      key={img.label}
                      className="flex flex-col items-center justify-center w-full min-w-0 max-w-[420px] px-2 relative"
                      style={{ flex: '0 0 100%' }}
                    >
                      <div
                        className={`flex flex-col items-center cursor-pointer bg-transparent rounded-xl transition-all duration-200 w-full relative ${isActive ? 'z-10' : 'z-0'}`}
                        onClick={() => { setModalImg(img.src); setScreenshotIdx(idx); }}
                        tabIndex={isActive ? 0 : -1}
                        aria-label={`View screenshot: ${img.label}`}
                        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && isActive) { setModalImg(img.src); setScreenshotIdx(idx); } }}
                        style={{
                          filter: isActive ? 'none' : 'blur(4px) grayscale(0.3) opacity(0.5)',
                          transform: isActive ? 'scale(1)' : 'scale(0.85)',
                          transition: 'all 0.5s cubic-bezier(.4,0,.2,1)',
                        }}
                      >
                        <img
                          src={img.src}
                          alt={img.label}
                          className="rounded-xl w-full h-[220px] object-cover mb-3 transition-transform duration-200"
                        />
                        <span className="text-zinc-300 text-base font-medium mb-2">{img.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Right Arrow */}
            <button
              className="absolute right-[-48px] top-1/2 -translate-y-1/2 z-20 bg-zinc-900/90 hover:bg-indigo-700/80 text-white rounded-full p-3 focus:outline-indigo-400 focus:outline-2 transition-all duration-200 group hidden md:block"
              onClick={() => scrollToIdx(Math.min(screenshots.length - 1, screenshotIdx + 1))}
              disabled={screenshotIdx === screenshots.length - 1}
              aria-label="Next screenshot"
              tabIndex={0}
              style={{ right: '-48px' }}
            >
              <svg width="38" height="38" fill="none" viewBox="0 0 24 24" className="group-hover:drop-shadow-glow"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-zinc-900/90 hover:bg-indigo-700/80 text-white rounded-full p-2 focus:outline-indigo-400 focus:outline-2 transition-all duration-200 group md:hidden"
              onClick={() => scrollToIdx(Math.min(screenshots.length - 1, screenshotIdx + 1))}
              disabled={screenshotIdx === screenshots.length - 1}
              aria-label="Next screenshot"
              tabIndex={0}
              style={{ right: '8px' }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" className="group-hover:drop-shadow-glow"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          {/* Dot indicators */}
          <div className="flex justify-center gap-3 mt-4">
            {screenshots.map((_, idx) => (
              <button
                key={idx}
                className={`w-3 h-3 rounded-full border-2 ${screenshotIdx === idx ? 'bg-indigo-400 border-indigo-400 scale-110' : 'bg-zinc-700 border-zinc-600'} transition-all duration-200 focus:outline-indigo-400`}
                onClick={() => scrollToIdx(idx)}
                aria-label={`Go to screenshot ${idx + 1}`}
                tabIndex={0}
              />
            ))}
          </div>
        </div>
        {/* Modal for screenshots */}
        {modalImg && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" style={{padding: '32px 0'}}>
            <button className="absolute top-8 right-8 text-white text-4xl font-bold bg-zinc-900/90 rounded-full px-4 py-1 hover:bg-zinc-800 transition focus:outline-indigo-400 z-50" onClick={e => { e.stopPropagation(); setModalImg(null); }} aria-label="Close screenshot">&times;</button>
            <div className="relative flex flex-col items-center w-full max-w-[90vw] max-h-[80vh]">
              <div className="flex items-center justify-center w-full h-full">
                <button
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-zinc-900/90 hover:bg-indigo-700/80 text-white rounded-full p-3 focus:outline-indigo-400 focus:outline-2 transition-all duration-200 group"
                  onClick={e => { e.stopPropagation(); scrollToIdx(Math.max(0, screenshotIdx - 1)); }}
                  disabled={screenshotIdx === 0}
                  aria-label="Previous screenshot"
                  tabIndex={0}
                  style={{ left: '16px' }}
                >
                  <svg width="38" height="38" fill="none" viewBox="0 0 24 24" className="group-hover:drop-shadow-glow"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <img src={screenshots[screenshotIdx].src} alt="Screenshot" className="max-w-[90vw] max-h-[80vh] rounded-2xl animate-fadein bg-zinc-900" />
                <button
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-zinc-900/90 hover:bg-indigo-700/80 text-white rounded-full p-3 focus:outline-indigo-400 focus:outline-2 transition-all duration-200 group"
                  onClick={e => { e.stopPropagation(); scrollToIdx(Math.min(screenshots.length - 1, screenshotIdx + 1)); }}
                  disabled={screenshotIdx === screenshots.length - 1}
                  aria-label="Next screenshot"
                  tabIndex={0}
                  style={{ right: '16px' }}
                >
                  <svg width="38" height="38" fill="none" viewBox="0 0 24 24" className="group-hover:drop-shadow-glow"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white px-6 py-2 rounded-full shadow-lg text-lg font-semibold border border-indigo-400">
                {screenshots[screenshotIdx]?.label}
              </div>
            </div>
          </div>
        )}
      </section>
      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">What Our Users Say</h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-zinc-900/90 rounded-xl p-6 shadow-lg border border-zinc-800 flex flex-col items-center hover:shadow-indigo-400/20 transition-all duration-200">
              <svg width="32" height="32" fill="none" className="mb-2" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#6366f1" /><text x="16" y="22" textAnchor="middle" fontSize="18" fill="#fff">“</text></svg>
              <p className="italic text-lg mb-4 text-center">"{t.quote}"</p>
              <div className="font-semibold text-indigo-400 flex items-center gap-2">
                {t.name}
                <a href={t.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" title="LinkedIn">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.28c-.966 0-1.75-.79-1.75-1.76 0-.97.784-1.76 1.75-1.76s1.75.79 1.75 1.76c0 .97-.784 1.76-1.75 1.76zm13.5 11.28h-3v-5.6c0-1.34-.03-3.07-1.87-3.07-1.87 0-2.16 1.46-2.16 2.97v5.7h-3v-10h2.89v1.36h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.59v5.59z" fill="currentColor"/></svg>
                </a>
              </div>
              <div className="text-zinc-400 text-sm">{t.org}</div>
            </div>
          ))}
        </div>
      </section>
      {/* Feedback Form Section */}
      <section id="feedback" className="py-16 px-4">
        <h2 className="text-3xl font-bold mb-4 text-center">Help Shape DevSync!</h2>
        <div className="max-w-xl mx-auto bg-gradient-to-br from-zinc-900/90 to-indigo-900/80 rounded-2xl p-8 shadow-2xl border border-zinc-800 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-4">
            <svg width="32" height="32" fill="none" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#a5b4fc" /><path d="M10 22v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="16" cy="13" r="4" stroke="#fff" strokeWidth="2"/></svg>
            <span className="text-lg text-zinc-200 font-semibold">Your feedback helps me improve DevSync and may be featured on the site!</span>
          </div>
          <p className="text-zinc-400 text-center mb-6">Share your thoughts, suggestions, or even a quick hello. I read every message and use your feedback to make DevSync better for everyone.</p>
          <form onSubmit={handleFormSubmit} className="w-full flex flex-col gap-5">
            <div className="flex gap-3">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                className="flex-1 px-4 py-2 rounded bg-zinc-800 border border-zinc-700 focus:border-indigo-400 outline-none text-zinc-100"
                placeholder="Your Name*"
                required
              />
              <input
                type="text"
                name="org"
                value={form.org}
                onChange={handleFormChange}
                className="flex-1 px-4 py-2 rounded bg-zinc-800 border border-zinc-700 focus:border-indigo-400 outline-none text-zinc-100"
                placeholder="College/Organization*"
                required
              />
            </div>
            <textarea
              name="message"
              value={form.message}
              onChange={handleFormChange}
              className="w-full px-4 py-2 rounded bg-zinc-800 border border-zinc-700 focus:border-indigo-400 outline-none text-zinc-100 min-h-[100px]"
              placeholder="Your feedback, suggestion, or story*"
              required
            />
            <input
              type="url"
              name="social"
              value={form.social}
              onChange={handleFormChange}
              className={`w-full px-4 py-2 rounded bg-zinc-800 border ${form.social && !validateSocial(form.social) ? 'border-red-400' : 'border-zinc-700'} focus:border-indigo-400 outline-none text-zinc-100`}
              placeholder="LinkedIn or Twitter URL (optional)"
              pattern="https://linkedin.com/.*|https://twitter.com/.*"
            />
            {form.social && !validateSocial(form.social) && (
              <div className="text-red-400 text-sm mt-1">URL must start with https://linkedin.com/ or https://twitter.com/</div>
            )}
            {formError && <div className="text-red-400 text-center font-semibold">{formError}</div>}
            {formSuccess && <div className="text-indigo-400 text-center font-semibold">{formSuccess}</div>}
            <button
              type="submit"
              className="mt-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 text-lg focus:scale-105 active:scale-95 flex items-center gap-2"
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Send Feedback
            </button>
          </form>
        </div>
      </section>
      {/* Footer */}
      <footer className="py-8 px-4 text-center text-zinc-400 text-sm border-t border-zinc-800 mt-8">
        <div className="flex flex-col md:flex-row md:justify-between items-center gap-2 max-w-5xl mx-auto">
          <div>© {new Date().getFullYear()} DevSync. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#hero" className="hover:text-indigo-400 transition">Home</a>
            <a href="#features" className="hover:text-indigo-400 transition">Features</a>
            <a href="#screenshots" className="hover:text-indigo-400 transition">Screenshots</a>
            <a href="#testimonials" className="hover:text-indigo-400 transition">Testimonials</a>
            <a href="#feedback" className="hover:text-indigo-400 transition">Feedback</a>
          </div>
        </div>
      </footer>
      <style>{`
        .animate-fadein { animation: fadein 0.7s cubic-bezier(.4,0,.2,1); }
        @keyframes fadein { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .drop-shadow-glow { filter: drop-shadow(0 0 16px #6366f1cc); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
} 
