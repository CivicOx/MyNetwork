import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import NetworkView from "./pages/NetworkView";
import TableView from "./pages/TableView";
import ProfileView from "./pages/ProfileView";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <span className="logo">MyNetwork</span>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Network
            </NavLink>
            <NavLink to="/table" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              Table
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
              My Profile
            </NavLink>
          </nav>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<NetworkView />} />
            <Route path="/table" element={<TableView />} />
            <Route path="/profile" element={<ProfileView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
