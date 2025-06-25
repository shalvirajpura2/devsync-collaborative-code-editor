import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Copy, Search, Mail, Clock } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import DashboardLayout from '@/components/DashboardLayout';

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
    const [search, setSearch] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendError, setResendError] = useState("");
    const [showJoinInput, setShowJoinInput] = useState(false);

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
            const response = await api.post(`/api/rooms`, { name: newRoomName });
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

    // Filtered rooms by search
    const filteredRooms = tabRooms.filter(room =>
        room.name.toLowerCase().includes(search.toLowerCase()) ||
        (room._id && room._id.toLowerCase().includes(search.toLowerCase()))
    );

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
        <DashboardLayout>
            {/* Filters and Actions */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-6">
                <div className="relative flex-1 max-w-xs">
                    <Input
                        className="pl-10 rounded-xl bg-zinc-800 border-zinc-700 text-zinc-100 font-mono focus:ring-2 focus:ring-indigo-500"
                        placeholder="Search rooms..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                </div>
                <Button
                    className="rounded-xl font-semibold flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-all"
                    onClick={() => setShowJoinInput(v => !v)}
                    variant="outline"
                >
                    Join Room
                </Button>
                <Button
                    className="rounded-xl font-semibold flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 transition-all"
                    onClick={() => document.getElementById('new-room-input')?.focus()}
                >
                    <Plus className="w-5 h-5" /> New Room
                </Button>
            </div>
            {/* Join Room Input */}
            {showJoinInput && (
                <div className="flex gap-2 mb-4 max-w-xs">
                    <Input
                        placeholder="Enter room ID"
                        value={joinRoomId}
                        onChange={e => setJoinRoomId(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && joinRoom(joinRoomId)}
                        className="rounded-xl bg-zinc-800 border-zinc-700 text-zinc-100 font-mono"
                    />
                    <Button onClick={() => joinRoom(joinRoomId)} disabled={!joinRoomId.trim()} className="rounded-xl">Join</Button>
                </div>
            )}
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    className={`px-5 py-2 rounded-xl font-mono text-base transition-all ${tab === 'owned' ? 'bg-indigo-700/60 text-white shadow' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                    onClick={() => setTab('owned')}
                >
                    My Rooms <span className="ml-2 bg-zinc-700 text-xs px-2 py-0.5 rounded-full font-bold">{rooms.filter(r => r.owner === user?.uid).length}</span>
                </button>
                <button
                    className={`px-5 py-2 rounded-xl font-mono text-base transition-all ${tab === 'shared' ? 'bg-indigo-700/60 text-white shadow' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                    onClick={() => setTab('shared')}
                >
                    Shared With Me <span className="ml-2 bg-zinc-700 text-xs px-2 py-0.5 rounded-full font-bold">{rooms.filter(r => r.owner !== user?.uid).length}</span>
                </button>
            </div>
            {/* Room Cards */}
            {tabLoading ? (
                <div className="text-center py-8">Loading rooms...</div>
            ) : filteredRooms.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-zinc-400 font-mono">No rooms found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRooms.map((room) => (
                        <Card key={room._id} className="rounded-2xl bg-zinc-900/80 border-zinc-800 shadow-lg hover:scale-[1.025] hover:shadow-2xl transition-all group">
                            <CardContent className="p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-lg font-mono truncate" title={room.name}>{room.name}</h3>
                                    <div className="flex gap-1">
                                        {room.owner === user?.uid ? (
                                            <Badge variant="outline" className="bg-indigo-700/60 text-indigo-200 font-mono">Owner</Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-fuchsia-700/60 text-fuchsia-200 font-mono">Collaborator</Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{1 + (room.shared_with ? room.shared_with.length : 0)}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{room.last_activity ? room.last_activity : '—'}</span>
                                    <span className="flex items-center gap-1"><Badge variant="secondary" className="bg-zinc-800 text-zinc-300">Python</Badge></span>
                                    <span className="flex items-center gap-1"><Badge variant="secondary" className="bg-zinc-800 text-zinc-300">{room.status || 'active'}</Badge></span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" className="rounded-lg font-mono flex-1 bg-indigo-600 hover:bg-indigo-700 transition-all" onClick={() => joinRoom(room._id)}>Join</Button>
                                    <Button size="sm" variant="outline" className="rounded-lg font-mono flex-1 flex items-center gap-1" onClick={() => copyRoomId(room._id)}><Copy className="w-4 h-4" />Share</Button>
                                    <Button size="sm" variant="outline" className="rounded-lg font-mono flex-1 flex items-center gap-1" onClick={() => shareRoomByEmail(room._id)}><Mail className="w-4 h-4" />Invite</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
} 