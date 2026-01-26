import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("userToken") || localStorage.getItem("token") || "";
    if (token) navigate("/dashboard");
  }, [navigate]);

  const API_BASE = useMemo(() => {
    const fromEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    if (fromEnv && typeof fromEnv === "string") return fromEnv.replace(/\/$/, "");
    if (import.meta.env.DEV) return "http://localhost:5000";
    return "";
  }, []);

  const API_LOGIN_URL = useMemo(() => {
    if (!API_BASE) return "";
    return `${API_BASE}/api/users/login`;
  }, [API_BASE]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    if (!API_BASE || !API_LOGIN_URL) {
      return "Missing VITE_API_URL in production. Set it in Railway → merqnet-frontend → Variables.";
    }
    if (!formData.email.trim()) return "Email is required.";
    if (!formData.password) return "Password is required.";
    if (!formData.acceptTerms) return "You must accept the Terms to continue.";
    return "";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        API_LOGIN_URL,
        {
          email: formData.email.trim(),
          password: formData.password,
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: false,
          timeout: 15000,
        }
      );

      const token =
        res?.data?.token ||
        res?.data?.userToken ||
        res?.data?.accessToken ||
        "";

      const userId =
        res?.data?.userId ||
        res?.data?.user?._id ||
        res?.data?._id ||
        "";

      if (!token) {
        throw new Error("Login succeeded but token was not returned by backend.");
      }

      localStorage.setItem("userToken", token);
      if (userId) localStorage.setItem("userId", userId);

      // ✅ NEW: store email for Navbar (this fixes Railway)
      localStorage.setItem("userEmail", formData.email.trim());

      navigate("/dashboard");
    } catch (err) {
      const isTimeout = err?.code === "ECONNABORTED";

      const msg = isTimeout
        ? "Login request timed out (15s). Backend may be sleeping, unreachable, or blocked by CORS."
        : err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Login failed.";

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl bg-fuchsia-600/30" />
        <div className="absolute -bottom-48 -right-48 h-[620px] w-[620px] rounded-full blur-3xl bg-cyan-500/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
      </div>

      <div className="relative z-10 flex items-start justify-center px-4 pt-28 sm:pt-32 pb-10">
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight">
              MerqNet <span className="text-cyan-300">Login</span>
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3"
              placeholder="you@email.com"
            />

            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3"
              placeholder="••••••••"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 py-3 font-bold text-black"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
