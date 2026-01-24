import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Search, ReceiptText } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function BuyerDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("userToken");

  useEffect(() => {
    const fetchBuyerRequests = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE_URL}/api/requests/my-requests`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to fetch requests");

        setRequests(Array.isArray(data) ? data : data?.requests || []);
      } catch (err) {
        console.error("BuyerDashboard error:", err);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchBuyerRequests();
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((r) => {
      const name = (r.productName || "").toLowerCase();
      const category = (r.category || "").toLowerCase();
      const id = (r._id || "").toLowerCase();
      return name.includes(q) || category.includes(q) || id.includes(q);
    });
  }, [requests, query]);

  const formatMoney = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return `$${Number(value).toLocaleString()}`;
  };

  const getOfferCount = (req) => {
    // supports multiple possible backend shapes
    if (Array.isArray(req.bids)) return req.bids.length;
    if (Array.isArray(req.offers)) return req.offers.length;
    if (typeof req.offerCount === "number") return req.offerCount;
    if (typeof req.bidCount === "number") return req.bidCount;
    return 0;
  };

  const getTopOffer = (req) => {
    // supports multiple possible backend shapes
    if (typeof req.bestOffer === "number") return req.bestOffer;
    if (typeof req.lowestOffer === "number") return req.lowestOffer;
    if (typeof req.topOffer === "number") return req.topOffer;

    const arr = Array.isArray(req.bids) ? req.bids : Array.isArray(req.offers) ? req.offers : [];
    if (!arr.length) return null;

    // try common price fields
    const prices = arr
      .map((b) => b.offerPrice ?? b.price ?? b.amount ?? b.total ?? null)
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
      .map((v) => Number(v));

    if (!prices.length) return null;

    // NOTE: You (buyer) choose the winner; we only display a helpful “best/lowest shown”.
    return Math.min(...prices);
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 pt-28 pb-20">
      <div className="max-w-5xl mx-auto">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/15 bg-[#0b0a1c]/70 hover:bg-[#0b0a1c] transition p-2"
              aria-label="Go back"
            >
              <ChevronLeft size={18} />
            </button>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Buyer Dashboard
              </h1>
              <p className="text-white/60 text-sm mt-1">
                Track your requests and choose your winning offer when ready.
              </p>
            </div>
          </div>

          {/* ✅ UPDATED: + button now has text */}
          <button
            onClick={() => navigate("/create-request")}
            className="rounded-2xl border border-cyan-500/30 bg-[#0B001F]/85 hover:bg-[#0B001F] transition px-4 py-2.5 flex items-center gap-2"
            aria-label="Create new request"
          >
            <Plus className="w-5 h-5 text-cyan-200" />
            <span className="text-sm font-semibold text-cyan-100">New Request</span>
          </button>
        </div>

        {/* Search */}
        <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#160033]/80 to-[#06000f]/80 p-6 shadow-[0_0_60px_rgba(168,85,247,0.10)] mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold">Find a request</h2>
              <p className="text-white/55 text-sm">
                Search your requests by name, ID, or category.
              </p>
            </div>
            <div className="text-white/45 text-sm">
              Showing {filtered.length} / {requests.length}
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search my requests..."
              className="w-full rounded-2xl bg-black/40 border border-white/10 focus:border-cyan-400/40 outline-none px-11 py-3 text-white placeholder:text-white/30"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">
              Loading your requests...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <div className="flex items-center gap-3">
                <ReceiptText className="w-5 h-5 text-white/60" />
                <div>
                  <div className="font-semibold">No requests found</div>
                  <div className="text-white/55 text-sm">
                    Try a different search or create a new request.
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate("/create-request")}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-gradient-to-r from-cyan-500/90 to-fuchsia-600/90 hover:from-cyan-400 hover:to-fuchsia-500 transition font-bold shadow-[0_0_25px_rgba(34,211,238,0.20)]"
              >
                <Plus className="w-5 h-5" />
                New Request
              </button>
            </div>
          ) : (
            filtered.map((req) => {
              const offerCount = getOfferCount(req);
              const topOffer = getTopOffer(req);

              return (
                <div
                  key={req._id}
                  className="rounded-3xl border border-purple-500/20 bg-gradient-to-b from-[#160033]/70 to-[#06000f]/70 p-5 shadow-[0_0_60px_rgba(168,85,247,0.08)]"
                >
                  <div className="flex items-center justify-between gap-5">
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold truncate">
                        {req.productName || "Untitled Request"}
                      </div>
                      <div className="text-white/55 text-sm mt-1">
                        Category: <span className="text-white/70">{req.category || "—"}</span>
                      </div>
                      <div className="text-white/55 text-sm">
                        Qty: <span className="text-white/70">{req.quantity ?? "—"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right hidden sm:block">
                        <div className="text-white/45 text-sm">Offers: {offerCount}</div>
                        <div className="text-cyan-200 font-bold">
                          {topOffer !== null ? formatMoney(topOffer) : "—"}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/bids/${req._id}`)}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-extrabold hover:brightness-110 transition shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                      >
                        <ReceiptText className="w-5 h-5" />
                        View bids
                      </button>
                    </div>
                  </div>

                  {/* Mobile offer info */}
                  <div className="sm:hidden mt-4 flex items-center justify-between text-sm">
                    <div className="text-white/50">Offers: {offerCount}</div>
                    <div className="text-cyan-200 font-bold">
                      {topOffer !== null ? formatMoney(topOffer) : "—"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
