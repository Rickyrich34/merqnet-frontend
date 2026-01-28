import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

// Seller Dashboard – MerqNet
// Mobile-first, no avatars, no duplicated global navbar
// Shows buyer requests as cards with bidding state
// IMPORTANT: backend routes are under /api

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const API_BASE = useMemo(() => {
    const base = (import.meta.env.VITE_API_URL || "").trim();
    return base.replace(/\/+$/, ""); // remove trailing slash
  }, []);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRequests() {
    setLoading(true);
    setErrMsg("");

    try {
      const token =
        localStorage.getItem("token") || localStorage.getItem("userToken") || "";

      if (!API_BASE) {
        setErrMsg("Missing VITE_API_URL.");
        setRequests([]);
        return;
      }

      if (!token) {
        // not logged in
        navigate("/login");
        return;
      }

      // ✅ FIX: use /api prefix
      const url = `${API_BASE}/api/requests/active`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setErrMsg(`Requests fetch failed (${res.status}). ${txt}`.trim());
        setRequests([]);
        return;
      }

      const data = await res.json();

      // supports either: []  OR { requests: [] }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.requests)
        ? data.requests
        : [];

      setRequests(list);
    } catch (err) {
      console.error("Failed loading seller requests", err);
      setErrMsg("Failed loading seller requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    return (
      String(r.productName || "").toLowerCase().includes(q) ||
      String(r.category || "").toLowerCase().includes(q) ||
      String(r.buyerName || r.buyerEmail || "").toLowerCase().includes(q) ||
      String(r._id || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-24 pt-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-1">
              Seller Dashboard
            </h1>
            <p className="text-sm text-gray-400">
              Browse buyer requests and submit your offers.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="shrink-0 bg-[#0f0a1a] border border-purple-900/70 hover:border-purple-700 text-white/80 rounded-xl px-4 py-2 text-sm"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4 bg-[#0f0a1a] rounded-xl px-3 py-2 border border-purple-900">
          <Search size={18} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer, product, category, or ID..."
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-gray-500"
          />
        </div>

        {errMsg && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errMsg}
          </div>
        )}

        {/* Requests */}
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequestCard
              key={req._id}
              request={req}
              onBid={() => navigate(`/submitbid/${req._id}`)}
            />
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No active requests found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, onBid }) {
  const lowest = request.lowestOffer; // backend should provide or set null
  const myStatus = request.myBidStatus; // "winning" | "outbid" | null

  return (
    <div className="bg-gradient-to-br from-[#12091f] to-[#050208] border border-yellow-500/30 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row gap-4 md:items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-yellow-400 truncate">
            {request.buyerName || request.buyerEmail || "Buyer"}
          </span>
          {request.buyerRating != null && (
            <span className="text-xs text-gray-400">
              ⭐ {request.buyerRating}/10
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold">{request.productName}</h3>

        <div className="text-xs text-gray-400 mt-1">
          Qty: {request.quantity} • {request.category}
        </div>

        {request.description && (
          <div className="text-xs text-gray-500 mt-1">{request.description}</div>
        )}

        <div className="mt-3 text-sm">
          {!lowest && <span className="text-gray-400">No offers yet</span>}

          {lowest && myStatus === "winning" && (
            <span className="text-green-400">
              Lowest Offer: ${lowest} • Winning
            </span>
          )}

          {lowest && myStatus === "outbid" && (
            <span className="text-red-400">Lowest Offer: ${lowest} • Outbid</span>
          )}

          {lowest && !myStatus && (
            <span className="text-cyan-400">Lowest Offer: ${lowest}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="text-yellow-400 font-bold text-xl">
          ${request.targetPrice ?? request.unitPrice ?? "—"}
        </div>

        <button
          onClick={onBid}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-5 py-2"
        >
          Make Offer
        </button>
      </div>
    </div>
  );
}
