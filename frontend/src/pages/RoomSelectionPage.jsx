import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Users, Copy } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Badge } from '@/components/ui/badge';
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
    const [verificationSent, setVerificationSent] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendError, setResendError] = useState("");

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

    // Auto-refresh for email verification
    useEffect(() => {
        if (user && !user.emailVerified) {
            const interval = setInterval(async () => {
                await auth.currentUser.reload();
                if (auth.currentUser.emailVerified) {
                    window.location.reload();
                }
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [user]);

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

    if (user && !user.emailVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100">
                <div className="w-full max-w-md bg-zinc-900/90 rounded-xl shadow-2xl border border-zinc-800 p-8 flex flex-col items-center">
                    <span className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent mb-2">DevSync</span>
                    <span className="text-zinc-400 text-sm mb-6">Collaborate. Code. Run — Together in Real-Time.</span>
                    <h2 className="text-xl font-bold mb-2 text-center">Verify Your Email</h2>
                    <p className="mb-4 text-center text-zinc-300">
                        A verification link has been sent to <span className="font-semibold text-indigo-300">{user.email}</span>.<br />
                        Please verify your email to continue.
                    </p>
                    <Button onClick={async () => {
                        setResendLoading(true);
                        setResendError("");
                        try {
                            await sendEmailVerification(auth.currentUser);
                            setVerificationSent(true);
                        } catch (err) {
                            setResendError("Failed to send verification email.");
                        } finally {
                            setResendLoading(false);
                        }
                    }} disabled={resendLoading || verificationSent} className="mb-2 w-full">
                        {resendLoading ? 'Sending...' : verificationSent ? 'Verification Sent' : 'Resend Verification Email'}
                    </Button>
                    {resendError && <div className="text-red-400 text-sm text-center mb-2">{resendError}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-4xl mx-auto">
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