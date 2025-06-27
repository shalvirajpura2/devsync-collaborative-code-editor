import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import CodeEditor from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Copy } from 'lucide-react';
import { toast } from "sonner";
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function EditorPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useFirebaseAuth(); // Get user
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [members, setMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(true);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const response = await api.get(`/api/rooms/${roomId}`);
                setRoom(response.data);

                if (user) {
                    // Add to recent rooms on successful fetch
                    const newRecentRoom = { id: response.data._id, name: response.data.name, owner: response.data.owner };
                    const storedRooms = JSON.parse(localStorage.getItem(`recentRooms_${user.uid}`) || '[]');
                    
                    // Remove existing entry to avoid duplicates and move to top
                    const filteredRooms = storedRooms.filter(r => r.id !== newRecentRoom.id);
                    const updatedRooms = [newRecentRoom, ...filteredRooms].slice(0, 5); // Keep last 5

                    localStorage.setItem(`recentRooms_${user.uid}`, JSON.stringify(updatedRooms));
                    // Dispatch a storage event to notify other tabs/windows
                    window.dispatchEvent(new Event('storage'));
                }

            } catch (err) {
                setError('Failed to fetch room data.');
                toast.error("Could not load room. It may not exist or you don't have access.");
                navigate('/app');
            } finally {
                setLoading(false);
            }
        };
        fetchRoom();
    }, [roomId, navigate, user]);

    useEffect(() => {
        if (!room) return; // Don't fetch members if room hasn't been loaded
        const fetchMembers = async () => {
            setMembersLoading(true);
            try {
                const response = await api.get(`/api/rooms/${roomId}/members`);
                setMembers(response.data.members);
            } catch (err) {
                setMembers([]);
                // Optional: toast error for member fetching
            } finally {
                setMembersLoading(false);
            }
        };
        fetchMembers();
    }, [roomId, room]);

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen text-zinc-400">Loading Room...</div>;
    }

    if (error || !room) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <h2 className="text-2xl mb-4 text-red-400">Error</h2>
                <p className="mb-4 text-zinc-300">{error || 'The room could not be found.'}</p>
                <Button onClick={() => navigate('/app')}>Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/app')}>
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
            {/* Room members list */}
            <div className="mb-6">
                <h2 className="text-base font-semibold mb-2">Participants:</h2>
                {membersLoading ? (
                    <div>Loading members...</div>
                ) : (
                    <div className="flex flex-wrap gap-4">
                        {members.map((member) => (
                            <div key={member.uid} className="flex items-center gap-2 bg-muted px-3 py-1 rounded">
                                <span className="font-medium">{member.display_name || member.email || member.uid}</span>
                                {member.email && <span className="text-xs text-muted-foreground">({member.email})</span>}
                                {room.owner === member.uid && <Badge variant="outline">Owner</Badge>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex-1">
                <CodeEditor room={room} />
            </div>
        </div>
    );
} 