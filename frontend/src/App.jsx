import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import RoomSelectionPage from "./pages/RoomSelectionPage";
import EditorPage from "./pages/EditorPage";
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoomSelectionPage />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
      </Routes>
    </Router>
  );
}

export default App;

