import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ProfileView = () => {
  const navigate = useNavigate();

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "https://merqnet-backend-production.up.railway.app";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const userToken =
    localStorage.getItem("userToken") || localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const userEmail = localStorage.getItem("userEmail");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!userToken || !userId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to fetch user");

        setUser(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [API_BASE, userToken, userId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  const defaultAddress =
    user?.shippingAddresses?.find((a) => a?.isDefault) ||
    user?.shippingAddresses?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0016] via-[#120027] to-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-8 backdrop-blur-md">
          {loading ? (
            <div className="text-center text-white/70">Loading...</div>
          ) : !userToken || !userId ? (
            <div className="text-center text-white/70">
              You are not logged in.
            </div>
          ) : !user ? (
            <div className="text-center text-white/70">
              Could not load your profile.
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-extrabold tracking-tight text-fuchsia-200 drop-shadow">
                {user?.name || "User"}
              </h1>

              <div className="mt-2 text-white/80">
                <div className="text-sm">{userEmail || user?.email}</div>
                <div className="text-sm mt-1">
                  Phone: {user?.phone || "N/A"}
                </div>
              </div>

              <div className="my-6 h-px bg-white/10" />

              <h2 className="text-xl font-bold text-fuchsia-300">
                International Trading
              </h2>
              <div className="mt-2 text-white/80">
                {user?.internationalTrading ? "Available" : "Local only"}
              </div>

              <div className="my-6 h-px bg-white/10" />

              <h2 className="text-xl font-bold text-fuchsia-300">
                Default Shipping Address
              </h2>

              <div className="mt-3 bg-white/5 border border-fuchsia-500/30 rounded-2xl p-5 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
                {defaultAddress ? (
                  <div className="text-sm text-white/85 leading-6">
                    <div>
                      <span className="font-semibold text-white">Street:</span>{" "}
                      {defaultAddress.streetAddress || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold text-white">City:</span>{" "}
                      {defaultAddress.city || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold text-white">State:</span>{" "}
                      {defaultAddress.state || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold text-white">Country:</span>{" "}
                      {defaultAddress.country || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold text-white">
                        Postal Code:
                      </span>{" "}
                      {defaultAddress.postalCode || "N/A"}
                    </div>
                  </div>
                ) : (
                  <div className="text-white/70 text-sm">
                    No shipping address on file.
                  </div>
                )}
              </div>

              <div className="my-6 h-px bg-white/10" />

              <h2 className="text-xl font-bold text-fuchsia-300">
                Account Info
              </h2>
              <div className="mt-2 text-sm text-white/80">
                <div>Created: {formatDate(user?.createdAt)}</div>
                <div>Updated: {formatDate(user?.updatedAt)}</div>
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-5 py-2.5 rounded-xl bg-fuchsia-500/70 hover:bg-fuchsia-500 text-white font-semibold shadow-lg"
                >
                  ← Back to Dashboard
                </button>

                {/* IMPORTANT: Settings.jsx does NOT exist, go to EditProfile */}
                <button
                  onClick={() => navigate("/editprofile")}
                  className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold shadow-lg"
                >
                  Settings
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
