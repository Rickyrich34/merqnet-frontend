import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCcw } from "lucide-react";

/**
 * MerqNet - SellerDashboard.jsx
 * - Uses backend endpoint: GET /api/requests/filtered/:userId
 * - Backend returns: { requests: [...] }
 * - Requester display name uses populated clientID:
 *     request.clientID.fullName (fallback to email)
 * - No avatars/photos
 * - No duplicated global navbar content
 * - Cards + Make Offer -> /submitbid/:requestId
 *
 * NOTE:
 * lowestOffer + myBidStatus are NOT provided by your current requestController.
 * This file shows "No offers yet" unless those fields exist.
 */

export default function SellerDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const API_BASE = useMemo(() => {
    const base = (import.meta.env.VITE_API_URL || "").trim();
    return base.replace(/\/+$/, "");
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
        localStorage.getItem("token") ||
        localStorage.getItem("userToken") ||
        "";

      const userId = (localStorage.getItem("userId") || "").trim();

      if (!API_BASE) {
        setRequests([]);
        setErrMsg("Missing VITE_API_URL.");
        return;
      }

      if (!token || !userId) {
        setRequests([]);
        setErrMsg("Missing auth (token/userId). Please login again.");
        return;
      }

      // ✅ Correct seller endpoint
      const url = `${API_BASE}/api/requests/filtered/${userId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // backend returns { requests: [...] }
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userToken");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const msg =
          typeof data?.message === "string"
            ? data.message
            : `Requests fetch failed (${res.status}).`;
        setRequests([]);
        setErrMsg(msg);
        return;
      }

      const list = Array.isArray(data?.requests) ? data.requests : [];
      setRequests(list);
    } catch (err) {
      console.error("Failed loading seller requests", err);
      setRequests([]);
      setErrMsg("Failed loading seller requests.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;

    return (requests || []).filter((r) => {
      const requester =
        String(r?.clientID?.fullName || r?.clientID?.email || "").toLowerCase();
      const productName = String(r?.productName || "").toLowerCase();
      const category = String(r?.category || "").toLowerCase();
      const id = String(r?._id || "").toLowerCase();

      return (
        requester.includes(q) ||
        productName.includes(q) ||
        category.includes(q) ||
        id.includes(q)
      );
    });
  }, [requests, search]);

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-24 pt-6">
      <div className="max-w-5xl mx-auto">
        {/* Header (no navbar duplication) */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-yellow-400 mb-1">
              Seller Dashboard
            </h1>
            <p className="text-sm text-gray-400">
              Browse buyer requests and submit your offers.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="shrink-0 inline-flex items-center gap-2 bg-[#0f0a1a] border border-purple-900/70 hover:border-yellow-500/40 text-white/80 rounded-xl px-4 py-2 text-sm"
            title="Refresh"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">
              {loading ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4 bg-[#0f0a1a] rounded-xl px-3 py-2 border border-purple-900">
          <Search size={18} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, product, category, or ID..."
            className="bg-transparent outline-none flex-1 text-sm placeholder:text-gray-500"
          />
          <div className="text-xs text-gray-500">
            {loading ? "Loading..." : `${filtered.length}/${requests.length}`}
          </div>
        </div>

        {/* Error */}
        {errMsg && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errMsg}
          </div>
        )}

        {/* Requests */}
        <div className="space-y-4">
          {!loading &&
            filtered.map((req) => (
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

          {loading && (
            <div className="text-center text-gray-500 py-12">Loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, onBid }) {
  // unified username (from populated clientID)
  const username =
    request?.clientID?.fullName ||
    request?.clientID?.email ||
    "Unknown user";

  // optional (only if backend provides it)
  const ratingRaw =
    request?.clientID?.rating ??
    request?.buyerRating ??
    request?.rating ??
    null;

  const rating =
    ratingRaw != null && !Number.isNaN(Number(ratingRaw))
      ? Number(ratingRaw)
      : null;

  // optional (only if backend provides it)
  const lowest =
    request?.lowestOffer != null && !Number.isNaN(Number(request.lowestOffer))
      ? Number(request.lowestOffer)
      : null;

  // optional (only if backend provides it)
  const myStatus =
    request?.myBidStatus === "winning" || request?.myBidStatus === "outbid"
      ? request.myBidStatus
      : null;

  // target display: prefer wholeLotPrice if present, else unitPrice, else legacy targetPrice
  const target =
    request?.wholeLotPrice ??
    request?.unitPrice ??
    request?.targetPrice ??
    null;

  return (
    <div className="bg-gradient-to-br from-[#12091f] to-[#050208] border border-yellow-500/30 rounded-2xl p-4 md:p-5 shadow-xl flex flex-col md:flex-row gap-4 md:items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-yellow-400 truncate">
            {username}
          </span>

          {rating != null && (
            <span className="text-xs text-gray-400">
              ⭐ {rating.toFixed(1)}/10
            </span>
          )}

          <span className="text-[11px] text-gray-500">
            ID: {String(request?._id || "").slice(-8)}
          </span>
        </div>

        <h3 className="text-lg font-semibold">
          {request?.productName || "Request"}
        </h3>

        <div className="text-xs text-gray-400 mt-1">
          Qty: {request?.quantity ?? "—"} • {request?.category || "—"}
          {request?.condition ? ` • ${request.condition}` : ""}
          {request?.sizeWeight ? ` • ${request.sizeWeight}` : ""}
        </div>

        {request?.description && (
          <div className="text-xs text-gray-500 mt-2 line-clamp-2">
            {request.description}
          </div>
        )}

        {/* Offer state */}
        <div className="mt-3 text-sm">
          {!lowest && <span className="text-gray-400">No offers yet</span>}

          {lowest && myStatus === "winning" && (
            <span className="text-green-400">
              Lowest Offer: ${lowest} • Winning
            </span>
          )}

          {lowest && myStatus === "outbid" && (
            <span className="text-red-400">
              Lowest Offer: ${lowest} • Outbid
            </span>
          )}

          {lowest && !myStatus && (
            <span className="text-cyan-400">Lowest Offer: ${lowest}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="text-yellow-400 font-bold text-xl">
          {target == null ? "—" : `$${Number(target).toLocaleString()}`}
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
