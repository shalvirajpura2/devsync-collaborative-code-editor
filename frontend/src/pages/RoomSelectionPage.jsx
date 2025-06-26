import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Users, Copy, Share2, LogIn, MoreHorizontal, Edit, Trash2, Code2, CheckCircle2, XCircle } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Badge } from '@/components/ui/badge';
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { formatDistanceToNow } from 'date-fns';
import { format } from 'date-fns-tz';
import { getIdToken } from 'firebase/auth';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function RoomSelectionPage() {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [loading, setLoading] = useState(false);
    const [joinLoading, setJoinLoading] = useState(false);
    const navigate = useNavigate();
    const { user, loading: authLoading } = useFirebaseAuth();
    const [tab, setTab] = useState('owned');
    const [tabRooms, setTabRooms] = useState([]);
    const [tabLoading, setTabLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendError, setResendError] = useState("");
    const [roomsLoaded, setRoomsLoaded] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    // State for dialogs
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [renamedRoomName, setRenamedRoomName] = useState("");

    const isValidObjectId = useMemo(() => {
        return /^[0-9a-fA-F]{24}$/.test(joinRoomId);
    }, [joinRoomId]);

    useEffect(() => {
        if (user) {
            fetchRooms();
        }
    }, [user]);

    const fetchTabRooms = async (retryCount = 0) => {
        if (!user) return;
        setTabLoading(true);
        setRoomsLoaded(false);
        setFetchError(null);
        try {
            // Always force a fresh token
            const token = user.getIdToken ? await user.getIdToken(true) : null;
            let url = '/api/rooms';
            if (tab === 'owned') url += '?owned=true';
            else if (tab === 'shared') url += '?shared=true';
            const response = await api.get(url); // Interceptor handles token
            setTabRooms(Array.isArray(response.data) ? response.data : []);
            setRoomsLoaded(true);
        } catch (error) {
            if (retryCount < 3 && error.response && (error.response.status === 401 || error.response.status === 403)) {
                setTimeout(() => fetchTabRooms(retryCount + 1), 500);
                return;
            }
            setTabRooms([]);
            setRoomsLoaded(true);
            setFetchError("Failed to fetch rooms. Please try again.");
        } finally {
            setTabLoading(false);
        }
    };

    useEffect(() => {
        console.log('authLoading:', authLoading, 'user:', user);
        if (!authLoading && user) {
            console.log('Fetching rooms...');
            fetchTabRooms();
        }
    }, [authLoading, user, tab]);

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
            toast.success("Room created successfully!");
            navigate(`/editor/${roomId}`);
        } catch (error) {
            toast.error("Failed to create room.");
        } finally {
            setLoading(false);
        }
    };

    const joinRoom = async (roomId) => {
        if (!roomId.trim()) return;
        setJoinLoading(true);
        try {
            await api.get(`/api/rooms/${roomId}`);
            navigate(`/editor/${roomId}`);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "An unexpected error occurred.";
            if (error.response?.status === 403) {
                toast.error("You are not authorized to access this room.", {
                    action: {
                        label: "Request to Join",
                        onClick: () => requestToJoin(roomId),
                    },
                });
            } else if (error.response?.status === 404) {
                toast.error("Room not found. Please check the ID.");
            } else {
                toast.error(`Error: ${errorMessage}`);
            }
        } finally {
            setJoinLoading(false);
        }
    };

    const requestToJoin = async (roomId) => {
        try {
            const response = await api.post(`/api/requests/join?room_id=${roomId}`);
            toast.success(response.data.message);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to send join request.");
        }
    };

    const copyRoomId = (roomId) => {
        navigator.clipboard.writeText(roomId);
        toast.info("Room ID copied to clipboard.");
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
            toast.success(response.data.message);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to share room by email');
        }
    };

    const handleDeleteRoom = async () => {
        if (!selectedRoom) return;
        try {
            await api.delete(`/api/rooms/${selectedRoom._id}`);
            toast.success(`Room "${selectedRoom.name}" deleted.`);
            setTabRooms(prevRooms => prevRooms.filter(room => room._id !== selectedRoom._id));
        } catch (error) {
            toast.error("Failed to delete room.");
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedRoom(null);
        }
    };

    const handleRenameRoom = async () => {
        if (!selectedRoom || !renamedRoomName.trim()) return;
        try {
            await api.put(`/api/rooms/${selectedRoom._id}`, { name: renamedRoomName });
            toast.success(`Room renamed to "${renamedRoomName}".`);
            setTabRooms(prevRooms => prevRooms.map(room => 
                room._id === selectedRoom._id ? { ...room, name: renamedRoomName } : room
            ));
        } catch (error) {
            toast.error("Failed to rename room.");
        } finally {
            setIsRenameDialogOpen(false);
            setSelectedRoom(null);
            setRenamedRoomName("");
        }
    };

    if (authLoading || !user || !roomsLoaded) {
        return <div className="flex items-center justify-center h-screen text-zinc-400">Loading...</div>;
    }

    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-zinc-400">
                <div>{fetchError}</div>
                <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => fetchTabRooms(0)}>Retry</button>
            </div>
        );
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
        <TooltipProvider>
            <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="bg-zinc-900/70 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Plus className="w-6 h-6 text-indigo-400" /> Create New Room</CardTitle>
                            <CardDescription>Start a new collaborative coding session.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter room name"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && createRoom()}
                                    className="bg-zinc-800 border-zinc-700 focus:ring-indigo-500"
                                />
                                <Button onClick={createRoom} disabled={loading || !newRoomName.trim()}>
                                    {loading ? 'Creating...' : 'Create'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-900/70 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><LogIn className="w-6 h-6 text-fuchsia-400" /> Join Existing Room</CardTitle>
                            <CardDescription>Have a Room ID? Jump right in.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="flex gap-2 relative">
                                <Input
                                    placeholder="Enter 24-character room ID"
                                    value={joinRoomId}
                                    onChange={(e) => setJoinRoomId(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && isValidObjectId && joinRoom(joinRoomId)}
                                    className="bg-zinc-800 border-zinc-700 focus:ring-fuchsia-500 pr-8"
                                />
                                {joinRoomId && (
                                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                        {isValidObjectId ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        )}
                                    </div>
                                )}
                                <Button onClick={() => joinRoom(joinRoomId)} disabled={joinLoading || !isValidObjectId} variant="secondary">
                                    {joinLoading ? 'Joining...' : 'Join'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Separator className="border-zinc-800" />

                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-900/70 border border-zinc-800">
                        <TabsTrigger value="owned">My Rooms</TabsTrigger>
                        <TabsTrigger value="shared">Shared With Me</TabsTrigger>
                    </TabsList>
                    <TabsContent value="owned">
                        {renderRoomGrid(tabRooms, tabLoading, user, 'owned')}
                    </TabsContent>
                    <TabsContent value="shared">
                        {renderRoomGrid(tabRooms, tabLoading, user, 'shared')}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Rename Dialog */}
            <AlertDialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rename Room</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter a new name for the room "{selectedRoom?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                        value={renamedRoomName}
                        onChange={(e) => setRenamedRoomName(e.target.value)}
                        placeholder="New room name"
                        className="my-4"
                    />
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRenameRoom}>Rename</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            room "{selectedRoom?.name}" and all of its data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </TooltipProvider>
    );
    
    function renderRoomGrid(rooms, isLoading, currentUser, type) {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                    {[...Array(3)].map((_, i) => (
                         <Card key={i} className="bg-zinc-900/70 border-zinc-800 flex flex-col animate-pulse">
                            <CardHeader><div className="h-6 bg-zinc-700 rounded w-3/4"></div></CardHeader>
                            <CardContent><div className="h-4 bg-zinc-700 rounded w-1/2"></div></CardContent>
                            <CardFooter className="mt-auto flex justify-between p-4 border-t border-zinc-800">
                                <div className="h-8 bg-zinc-700 rounded w-20"></div>
                                <div className="h-8 bg-zinc-700 rounded w-20"></div>
                            </CardFooter>
                         </Card>
                    ))}
                </div>
            )
        }

        if (rooms.length === 0) {
            return (
                <Card className="mt-6 bg-zinc-900/70 border-zinc-800">
                    <CardContent className="text-center py-16">
                        <p className="text-zinc-400">
                            {type === 'owned'
                                ? "You haven't created any rooms yet."
                                : "No rooms have been shared with you."}
                        </p>
                    </CardContent>
                </Card>
            );
        }

        // Helper to format UTC date to user's local time
        const getLocalTime = (utcDate) => {
            if (!utcDate) return null;
            return new Date(utcDate).toLocaleString(); // User's local time
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {rooms.map((room) => (
                    <Card key={room._id} className="bg-zinc-900/70 border-zinc-800 flex flex-col hover:border-indigo-500/50 transition-colors">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <span className="truncate pr-2">{room.name}</span>
                                {currentUser && room.owner === currentUser.uid && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => {
                                                setSelectedRoom(room);
                                                setRenamedRoomName(room.name);
                                                setIsRenameDialogOpen(true);
                                            }}>
                                                <Edit className="mr-2 h-4 w-4" /> Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => {
                                                setSelectedRoom(room);
                                                setIsDeleteDialogOpen(true);
                                            }} className="text-red-500">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </CardTitle>
                            <Tooltip>
                                <TooltipTrigger>
                                    <CardDescription>
                                        {room.last_activity 
                                            ? `Last activity: ${getLocalTime(room.last_activity)}`
                                            : 'No recent activity'
                                        }
                                    </CardDescription>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{room.last_activity ? formatDistanceToNow(new Date(room.last_activity), { addSuffix: true }) : 'N/A'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                             <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize"><Code2 className="h-3 w-3 mr-1" /> {room.language}</Badge>
                                <Badge variant="secondary" className="flex items-center gap-1.5">
                                    <Users className="h-3 w-3" />
                                    <span>{1 + (room.shared_with ? room.shared_with.length : 0)}</span>
                                </Badge>
                             </div>
                        </CardContent>
                        <CardFooter className="mt-auto flex justify-between items-center gap-2 p-4 border-t border-zinc-800">
                             {currentUser && room.owner === currentUser.uid ? (
                                <Button variant="ghost" size="sm" onClick={() => copyRoomId(room._id)} className="text-zinc-400 hover:text-white">
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy ID
                                </Button>
                            ) : <div></div> /* Empty div to maintain spacing */}
                            <div className="flex gap-2">
                                {currentUser && room.owner === currentUser.uid && (
                                    <Button variant="outline" size="sm" onClick={() => shareRoomByEmail(room._id)}>
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button size="sm" onClick={() => joinRoom(room._id)}>
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Join
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }
} 