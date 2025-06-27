import { useState, useEffect, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Play, Square, Terminal, Users } from 'lucide-react'
import api from '@/lib/axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || `ws://${window.location.host}`;

function CodeEditor({ room }) {
  const [code, setCode] = useState(room.code || '')
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const wsRef = useRef(null)
  const editorRef = useRef(null)
  const lastUpdateRef = useRef(Date.now())

  useEffect(() => {
    // Initialize WebSocket connection
    connectWebSocket()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [room._id])

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/${room._id}`)      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        if (message.type === 'code_update') {
          // Only update if this change is from another user
          if (Date.now() - lastUpdateRef.current > 100) {
            setCode(message.code)
          }
        } else if (message.type === 'execution_result') {
          setOutput(formatOutput(message.output))
          setIsExecuting(false)
        }
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
    }
  }

  const handleEditorChange = (value) => {
    setCode(value || '')
    lastUpdateRef.current = Date.now()
    
    // Log the current local time when code changes
    console.log('Code changed at:', new Date().toLocaleString())
    
    // Send code update via WebSocket
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
    
    // Set Python as the default language
    monaco.editor.setModelLanguage(editor.getModel(), 'python')
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on'
    })
  }

  return (
    <div className="h-full flex">
      {/* Code Editor */}
      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold">Code Editor</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={executeCode}
              disabled={isExecuting || !code.trim()}
              size="sm"
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <Square className="h-4 w-4" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Code
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              tabSize: 4,
              insertSpaces: true
            }}
          />
        </div>
      </div>

      {/* Output Panel */}
      <div className="w-96 border-l flex flex-col">
        <div className="bg-card border-b p-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Output
          </h3>
        </div>
        
        <div className="flex-1 p-4 bg-black text-green-400 font-mono text-sm overflow-auto">
          <pre className="whitespace-pre-wrap">{output || 'Run your code to see output here...'}</pre>
        </div>
        
        <div className="border-t p-3 bg-card">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{connectedUsers} user{connectedUsers !== 1 ? 's' : ''} online</span>
            </div>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeEditor

