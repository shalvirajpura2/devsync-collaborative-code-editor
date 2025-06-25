import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeEditor from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Copy } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function EditorPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`);
                setRoom(response.data);
            } catch (err) {
                setError('Failed to fetch room data. It might not exist.');
                console.error('Error fetching room:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoom();
    }, [roomId]);

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading room...</div>;
    }

    if (error || !room) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <h2 className="text-2xl mb-4">Error</h2>
                <p className="mb-4">{error || 'The room could not be found.'}</p>
                <Button onClick={() => navigate('/')}>Back to Rooms</Button>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            <header className="bg-card border-b p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={() => navigate('/')}>
                            ← Back to Rooms
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold">{room.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Room ID: {room._id}</span>
                                <Button variant="ghost" size="sm" onClick={copyRoomId}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <Badge variant="secondary">{room.users?.length || 0} users</Badge>
                    </div>
                </div>
            </header>
            
            <div className="flex-1">
                <CodeEditor room={room} />
            </div>
        </div>
    );
} 