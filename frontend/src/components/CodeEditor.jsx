import { useState, useEffect, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Play, Copy, Users, Check, Terminal } from 'lucide-react'
import api from '@/lib/axios'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || `ws://${window.location.host}`;

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
    if (!code.trim()) return
    
    setIsExecuting(true)
    setOutput('Executing...')
    
    try {
      const response = await api.post(`/api/rooms/${room._id}/execute`, {
        code: code
      })
      
      setOutput(formatOutput(response.data))
    } catch (error) {
      setOutput(`Error: ${error.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

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

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto mt-8">
      <div className="rounded-2xl shadow-xl bg-zinc-900/95 border border-zinc-800 overflow-hidden flex flex-col h-[70vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg text-zinc-100 truncate max-w-[180px]">{room.name || 'Untitled.py'}</span>
            <Badge variant="outline" className="uppercase tracking-wide text-xs">{room.language || 'python'}</Badge>
          </div>
          <div className="flex items-center gap-8">
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={executeCode} disabled={isExecuting || !code.trim()} className="flex items-center gap-2">
                <Play className="h-4 w-4" /> Run
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopy} className="flex items-center gap-2">
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
       
        {/* Editor and Output */}
        <div className="flex flex-1 min-h-0">
          {/* Monaco Editor */}
          <div className="flex-1 bg-zinc-950/90">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 15,
                fontFamily: 'JetBrains Mono, Fira Mono, Menlo, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                roundedSelection: true,
                cursorSmoothCaretAnimation: true,
                theme: 'vs-dark',
              }}
            />
          </div>
          {/* Output Panel */}
          <div className="w-96 border-l flex flex-col bg-zinc-950/80">
            <div className="bg-zinc-900 border-b p-3 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-green-400" />
              <span className="font-semibold text-zinc-200">Output</span>
            </div>
            <div className="flex-1 p-4 bg-black text-green-400 font-mono text-sm overflow-auto rounded-b-xl">
              <pre className="whitespace-pre-wrap">{output || 'Run your code to see output here...'}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor

