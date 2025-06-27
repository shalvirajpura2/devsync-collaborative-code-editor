import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import CodeEditor from '@/components/CodeEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Bell, X } from 'lucide-react';
import { toast } from "sonner";
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

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
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [pendingRemoveUid, setPendingRemoveUid] = useState(null);

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
            } finally {
                setMembersLoading(false);
            }
        };
        fetchMembers();
    }, [roomId, room]);

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
    };

    // Add remove access handler
    const handleRemoveAccess = async () => {
        if (!pendingRemoveUid) return;
        try {
            await api.post(`/api/rooms/${roomId}/remove-user`, { uid: pendingRemoveUid });
            toast.success('User access removed.');
            // Refresh members list
            const response = await api.get(`/api/rooms/${roomId}/members`);
            setMembers(response.data.members);
        } catch (err) {
            toast.error('Failed to remove user.');
        } finally {
            setRemoveDialogOpen(false);
            setPendingRemoveUid(null);
        }
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
        <div className="flex flex-col h-full w-full">
            {/* Custom Editor Header */}
            <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-zinc-800 bg-zinc-950/95 sticky top-0 z-20 w-full">
                {/* Left: Back button and room info */}
                <div className="flex items-center gap-6 min-w-0">
                    <Button variant="outline" size="sm" onClick={() => navigate('/app')}>
                        ← Back to Rooms
                    </Button>
                    <div className="flex flex-col min-w-0">
                        <span className="text-lg md:text-2xl font-bold truncate text-zinc-100 flex items-center gap-3">
                            {room?.name}
                            {/* Share Button */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button size="sm" variant="outline" className="ml-2">Share</Button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-64 bg-zinc-900 border-zinc-800 p-4 rounded-xl shadow-2xl mt-2 z-50">
                                    <div className="mb-2 font-semibold text-zinc-200">Share Room</div>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full mb-2 flex items-center gap-2"
                                        onClick={() => {
                                            navigator.clipboard.writeText(roomId);
                                            toast.success('Room ID copied!');
                                        }}
                                    >
                                        <Copy className="h-4 w-4" /> Copy Room ID
                                    </Button>
                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            const email = e.target.email.value;
                                            if (!email) return;
                                            try {
                                                await api.post(`/api/rooms/${roomId}/share-by-email`, { email });
                                                toast.success('Room shared via email!');
                                            } catch {
                                                toast.error('Failed to share room.');
                                            }
                                        }}
                                    >
                                        <input
                                            name="email"
                                            type="email"
                                            placeholder="Share via email"
                                            className="w-full rounded bg-zinc-800 border border-zinc-700 text-zinc-100 p-2 mb-2"
                                            required
                                        />
                                        <Button size="sm" variant="outline" className="w-full" type="submit">Share via Email</Button>
                                    </form>
                                </PopoverContent>
                            </Popover>
                        </span>
                        {/* <span className="text-xs md:text-sm text-zinc-400 truncate">Room ID: {room?._id}</span> */}
                    </div>
                </div>
                {/* Right: Participants, avatar, bell */}
                <div className="flex items-center gap-4 md:gap-6">
                    {/* Participants badge with dropdown */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Badge
                                variant="secondary"
                                className="cursor-pointer flex items-center gap-2 px-4 py-2 text-base font-semibold bg-zinc-800 text-zinc-100 hover:bg-zinc-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                <Users className="h-5 w-5" />
                                {members.length} users
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent
                            align="end"
                            className="max-w-xs w-full bg-zinc-900 border-zinc-800 py-4 px-4 rounded-xl shadow-2xl mt-2 z-50 max-h-72 overflow-auto"
                            sideOffset={8}
                        >
                            <div className="font-semibold mb-3 text-zinc-200 text-lg">Participants</div>
                            {membersLoading ? (
                                <div className="text-zinc-400 text-base py-4">Loading...</div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {members.map((member) => (
                                        <div
                                            key={member.uid}
                                            className="flex items-center gap-3 bg-zinc-800/80 px-3 py-2 rounded-lg border border-zinc-700 transition-colors hover:bg-zinc-700/80 focus:bg-zinc-700/80 cursor-pointer"
                                            tabIndex={0}
                                        >
                                            {/* Avatar Circle */}
                                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-base select-none">
                                                {(member.display_name || member.email || member.uid)[0]?.toUpperCase()}
                                            </span>
                                            {/* Name/Email */}
                                            <span className="flex flex-col min-w-0">
                                                <span className="font-medium text-zinc-100 text-base truncate max-w-[10rem]">
                                                    {member.display_name || member.email || member.uid}
                                                </span>
                                                {member.email && (
                                                    <span className="text-xs text-zinc-400 truncate max-w-[10rem]">{member.email}</span>
                                                )}
                                            </span>
                                            {/* Owner badge */}
                                            {room.owner === member.uid && (
                                                <Badge variant="outline" className="ml-2 text-xs px-2 py-0.5 border-indigo-400 text-indigo-300">Owner</Badge>
                                            )}
                                            {/* Remove button for owner, not for self */}
                                            {user?.uid === room.owner && member.uid !== room.owner && (
                                                <button
                                                    className="ml-auto text-red-400 hover:text-red-600 p-1 rounded transition"
                                                    title="Remove access"
                                                    onClick={() => {
                                                        setPendingRemoveUid(member.uid);
                                                        setRemoveDialogOpen(true);
                                                    }}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                
                </div>
            </header>
            {/* Main Editor Area - full width */}
            <div className="flex-1 flex flex-col min-h-0">
                <CodeEditor room={room} />
            </div>
            {/* Remove User Confirmation Modal */}
            <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user from the room?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setRemoveDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveAccess} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 