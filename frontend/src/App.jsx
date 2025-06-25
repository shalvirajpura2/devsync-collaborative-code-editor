import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RoomSelectionPage from "./pages/RoomSelectionPage";
import EditorPage from "./pages/EditorPage";
import AuthPage from "./pages/AuthPage";
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<RoomSelectionPage />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;

