import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Users, Copy } from 'lucide-react';
import AuthPanel from '@/components/AuthPanel';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Badge } from '@/components/ui/badge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function RoomSelectionPage() {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user, loading: authLoading } = useFirebaseAuth();
    const [tab, setTab] = useState('owned');
    const [tabRooms, setTabRooms] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchRooms();
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const fetchTabRooms = async () => {
            setTabLoading(true);
            try {
                let url = '/api/rooms';
                if (tab === 'owned') url += '?owned=true';
                else if (tab === 'shared') url += '?shared=true';
                const response = await api.get(url);
                setTabRooms(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                setTabRooms([]);
            } finally {
                setTabLoading(false);
            }
        };
        fetchTabRooms();
    }, [user, tab]);

    const fetchRooms = async () => {
        try {
            const response = await api.get(`/api/rooms`);
            setRooms(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            setRooms([]);
            console.error('Error fetching rooms:', error);
        }
    };

    const createRoom = async () => {
        if (!newRoomName.trim()) return;
        
        setLoading(true);
        try {
            const response = await api.post(`/api/rooms`, {
                name: newRoomName,
            });
            
            const roomId = response.data.room_id;
            setNewRoomName('');
            navigate(`/editor/${roomId}`);
        } catch (error) {
            console.error('Error creating room:', error);
        } finally {
            setLoading(false);
        }
    };

    const joinRoom = (roomId) => {
        if (!roomId.trim()) return;
        navigate(`/editor/${roomId}`);
    };

    const copyRoomId = (roomId) => {
        navigator.clipboard.writeText(roomId);
    };

    const shareRoom = async (roomId) => {
        const shareWithUid = prompt('Enter the UID of the user to share with:');
        if (!shareWithUid) return;
        try {
            const response = await api.post(`/api/rooms/${roomId}/share`, { share_with_uid: shareWithUid });
            alert(response.data.message);
        } catch (error) {
            alert(error.response?.data?.detail || 'Failed to share room');
        }
    };

    const shareRoomByEmail = async (roomId) => {
        const email = prompt('Enter the email of the user to share with:');
        if (!email) return;
        try {
            const response = await api.post(`/api/rooms/${roomId}/share-by-email`, { email });
            alert(response.data.message);
        } catch (error) {
            alert(error.response?.data?.detail || 'Failed to share room by email');
        }
    };

    if (authLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto">
                <AuthPanel />
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-2">Collaborative Code Editor</h1>
                    <p className="text-muted-foreground">
                        Create or join a room to start coding together in real-time
                    </p>
                </header>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Create New Room</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Enter room name"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                            />
                            <Button onClick={createRoom} disabled={loading || !newRoomName.trim()} className="w-full">
                                {loading ? 'Creating...' : 'Create Room'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Join Existing Room</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Enter room ID"
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && joinRoom(joinRoomId)}
                            />
                            <Button onClick={() => joinRoom(joinRoomId)} disabled={!joinRoomId.trim()} className="w-full" variant="outline">
                                Join Room
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Separator className="my-8" />

                <div className="mb-6 flex justify-center">
                    <button
                        className={`px-4 py-2 rounded-l border ${tab === 'owned' ? 'bg-primary text-white' : 'bg-card text-muted-foreground'}`}
                        onClick={() => setTab('owned')}
                    >
                        My Rooms
                    </button>
                    <button
                        className={`px-4 py-2 rounded-r border-l-0 border ${tab === 'shared' ? 'bg-primary text-white' : 'bg-card text-muted-foreground'}`}
                        onClick={() => setTab('shared')}
                    >
                        Shared With Me
                    </button>
                </div>

                <div>
                    <h2 className="text-2xl font-semibold mb-4">
                        {tab === 'owned' ? 'My Rooms' : 'Rooms Shared With Me'}
                    </h2>
                    {tabLoading ? (
                        <div className="text-center py-8">Loading rooms...</div>
                    ) : tabRooms.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-8">
                                <p className="text-muted-foreground">No rooms found.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {tabRooms.map((room) => (
                                <Card key={room._id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold flex items-center gap-2">
                                                    {room.name}
                                                    {user && room.owner === user.uid && (
                                                        <Badge variant="outline">Owner</Badge>
                                                    )}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>ID: {room._id}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => copyRoomId(room._id)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Users className="h-4 w-4" />
                                                    {1 + (room.shared_with ? room.shared_with.length : 0)}
                                                </div>
                                                <Button onClick={() => joinRoom(room._id)}>Join Room</Button>
                                                {user && room.owner === user.uid && (
                                                    <>
                                                        <Button variant="outline" onClick={() => shareRoom(room._id)}>
                                                            Share by UID
                                                        </Button>
                                                        <Button variant="outline" onClick={() => shareRoomByEmail(room._id)}>
                                                            Share by Email
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 