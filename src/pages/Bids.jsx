import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MessageCircle, ShieldAlert } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("userToken") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(v) {
  const n = safeNum(v);
  if (n === null) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function getBidTotal(b) {
  return (
    b?.totalPrice ??
    b?.totalprice ??
    b?.amount ??
    b?.price ??
    b?.offer ??
    b?.bidAmount ??
    null
  );
}

function getSellerName(b) {
  const s = b?.seller || b?.vendor || b?.user || b?.sellerId || null;
  if (!s) return b?.sellerName || b?.vendorName || "Seller";
  if (typeof s === "string") return s;
  return s?.fullName || s?.name || s?.email || "Seller";
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return res.json();
}

export default function Bids() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const token = getToken();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [bids, setBids] = useState([]);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErr("");

        // ✅ This matches the endpoint you already use successfully in BuyerDashboard
        const data = await apiGet(`/api/bids/request/${requestId}`);

        const list = Array.isArray(data) ? data : data?.bids || [];
        if (!cancelled) setBids(list);
      } catch (e) {
        console.error("Bids load error:", e);
        if (!cancelled) setErr("Could not load your bids. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (requestId) load();
    return () => (cancelled = true);
  }, [requestId]);

  const sorted = useMemo(() => {
    const copy = [...bids];
    copy.sort((a, b) => {
      const A = safeNum(getBidTotal(a)) ?? Number.POSITIVE_INFINITY;
      const B = safeNum(getBidTotal(b)) ?? Number.POSITIVE_INFINITY;
      return A - B;
    });
    return copy;
  }, [bids]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 flex items-center justify-center">
        Loading bids…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-5">
          <button
            type="button"
            onClick={() => navigate("/buyer-dashboard")}
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full
                       bg-white/5 border border-white/10 text-white
                       hover:bg-white/10 hover:border-white/20 transition
                       shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_25px_rgba(0,0,0,0.55)]
                       active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="mt-8 rounded-2xl border border-red-500/30 bg-[#0B001F]/60 p-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-300" />
              <div className="font-bold">Error</div>
            </div>
            <p className="mt-3 text-sm text-white/70">{err}</p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl font-bold bg-white/10 hover:bg-white/15 border border-white/10 transition"
              >
                Retry
              </button>

              <button
                onClick={() => navigate("/buyer-dashboard")}
                className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500
                           hover:from-yellow-300 hover:to-amber-400 text-black transition
                           shadow-[0_8px_25px_rgba(251,191,36,0.45)]"
              >
                Back to Buyer Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/buyer-dashboard")}
              aria-label="Back"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full
                         bg-white/5 border border-white/10 text-white
                         hover:bg-white/10 hover:border-white/20 transition
                         shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_25px_rgba(0,0,0,0.55)]
                         active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">Bids</h1>
              <p className="text-xs sm:text-sm text-white/55 mt-1">
                Request ID: <span className="text-white/80">{requestId}</span>
              </p>
            </div>
          </div>

          <div className="text-sm text-white/60">
            Total bids: <span className="text-white/85 font-semibold">{sorted.length}</span>
          </div>
        </div>

        {/* List */}
        <div className="mt-8 grid grid-cols-1 gap-4">
          {sorted.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0B001F]/60 p-6 text-white/70">
              No bids yet for this request.
            </div>
          )}

          {sorted.map((b, idx) => {
            const total = getBidTotal(b);
            const seller = getSellerName(b);

            return (
              <div
                key={b?._id || idx}
                className="rounded-2xl border border-white/10 bg-[#0B001F]/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="text-lg font-bold">
                    {seller}{" "}
                    {idx === 0 && (
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-yellow-400/15 text-yellow-200 border border-yellow-400/25">
                        Best offer
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/55 mt-1">
                    Bid ID: {b?._id || "—"}
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 justify-end">
                  <div className="text-cyan-200 font-extrabold text-lg">
                    {fmtMoney(total)}
                  </div>

                  {/* Keep buyer control: just a question link for now (no accept here unless you want it) */}
                  <button
                    type="button"
                    onClick={() => navigate(`/ask-the-seller/${requestId}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-white/10 hover:bg-white/15 border border-white/10 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Ask
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
