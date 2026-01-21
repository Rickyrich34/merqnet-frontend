// src/components/Navbar.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logopic2 from "../assets/logopic2.png";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const API = useMemo(() => {
    const raw = import.meta.env.VITE_API_URL || "";
    return typeof raw === "string" ? raw.replace(/\/$/, "") : "";
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const getToken = () =>
    localStorage.getItem("userToken") || localStorage.getItem("token") || "";

  const getUserId = () => localStorage.getItem("userId") || "";

  useEffect(() => {
    const token = getToken();
    const userId = getUserId();

    setIsLoggedIn(!!token);

    // If we don't have API or userId, don't fetch email (avoid crashes / bad calls)
    if (!token || !userId || !API) return;

    fetch(`${API}/api/users/profile/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        // Support multiple backend shapes: {email}, {user:{email}}, etc.
        const email = data?.email || data?.user?.email || data?.profile?.email || "";
        if (email) {
          setUserEmail(email);
          localStorage.setItem("userEmail", email);
        }
      })
      .catch(() => {});
  }, [location.pathname, API]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    setUserEmail("");
    navigate("/login");
  };

  const linkClass =
    "text-white font-semibold text-sm sm:text-base drop-shadow-[0_0_6px_rgba(255,255,255,0.85)] hover:opacity-90 transition";

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#070615]/90 backdrop-blur-md border-b border-white/10">
      <div className="flex justify-between items-center px-4 sm:px-10 py-4 sm:py-5">
        {/* LEFT: Brand + (optional) email */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
            <img
              src={logopic2}
              alt="MerqNet"
              className="w-10 h-10 object-contain brightness-150 contrast-150 saturate-200 drop-shadow-[0_0_16px_#ff00ff]"
            />
            <span className="text-lg sm:text-xl font-extrabold text-purple-200 tracking-wide">
              MerqNet
            </span>
          </Link>

          {isLoggedIn && (
            <span className="text-purple-200 text-xs sm:text-sm truncate max-w-[45vw] sm:max-w-none drop-shadow-[0_0_6px_rgba(200,100,255,0.8)]">
              {userEmail || localStorage.getItem("userEmail") || ""}
            </span>
          )}
        </div>

        {/* RIGHT: Links */}
        <div className="flex items-center gap-4 sm:gap-8">
          {!isLoggedIn ? (
            <>
              {location.pathname !== "/" && (
                <Link to="/" className={linkClass}>
                  Home
                </Link>
              )}
              {location.pathname !== "/login" && (
                <Link to="/login" className={linkClass}>
                  Iniciar sesión
                </Link>
              )}
              {location.pathname !== "/signup" && (
                <Link to="/signup" className={linkClass}>
                  Signup
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/dashboard" className={linkClass}>
                Dashboard
              </Link>
              <Link to="/messages" className={linkClass}>
                Messages
              </Link>
              <Link to="/history" className={linkClass}>
                History
              </Link>
              <Link to="/profile" className={linkClass}>
                Profile
              </Link>

              <button
                onClick={handleLogout}
                className="text-red-300 font-semibold text-sm sm:text-base drop-shadow-[0_0_6px_rgba(255,120,120,0.9)] hover:opacity-90 transition"
              >
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
