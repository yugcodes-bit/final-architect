import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Create from "./pages/Create";
import Signup from "./pages/Signup";
// --- NEW: Import the DiscoverStyle page ---
import DiscoverStyle from "./pages/DiscoverStyle";
import './app.css';

function App() { 
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/create" element={<Create />} />
        {/* --- NEW: Add the route for our new page --- */}
        <Route path="/discover-style" element={<DiscoverStyle />} />
      </Routes>
    </Router>
  );
}

export default App;