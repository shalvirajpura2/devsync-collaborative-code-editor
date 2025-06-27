import { useState, useEffect, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Play, Copy, Users, Check, Terminal, Download, Upload, ChevronLeft, ChevronRight, Plus, X, MessageCircle } from 'lucide-react'
import api from '@/lib/axios'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Switch } from '@/components/ui/switch.jsx'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog.jsx'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable.jsx'
import { Tabs as OutputTabs, TabsList as OutputTabsList, TabsTrigger as OutputTabsTrigger, TabsContent as OutputTabsContent } from '@/components/ui/tabs.jsx'
import { Tooltip } from '@/components/ui/tooltip'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || '';

function CodeEditor({ room }) {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(room.code || '')
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const wsRef = useRef(null)
  const editorRef = useRef(null)
  const retryCountRef = useRef(0)
  const retryDelayRef = useRef(3000)
  const maxRetries = 8
  const maxDelay = 30000
  const [cpMode, setCpMode] = useState(() => {
    // Persist CP mode per room in localStorage
    const saved = localStorage.getItem(`cpMode_${room._id}`);
    return saved === null ? false : saved === 'true';
  });
  const [testCases, setTestCases] = useState([
    { input: '', output: '', expected: '' }
  ])
  const [activeTest, setActiveTest] = useState(0)
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [batchInputs, setBatchInputs] = useState('');
  const [batchOutputs, setBatchOutputs] = useState('');
  const [outputTab, setOutputTab] = useState('output');
  const [outputPanelOpen, setOutputPanelOpen] = useState(true);
  const outputRef = useRef(null);
  const testCasesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [simpleInput, setSimpleInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(false);
  const chatEndRef = useRef(null);
  const isOwner = user?.uid === room.owner;

  useEffect(() => {
    retryCountRef.current = 0
    retryDelayRef.current = 3000
    connectWebSocket()
    fetchMembers()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
    // eslint-disable-next-line
  }, [room._id])

  const fetchMembers = async () => {
    setMembersLoading(true)
    try {
      const response = await api.get(`/api/rooms/${room._id}/members`)
      setMembers(response.data.members)
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/${room._id}`)
      ws.onopen = () => {
        retryCountRef.current = 0
        retryDelayRef.current = 3000
        if (user?.uid) {
          ws.send(JSON.stringify({ type: 'auth', user_uid: user.uid }))
        }
      }
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'notification' && message.subtype === 'room_shared') {
          toast.info(message.message)
        } else if (message.type === 'notification' && message.subtype === 'removed_from_room') {
          toast.error(message.message)
          setTimeout(() => {
            navigate('/app')
          }, 2000)
        } else if (message.type === 'code_update') {
          setCode(message.code)
        } else if (message.type === 'execution_result') {
          setOutput(formatOutput(message.output))
          setIsExecuting(false)
        } else if (message.type === 'cp_testcases_update' && Array.isArray(message.testCases)) {
          setTestCases(message.testCases)
        } else if (message.type === 'cp_mode_update' && typeof message.cpMode === 'boolean') {
          setCpMode(prev => {
            if (prev !== message.cpMode) {
              localStorage.setItem(`cpMode_${room._id}`, message.cpMode);
              return message.cpMode;
            }
            return prev;
          });
        } else if (message.type === 'chat_history') {
          setChatMessages(message.messages || []);
        } else if (message.type === 'chat_message') {
          setChatMessages(prev => {
            // Prevent duplicate if already present (by timestamp+user+text)
            if (prev.some(m => m.timestamp === message.timestamp && m.user === message.user && m.text === message.text)) return prev;
            return [...prev, message];
          });
          if (!chatOpen) setUnreadChat(true);
        }
      }
      ws.onclose = () => {
        if (retryCountRef.current < maxRetries) {
          const delay = retryDelayRef.current
          setTimeout(connectWebSocket, delay)
          retryCountRef.current += 1
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, maxDelay)
        } else {
          setOutput('Unable to connect to the collaboration server. Please refresh or try again later.')
        }
      }
      ws.onerror = () => {}
      wsRef.current = ws
    } catch {}
  }

  const handleEditorChange = (value) => {
    setCode(value || '')
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'code_update',
        code: value || ''
      }))
    }
  }

  const executeCode = async () => {
    if (!code.trim()) return;
    setIsExecuting(true);
    setOutput('Executing...');
    try {
      let response;
      if (cpMode) {
        response = await api.post(`/api/rooms/${room._id}/execute`, {
          code,
          inputs: testCases.map(tc => tc.input)
        });
      } else {
        response = await api.post(`/api/rooms/${room._id}/execute`, {
          code,
          inputs: simpleInput ? [simpleInput] : undefined
        });
      }
      const outputs = response.data;
      if (cpMode) {
        let updated;
        if (Array.isArray(outputs)) {
          updated = testCases.map((tc, idx) => ({ ...tc, output: outputs[idx]?.stdout || outputs[idx]?.stderr || 'No output' }));
        } else {
          updated = testCases.map(tc => ({ ...tc, output: outputs.stdout || outputs.stderr || 'No output' }));
        }
        setTestCases(updated);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'cp_testcases_update', testCases: updated }));
        }
      } else {
        setOutput(outputs.stdout || outputs.stderr || 'No output');
        if (outputs.stderr && outputs.stderr.trim()) {
          setOutputTab('errors');
        } else {
          setOutputTab('output');
        }
      }
    } catch (error) {
      if (cpMode) {
        setTestCases(testCases.map(tc => ({ ...tc, output: `Error: ${error.message}` })));
      } else {
        setOutput(`Error: ${error.message}`);
        setOutputTab('errors');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const formatOutput = (output) => {
    let result = ''
    
    if (output.stdout) {
      result += output.stdout
    }
    
    if (output.stderr) {
      result += `\nError:\n${output.stderr}`
    }
    
    if (output.returncode !== 0 && !output.stderr) {
      result += `\nProcess exited with code ${output.returncode}`
    }
    
    return result || 'No output'
  }

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    
    monaco.editor.setModelLanguage(editor.getModel(), 'python')
    
    editor.updateOptions({
      fontSize: 15,
      fontFamily: 'JetBrains Mono, Fira Mono, Menlo, monospace',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      roundedSelection: true,
      cursorSmoothCaretAnimation: true,
      theme: 'vs-dark',
    })
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  // --- CP Mode Handlers ---
  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', expected: '' }])
    setActiveTest(testCases.length)
  }
  const handleRemoveTestCase = (idx) => {
    if (testCases.length === 1) return
    const newCases = testCases.filter((_, i) => i !== idx)
    setTestCases(newCases)
    setActiveTest(Math.max(0, idx - 1))
  }
  const handleTestInputChange = (idx, val) => {
    setTestCases(testCases.map((tc, i) => i === idx ? { ...tc, input: val } : tc))
  }
  const handleTestExpectedChange = (idx, val) => {
    setTestCases(testCases.map((tc, i) => i === idx ? { ...tc, expected: val } : tc))
  }
  const handleRunAll = async () => {
    if (!code.trim() || testCases.length === 0) return;
    setTestCases(testCases.map(tc => ({ ...tc, output: 'Running...' })));
    try {
      const response = await api.post(`/api/rooms/${room._id}/execute`, {
        code,
        inputs: testCases.map(tc => tc.input)
      });
      const outputs = response.data;
      let updated;
      if (Array.isArray(outputs)) {
        updated = testCases.map((tc, idx) => ({ ...tc, output: outputs[idx]?.stdout || outputs[idx]?.stderr || 'No output' }));
      } else {
        updated = testCases.map(tc => ({ ...tc, output: outputs.stdout || outputs.stderr || 'No output' }));
      }
      setTestCases(updated);
      // Broadcast to all users in the room
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'cp_testcases_update', testCases: updated }));
      }
    } catch (error) {
      setTestCases(testCases.map(tc => ({ ...tc, output: `Error: ${error.message}` })));
    }
  }

  // Batch Add for CP Mode: separate input/output fields
  const handleBatchAdd = () => {
    const inputBlocks = batchInputs.split(/---+/).map(block => block.trim()).filter(Boolean);
    const outputBlocks = batchOutputs.split(/---+/).map(block => block.trim());
    const newCases = inputBlocks.map((input, idx) => ({
      input,
      output: '',
      expected: outputBlocks[idx] || ''
    }));
    if (newCases.length) {
      setTestCases(prev => {
        const shouldReplace = prev.length === 1 && prev[0].input === '' && prev[0].output === '';
        const allCases = shouldReplace ? newCases : [...prev, ...newCases];
        setActiveTest(0);
        return allCases;
      });
    }
    setBatchInputs('');
    setBatchOutputs('');
    setShowBatchDialog(false);
  };

  // Pass/Fail summary
  const getPassFail = () => {
    let passed = 0;
    let total = testCases.length;
    testCases.forEach(tc => {
      if (tc.expected && tc.output && tc.output.trim().replace(/\r\n?/g, '\n') === tc.expected.trim().replace(/\r\n?/g, '\n')) {
        passed++;
      }
    });
    return `${passed}/${total} Passed`;
  }

  // Sync CP Mode toggle across users
  const handleCpModeChange = (val) => {
    setCpMode(val);
    localStorage.setItem(`cpMode_${room._id}`, val);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cp_mode_update', cpMode: val }));
    }
  }

  const handleClearOutput = () => {
    setOutput('');
  };
  const handleCopyOutput = () => {
    if (outputRef.current) {
      navigator.clipboard.writeText(outputRef.current.innerText || '');
      toast.success('Output copied!');
    }
  };

  // Keyboard shortcut: Ctrl+Enter to run code and expand output
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeCode();
        setOutputPanelOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeCode]);

  // Auto-scroll to first failing test after run all
  useEffect(() => {
    if (outputTab === 'testcases' && testCasesContainerRef.current) {
      const firstFailIdx = testCases.findIndex(tc => tc.expected && tc.output && tc.output.trim().replace(/\r\n?/g, '\n') !== tc.expected.trim().replace(/\r\n?/g, '\n'));
      if (firstFailIdx !== -1) {
        const el = testCasesContainerRef.current.querySelector(`[data-tc-idx="${firstFailIdx}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [testCases, outputTab]);

  // Import/Export Test Cases
  const handleExportTestCases = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(testCases, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'testcases.json');
    dlAnchor.click();
  };
  const handleImportTestCases = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          setTestCases(imported.map(tc => ({ input: tc.input || '', output: '', expected: tc.expected || '' })));
          setActiveTest(0);
          toast.success('Test cases imported!');
        } else {
          toast.error('Invalid test case file.');
        }
      } catch {
        toast.error('Failed to import test cases.');
      }
    };
    reader.readAsText(file);
  };

  // Scroll chat to bottom when opened or new message
  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setUnreadChat(false);
    }
  }, [chatOpen, chatMessages]);

  const sendChatMessage = () => {
    if (!chatInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const msg = {
      type: 'chat_message',
      user: user?.email || 'Anonymous',
      text: chatInput,
      timestamp: new Date().toISOString(),
    };
    wsRef.current.send(JSON.stringify(msg));
    setChatInput('');
  };

  const handleClearChat = async () => {
    try {
      await api.post(`/api/rooms/${room._id}/chat/clear`);
      setChatMessages([]);
      toast.success('Chat history cleared!');
    } catch (e) {
      toast.error('Failed to clear chat history.');
    }
  };

  return (
    <div className="flex flex-col h-[90vh] w-full max-w-screen-2xl mx-auto">
      {/* CP Mode Warning Banner */}
      {cpMode && (
       <div className="flex items-center gap-3 px-6 py-3 border-b-2 border-red-500 text-red-900 font-bold text-sm">
       <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" />
       </svg>
       CP Mode is active. All code, test cases, and results are visible to all room members. Please use this mode responsibly.
     </div>
      )}
      <div className="rounded-2xl shadow-xl bg-zinc-900/95 border border-zinc-800 overflow-hidden flex flex-col h-full">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            {/* <span className="font-semibold text-lg text-zinc-100 truncate max-w-[180px]">{room.name || 'Untitled.py'}</span> */}
            <Badge variant="outline" className="uppercase tracking-wide text-xs">{room.language || 'python'}</Badge>
          </div>
          <div className="flex items-center gap-8">
            {/* CP Mode Toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={cpMode} onCheckedChange={handleCpModeChange} id="cp-mode-switch" />
              <label htmlFor="cp-mode-switch" className="text-sm text-zinc-200">CP Mode</label>
            </div>
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Chat Button */}
              <Dialog open={chatOpen} onOpenChange={setChatOpen}>
                <Tooltip content="Chat">
                  <DialogTrigger asChild>
                    <Button size="sm" variant="secondary" className="flex items-center gap-2 relative">
                      <MessageCircle className="h-5 w-5" /> Chat
                      {unreadChat && <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3" />}
                    </Button>
                  </DialogTrigger>
                </Tooltip>
                <DialogContent className="max-w-lg w-full">
                  <DialogHeader>
                    <DialogTitle>Room Chat</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-2 max-h-96 min-h-[300px] overflow-y-auto p-2 bg-zinc-900 border border-zinc-800 rounded">
                    {chatMessages.length === 0 && <div className="text-zinc-400 text-sm text-center">No messages yet.</div>}
                    {chatMessages.map((msg, idx) => {
                      const isMe = user?.email === msg.user;
                      const isOwnerMsg = msg.user && room.owner_email && msg.user === room.owner_email;
                      return (
                        <div
                          key={idx}
                          className={`flex mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200 mr-2">
                              {msg.user?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${isMe ? 'bg-blue-600 text-white' : isOwnerMsg ? 'bg-green-700/80 text-white' : 'bg-zinc-800 text-zinc-100'} shadow-sm`}>
                              {msg.text}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-zinc-400">{msg.user}{isOwnerMsg && <span className="ml-1 text-green-400 font-bold">(Owner)</span>}</span>
                              <span className="text-[10px] text-zinc-500 ml-2">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          {isMe && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white ml-2">
                              {msg.user?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2 mt-2 items-center">
                    <input
                      className="flex-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') sendChatMessage(); }}
                      placeholder={user ? "Type a message..." : "Login to chat"}
                      disabled={!user}
                    />
                    <Button onClick={sendChatMessage} disabled={!chatInput.trim() || !user} variant="primary">Send</Button>
                    {isOwner && (
                      <Button onClick={handleClearChat} variant="destructive">Clear Chat</Button>
                    )}
                  </div>
                  {!user && <div className="text-xs text-zinc-400 mt-2 text-center">You must be logged in to send messages.</div>}
                </DialogContent>
              </Dialog>
              {/* Existing Buttons */}
              <Tooltip content="Run (Ctrl+Enter)"><Button size="sm" variant="primary" onClick={executeCode} disabled={isExecuting || !code.trim()} className="flex items-center gap-2"><Play className="h-5 w-5" /> Run</Button></Tooltip>
              <Tooltip content="Copy Code"><Button size="sm" variant="secondary" onClick={handleCopy} className="flex items-center gap-2">{copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />} {copied ? 'Copied!' : 'Copy'}</Button></Tooltip>
            </div>
          </div>
        </div>
        {/* Editor and Output Panel (Resizable/Collapsible) */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 relative">
          <ResizablePanel defaultSize={outputPanelOpen ? 60 : 100} minSize={30} maxSize={100}>
            <div className="flex-1 bg-zinc-950/90 h-full">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 15,
                  fontFamily: 'JetBrains Mono, Fira Mono, Menlo, monospace',
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  roundedSelection: true,
                  cursorSmoothCaretAnimation: true,
                  theme: 'vs-dark',
                  lineNumbers: 'on',
                }}
              />
            </div>
          </ResizablePanel>
          {outputPanelOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={20} maxSize={70}>
                <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
                    {!cpMode ? (
                      <OutputTabs value={outputTab} onValueChange={setOutputTab} className="w-full">
                        <OutputTabsList className="flex gap-2">
                        <OutputTabsTrigger value="input">Input</OutputTabsTrigger>
                          <OutputTabsTrigger value="output">Output</OutputTabsTrigger>
                          <OutputTabsTrigger value="errors">Errors</OutputTabsTrigger>
                        </OutputTabsList>
                      </OutputTabs>
                    ) : (
                      <OutputTabs value="testcases" className="w-full">
                        <OutputTabsList className="flex gap-2">
                          <OutputTabsTrigger value="testcases">Test Cases</OutputTabsTrigger>
                        </OutputTabsList>
                      </OutputTabs>
                    )}
                    <div className="flex items-center gap-2 ml-4">
                      <Tooltip content="Collapse Output"><Button size="icon" variant="ghost" onClick={() => setOutputPanelOpen(false)} className="rounded-full p-2 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700"><ChevronRight className="w-8 h-8" /></Button></Tooltip>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {!cpMode ? (
                      <OutputTabs value={outputTab} onValueChange={setOutputTab} className="h-full">
                        
                        <OutputTabsContent value="output">
                          <div ref={outputRef} className="w-full rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 min-h-[120px] whitespace-pre-wrap">
                            {output}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Tooltip content="Clear Output"><Button size="icon" variant="ghost" onClick={handleClearOutput} className="rounded-full p-2"><Terminal className="w-6 h-6" /></Button></Tooltip>
                            <Tooltip content="Copy Output"><Button size="icon" variant="ghost" onClick={handleCopyOutput} className="rounded-full p-2"><Copy className="w-6 h-6" /></Button></Tooltip>
                          </div>
                        </OutputTabsContent>
                        <OutputTabsContent value="errors">
                          <div className="w-full rounded bg-zinc-900 border border-zinc-800 text-red-400 p-2 min-h-[120px] whitespace-pre-wrap">
                            {/* Show only stderr if present */}
                            {output && output.includes('Error:') ? output : 'No errors.'}
                          </div>
                        </OutputTabsContent>
                        <OutputTabsContent value="input">
                          <div className="flex flex-col gap-2 p-4">
                            <label className="block text-xs text-zinc-400 mb-1">Input (stdin):</label>
                            <textarea
                              className="w-full rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 min-h-[40px]"
                              value={simpleInput}
                              onChange={e => setSimpleInput(e.target.value)}
                              placeholder="Enter input for your code (optional)"
                            />
                          </div>
                        </OutputTabsContent>
                      </OutputTabs>
                    ) : (
                      <OutputTabs value="testcases" className="h-full">
                        <OutputTabsContent value="testcases">
                          <div className="flex flex-col gap-2 p-2 h-full" ref={testCasesContainerRef}>
                            <div className="flex items-center gap-2 mb-2">
                              <Tooltip content="Add Test Case"><Button size="sm" variant="primary" onClick={handleAddTestCase}><Plus className="w-5 h-5" /> Add Test</Button></Tooltip>
                              <Tooltip content="Batch Add Test Cases"><Button size="sm" variant="secondary" onClick={() => setShowBatchDialog(true)}><Upload className="w-5 h-5" /> Batch Add</Button></Tooltip>
                              <span className="ml-auto text-green-400 font-semibold text-sm">{getPassFail()}</span>
                            </div>
                            {testCases.map((tc, idx) => {
                              const passed = tc.expected && tc.output && tc.output.trim().replace(/\r\n?/g, '\n') === tc.expected.trim().replace(/\r\n?/g, '\n');
                              return (
                                <div key={idx} data-tc-idx={idx} className={`mb-2 p-2 rounded bg-zinc-900 border border-zinc-800 flex flex-col gap-1 relative ${passed ? 'border-green-500' : tc.expected ? 'border-red-500' : ''}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-zinc-200">Test {idx + 1}</span>
                                    {tc.expected && (
                                      passed ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />
                                    )}
                                    <Tooltip content="Remove Test Case"><Button size="icon" variant="ghost" onClick={() => handleRemoveTestCase(idx)} className="ml-auto rounded-full p-1"><X className="w-4 h-4" /></Button></Tooltip>
                                  </div>
                                  <label className="block text-xs text-zinc-400 mb-1">Input</label>
                                  <textarea
                                    className="w-full rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 min-h-[40px]"
                                    value={tc.input}
                                    onChange={e => handleTestInputChange(idx, e.target.value)}
                                    placeholder="Custom input for this test case"
                                  />
                                  <label className="block text-xs text-zinc-400 mb-1 mt-2">Expected Output (optional)</label>
                                  <textarea
                                    className="w-full rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 min-h-[30px]"
                                    value={tc.expected}
                                    onChange={e => handleTestExpectedChange(idx, e.target.value)}
                                    placeholder="Expected output for this test case"
                                  />
                                  <label className="block text-xs text-zinc-400 mb-1 mt-2">Output</label>
                                  <div className="w-full rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 min-h-[30px] whitespace-pre-wrap">
                                    {tc.output}
                                  </div>
                                </div>
                              );
                            })}
                            <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Batch Add Test Cases</DialogTitle>
                                </DialogHeader>
                                <div className="mb-2 text-xs text-zinc-400">
  Paste all test case inputs in the first box, and all expected outputs in the second box. Separate each with 
  <span className="font-mono bg-zinc-800 px-1 rounded">---</span>.<br />
  
 
</div>

<div className="flex flex-col lg:flex-row gap-4">
  <div className="flex flex-col w-full lg:w-1/2">
    <label className="text-xs text-zinc-400 mb-1">Inputs (separate each with ---):</label>
    <textarea
      className="w-full rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 min-h-[160px]"
      value={batchInputs}
      onChange={e => setBatchInputs(e.target.value)}
      placeholder={`5\n1 2 3 4 5\n---\n3\n2 4 6\n---\n4\n1 3 5 7`}
    />
  </div>

  <div className="flex flex-col w-full lg:w-1/2">
    <label className="text-xs text-zinc-400 mb-1">Outputs (separate each with ---):</label>
    <textarea
      className="w-full rounded bg-zinc-900 border border-zinc-800 text-zinc-100 p-2 min-h-[160px]"
      value={batchOutputs}
      onChange={e => setBatchOutputs(e.target.value)}
      placeholder={`6\n---\n12\n---\n0`}
    />
  </div>
</div>

                                <DialogFooter>
                                  <Button onClick={handleBatchAdd} disabled={!batchInputs.trim()}>Add</Button>
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </OutputTabsContent>
                      </OutputTabs>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
          {!outputPanelOpen && (
            <Tooltip content="Expand Output"><Button size="icon" variant="primary" className="absolute top-1/2 right-0 z-10 rounded-full p-2 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700" style={{transform: 'translateY(-50%)'}} onClick={() => setOutputPanelOpen(true)} title="Expand Output"><ChevronLeft className="w-8 h-8" /></Button></Tooltip>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

export default CodeEditor

