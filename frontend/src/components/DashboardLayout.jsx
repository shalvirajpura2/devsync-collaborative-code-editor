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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import DevSyncLogo from '@/assets/devsync-logo.png';

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
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionDialogMessage, setActionDialogMessage] = useState('');

  const fetchPendingRequests = async () => {
    if (!user) return;
    try {
      const response = await api.get('/api/requests/pending');
      setPendingRequests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
      setPendingRequests([]); // Ensure it's always an array
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const fetchRecentRooms = async () => {
      if (user) {
        const storedRooms = JSON.parse(localStorage.getItem(`recentRooms_${user.uid}`) || '[]');
        // Fetch all rooms the user has access to
        let validRoomIds = new Set();
        try {
          const response = await api.get('/api/rooms');
          if (Array.isArray(response.data)) {
            validRoomIds = new Set(response.data.map(r => r._id));
          }
        } catch (e) {
          // If API fails, fallback to showing all stored rooms
          setRecentRooms(storedRooms);
          return;
        }
        // Filter out rooms that no longer exist
        const filteredRooms = storedRooms.filter(r => validRoomIds.has(r.id));
        setRecentRooms(filteredRooms);
        localStorage.setItem(`recentRooms_${user.uid}`, JSON.stringify(filteredRooms));
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
        setPendingRequests(Array.isArray(pending.data) ? pending.data : []);
        setMyRequests(Array.isArray(my.data) ? my.data : []);
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setPendingRequests([]);
        setMyRequests([]);
      }
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
        updated = true;
      }
    });
    if (updated) setSeenNotiIds(`seenOwnerRequestNotis_${user.uid}`, seenOwner);
  }, [filteredPendingRequests, user]);

  const handleApprove = async (requestId) => {
    try {
      await api.post(`/api/requests/${requestId}/approve`);
      fetchPendingRequests();
    } catch (error) {
      toast.error("Failed to approve request.");
    }
  };

  const handleDeny = async (requestId) => {
    try {
      await api.post(`/api/requests/${requestId}/deny`);
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
      // Re-fetch recent rooms to ensure sidebar is up-to-date
      if (user) {
        const storedRooms = JSON.parse(localStorage.getItem(`recentRooms_${user.uid}`) || '[]');
        let validRoomIds = new Set();
        try {
          const response = await api.get('/api/rooms');
          if (Array.isArray(response.data)) {
            validRoomIds = new Set(response.data.map(r => r._id));
          }
        } catch (e) {
          setRecentRooms(storedRooms);
        }
        const filteredRooms = storedRooms.filter(r => validRoomIds.has(r.id));
        setRecentRooms(filteredRooms);
        localStorage.setItem(`recentRooms_${user.uid}`, JSON.stringify(filteredRooms));
      }
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

  // Real-time WebSocket notifications only
  useEffect(() => {
    if (!user) return;
    const wsUrl = `wss://devsync-backend-erdnbdbpb7azcdet.westindia-01.azurewebsites.net/ws/notifications`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      if (user?.uid) {
        ws.send(JSON.stringify({ type: 'auth', user_uid: user.uid }));
      }
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'notification') {
        setNotifications((prev) => [message, ...prev]);
      }
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };
    wsRef.current = ws;
    return () => {
      ws.close();
    };
  }, [user]);

  const handleApproveRequest = async (notif, idx) => {
    try {
      await api.post(`/api/requests/${notif.request_id}/approve`);
      setActionDialogMessage('Join request approved. The user will be notified.');
      setActionDialogOpen(true);
      setNotifications((prev) => prev.filter((_, i) => i !== idx));
    } catch (error) {
      setActionDialogMessage('Failed to approve join request.');
      setActionDialogOpen(true);
    }
  };
  const handleDenyRequest = async (notif, idx) => {
    try {
      await api.post(`/api/requests/${notif.request_id}/deny`);
      setActionDialogMessage('Join request denied. The user will be notified.');
      setActionDialogOpen(true);
      setNotifications((prev) => prev.filter((_, i) => i !== idx));
    } catch (error) {
      setActionDialogMessage('Failed to deny join request.');
      setActionDialogOpen(true);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-gradient-to-br from-[#18181b] via-[#23272f] to-[#1e293b] text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex fixed z-20 top-0 left-0 h-full w-64 flex-col bg-zinc-900/90 border-r border-zinc-800 pt-0 pb-0">
        <div className="flex flex-col h-full overflow-y-auto p-6 gap-8">
          <div className="flex items-center gap-2 mb-8 mt-2">
            <img src={DevSyncLogo} alt="DevSync Logo" className="w-32 h-12 object-contain shadow-lg" />
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
        </div>
      </aside>
      {/* Main Area */}
      <div className="flex-1 flex flex-col h-screen ml-0 md:ml-64">
        {/* Header */}
        <header className="fixed z-30 top-0 left-0 md:left-64 w-full md:w-[calc(100%-16rem)] flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-zinc-800 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile menu button placeholder */}
            <button className="md:hidden mr-2 p-2 rounded hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Open sidebar">
              <svg className="h-6 w-6 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
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
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {/* <DropdownMenuItem disabled>
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  <span>Support</span>
                </DropdownMenuItem> */}
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
                  {notifications.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-zinc-900 border-zinc-800 text-zinc-100 fixed right-4 top-16 z-50">
                <div className="font-medium leading-none mb-2">Notifications</div>
                {notifications.length > 0 ? (
                  notifications.map((notif, idx) => (
                    <div key={idx} className="p-3 mb-2 rounded-lg bg-zinc-800/60 shadow">
                      <div className="font-semibold">{notif.message}</div>
                      {notif.subtype === 'join_request' && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20" onClick={() => handleApproveRequest(notif, idx)}>
                            <Check className="h-4 w-4 text-green-400" />
                          </Button>
                          <Button size="sm" variant="outline" className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20" onClick={() => handleDenyRequest(notif, idx)}>
                            <X className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-4">No notifications.</p>
                )}
                <Button variant="ghost" size="sm" onClick={() => setNotifications([])} className="w-full mt-2">
                  Clear All
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-auto pt-[72px] md:pt-[72px] p-0 md:p-0 bg-transparent">
          <div className="p-6 md:p-10">
            {children}
          </div>
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
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Request</DialogTitle>
          </DialogHeader>
          <div className="my-4 text-zinc-200">{actionDialogMessage}</div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Okay</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 