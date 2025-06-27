import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RoomSelectionPage from "./pages/RoomSelectionPage";
import EditorPage from "./pages/EditorPage";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import './App.css';
import { Toaster } from "@/components/ui/sonner";
import DashboardLayout from './components/DashboardLayout';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

function LoadingSpinner() {
  return <div className="flex items-center justify-center h-screen text-zinc-400">Loading...</div>;
}

function App() {
  const { user, loading: authLoading } = useFirebaseAuth();
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/app"
          element={
            authLoading ? (
              <LoadingSpinner />
            ) : user ? (
              <DashboardLayout key={user.uid}>
                <RoomSelectionPage key={user.uid} />
              </DashboardLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/editor/:roomId"
          element={
            authLoading ? (
              <LoadingSpinner />
            ) : user ? (
              <DashboardLayout key={user.uid}>
                <EditorPage key={user.uid} />
              </DashboardLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            authLoading ? (
              <LoadingSpinner />
            ) : user ? (
              <DashboardLayout key={user.uid}>
                <SettingsPage key={user.uid} />
              </DashboardLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
      <Toaster richColors />
    </Router>
  );
}

export default App;

