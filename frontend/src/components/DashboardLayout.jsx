import { useNavigate, useLocation } from 'react-router-dom';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Home, PlusCircle, Users, Code, Bell, Check, X, User as UserIcon, LifeBuoy, Settings, MoreVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import api from '@/lib/axios';
import { useState, useEffect, useRef } from 'react';
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function DashboardLayout({ children }) {
  const { user, logout } = useFirebaseAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [recentRooms, setRecentRooms] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState(null); // 'rename' or 'delete'
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const shownActionToastIds = useRef(new Set(JSON.parse(localStorage.getItem('shownActionToastIds') || '[]')));

  const fetchPendingRequests = async () => {
    if (!user) return;
    try {
      const response = await api.get('/api/requests/pending');
      setPendingRequests(response.data);
    } catch (error) {
      toast.error("Failed to fetch join requests.");
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const fetchRecentRooms = () => {
        if (user) {
            const storedRooms = JSON.parse(localStorage.getItem(`recentRooms_${user.uid}`) || '[]');
            setRecentRooms(storedRooms);
        }
    };
    
    fetchRecentRooms();
    
    window.addEventListener('storage', fetchRecentRooms);
    return () => window.removeEventListener('storage', fetchRecentRooms);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [pending, my] = await Promise.all([
          api.get('/api/requests/pending'),
          api.get('/api/requests/my')
        ]);
        setPendingRequests(pending.data);
        setMyRequests(my.data);
      } catch {}
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const seen = JSON.parse(localStorage.getItem(`seenRequestNotis_${user.uid}`) || '{}');
    myRequests.forEach(req => {
      if ((req.status === 'approved' || req.status === 'denied') && !seen[req.request_id]) {
        toast[req.status === 'approved' ? 'success' : 'error'](
          `Your request to join "${req.room_name}" was ${req.status}.`
        );
        seen[req.request_id] = true;
      }
    });
    localStorage.setItem(`seenRequestNotis_${user.uid}`, JSON.stringify(seen));
  }, [myRequests, user]);

  // Helper to get/set seen notification IDs
  const getSeenNotiIds = (key) => {
    if (!user) return new Set();
    let parsed;
    try {
      parsed = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      parsed = [];
    }
    if (!Array.isArray(parsed)) parsed = [];
    return new Set(parsed);
  };
  const setSeenNotiIds = (key, ids) => {
    if (!user) return;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  };

  // --- Persistent Cleared Notifications ---
  const getClearedNotiIds = () => {
    if (!user) return new Set();
    let parsed;
    try {
      parsed = JSON.parse(localStorage.getItem(`clearedNotiIds_${user.uid}`) || '[]');
    } catch {
      parsed = [];
    }
    if (!Array.isArray(parsed)) parsed = [];
    return new Set(parsed);
  };
  const addClearedNotiIds = (ids) => {
    if (!user) return;
    const cleared = getClearedNotiIds();
    ids.forEach(id => cleared.add(id));
    localStorage.setItem(`clearedNotiIds_${user.uid}`, JSON.stringify(Array.from(cleared)));
  };

  // --- Filter notifications to exclude cleared ---
  const filteredPendingRequests = pendingRequests.filter(req => !getClearedNotiIds().has(req.request_id));
  const filteredMyRequests = myRequests.filter(req => !getClearedNotiIds().has(req.request_id));

  // --- Toast for new join requests (owner) ---
  useEffect(() => {
    if (!user) return;
    const seenOwner = getSeenNotiIds(`seenOwnerRequestNotis_${user.uid}`);
    const cleared = getClearedNotiIds();
    let updated = false;
    filteredPendingRequests.forEach(req => {
      if (!seenOwner.has(req.request_id) && !cleared.has(req.request_id)) {
        toast.info(`New join request for "${req.room_name}" from ${req.requester_email}`);
        seenOwner.add(req.request_id);
        updated = true;
      }
    });
    if (updated) setSeenNotiIds(`seenOwnerRequestNotis_${user.uid}`, seenOwner);
  }, [filteredPendingRequests, user]);

  const handleApprove = async (requestId) => {
    try {
      await api.post(`/api/requests/${requestId}/approve`);
      if (!shownActionToastIds.current.has(requestId)) {
        toast.success("Request approved!");
        shownActionToastIds.current.add(requestId);
        localStorage.setItem('shownActionToastIds', JSON.stringify(Array.from(shownActionToastIds.current)));
      }
      fetchPendingRequests();
    } catch (error) {
      toast.error("Failed to approve request.");
    }
  };

  const handleDeny = async (requestId) => {
    try {
      await api.post(`/api/requests/${requestId}/deny`);
      if (!shownActionToastIds.current.has(requestId)) {
        toast.info("Request denied.");
        shownActionToastIds.current.add(requestId);
        localStorage.setItem('shownActionToastIds', JSON.stringify(Array.from(shownActionToastIds.current)));
      }
      fetchPendingRequests();
    } catch (error) {
      toast.error("Failed to deny request.");
    }
  };

  const handleLogout = () => {
    logout().then(() => {
        navigate('/');
    });
  };

  const navItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/app' },
    // { label: 'New Room', icon: <PlusCircle className="w-5 h-5" />, path: '/app/new' },
    // Add more nav items as needed
  ];

  const handleRecentRename = (room) => {
    setSelectedRoom(room);
    setRenameValue(room.name);
    setDialogType('rename');
    setShowDialog(true);
  };
  const handleRecentDelete = (room) => {
    setSelectedRoom(room);
    setDialogType('delete');
    setShowDialog(true);
  };
  const handleRenameSubmit = async () => {
    try {
      await api.put(`/api/rooms/${selectedRoom.id}`, { name: renameValue });
      toast.success('Room renamed.');
      setRecentRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, name: renameValue } : r));
      setShowDialog(false);
    } catch {
      toast.error('Failed to rename room.');
    }
  };
  const handleDeleteSubmit = async () => {
    try {
      await api.delete(`/api/rooms/${selectedRoom.id}`);
      toast.success('Room deleted.');
      setRecentRooms(prev => prev.filter(r => r.id !== selectedRoom.id));
      setShowDialog(false);
    } catch {
      toast.error('Failed to delete room.');
    }
  };

  // Bell badge count
  const bellCount = user && (
    (pendingRequests.length && pendingRequests[0].owner_uid === user.uid)
      ? pendingRequests.length
      : myRequests.length
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900/90 border-r border-zinc-800 p-6 gap-8">
        <div className="flex items-center gap-2 mb-8">
          <Code className="w-7 h-7 text-indigo-400" />
          <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">DevSync</span>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left ${location.pathname === item.path ? 'bg-indigo-700/30 text-indigo-300' : 'hover:bg-zinc-800/80'}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="mt-8 pt-4 border-t border-zinc-800">
            <h3 className="px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Recent Rooms</h3>
            <div className="flex flex-col gap-1">
                {recentRooms.length > 0 ? recentRooms.map(room => (
                    <div key={room.id} className="group flex items-center justify-between rounded-lg hover:bg-zinc-800/80">
                        <button 
                            className="flex-1 text-left text-sm px-4 py-2 truncate"
                            onClick={() => navigate(`/editor/${room.id}`)}
                        >
                            {room.name}
                        </button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4 text-zinc-400" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 bg-zinc-900 border-zinc-800">
                            <button
                              className="flex items-center gap-2 w-full px-2 py-1 hover:bg-zinc-800 rounded"
                              onClick={() => {
                                if (user?.uid !== room.owner) {
                                  toast.error('You do not own this room.');
                                } else {
                                  handleRecentRename(room);
                                }
                              }}
                            >
                              <Settings className="h-4 w-4" /> Rename
                            </button>
                            <button
                              className="flex items-center gap-2 w-full px-2 py-1 hover:bg-zinc-800 rounded text-red-400"
                              onClick={() => {
                                if (user?.uid !== room.owner) {
                                  toast.error('You do not own this room.');
                                } else {
                                  handleRecentDelete(room);
                                }
                              }}
                            >
                              <LogOut className="h-4 w-4" /> Delete
                            </button>
                          </PopoverContent>
                        </Popover>
                    </div>
                )) : (
                    <p className="px-4 text-sm text-zinc-500">No recent rooms.</p>
                )}
            </div>
        </div>
        
        <div className="mt-auto"></div>
      </aside>
      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">Dashboard</span>
            {/* Add breadcrumbs or page title here if needed */}
          </div>
          <div className="flex items-center gap-2">
            {/* User Avatar and Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-zinc-700 text-zinc-200">
                      {user ? user.email[0].toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">My Account</p>
                    <p className="text-xs leading-none text-zinc-400">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {bellCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0">
                      {bellCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-zinc-900 border-zinc-800 text-zinc-100">
                <div className="font-medium leading-none mb-2">Requests</div>
                {user && pendingRequests.length > 0 && pendingRequests[0].owner_uid === user.uid ? (
                  pendingRequests.map(req => (
                    <div key={req.request_id} className="flex items-center justify-between p-3 mb-2 rounded-lg bg-zinc-800/60 shadow">
                      <div>
                        <div className="font-semibold">{req.requester_email}</div>
                        <div className="text-xs text-zinc-400">
                          wants to join <span className="font-semibold text-indigo-400">{req.room_name}</span>
                        </div>
                        <div className="text-xs text-zinc-500">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button size="icon" variant="outline" className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20" onClick={() => handleApprove(req.request_id)}>
                          <Check className="h-4 w-4 text-green-400" />
                        </Button>
                        <Button size="icon" variant="outline" className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20" onClick={() => handleDeny(req.request_id)}>
                          <X className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  myRequests.length > 0 ? (
                    myRequests.map(req => (
                      <div key={req.request_id} className="flex items-center justify-between p-2 rounded bg-zinc-800/50 mb-2">
                        <div>
                          <span className="font-medium">Request to {req.room_name}</span>
                          <span className="text-xs text-zinc-400 ml-2">Status: <span className="font-semibold text-indigo-400">{req.status}</span></span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-400 text-center py-4">No requests.</p>
                  )
                )}
              </PopoverContent>
            </Popover>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 p-6 md:p-10 bg-transparent">
          {children}
        </main>
      </div>
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogType === 'rename' ? 'Rename Room' : 'Delete Room'}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogType === 'rename' ? (
                <>
                  Enter a new name for the room "{selectedRoom?.name}".
                  <input className="w-full mt-4 p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100" value={renameValue} onChange={e => setRenameValue(e.target.value)} />
                </>
              ) : (
                <>Are you sure you want to delete the room "{selectedRoom?.name}"? This cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {dialogType === 'rename' ? (
              <AlertDialogAction onClick={handleRenameSubmit}>Rename</AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleDeleteSubmit} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 