import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Search, ReceiptText } from "lucide-react";

import Galactic1 from "../assets/Galactic1.png";

const API_BASE_URL = import.meta.env.VITE_API_URL;

/* ----------------------------- AUTH HELPERS ----------------------------- */
function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("userToken") || "";
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x.trim();
  if (typeof x === "object" && x._id) return String(x._id).trim();
  return String(x).trim();
}

/* ----------------------------- DATA HELPERS ----------------------------- */
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(v) {
  const n = safeNum(v);
  if (n === null) return "—";
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtQty(v) {
  const n = safeNum(v);
  if (n === null) return "—";
  return n.toLocaleString();
}

function buildShippingText(req) {
  // Try request-shipping shapes that may exist in different backend versions
  const s = req?.shippingAddress || req?.shipping || req?.shipTo || null;
  if (!s || typeof s !== "object") return "Not provided";

  const street = s.street || s.streetAddress || "";
  const city = s.city || "";
  const state = s.state || "";
  const country = s.country || "";
  const postalCode = s.postalCode || s.zip || "";

  const parts1 = [city, state].filter(Boolean).join(", ");
  const parts2 = [country, postalCode].filter(Boolean).join(" ");
  const compact = [parts1, parts2].filter(Boolean).join(" • ");
  const full = [street, compact].filter(Boolean).join(" — ");

  return full || compact || "Not provided";
}

function getBuyerLabel(req) {
  // Best-effort: buyer name fields may differ by backend
  const b = req?.buyer || req?.client || req?.clientID || req?.user || null;

  if (typeof b === "string") return b;
  if (b && typeof b === "object") {
    const first = b.firstName || b.firstname || "";
    const last = b.lastName || b.lastname || "";
    const full = [first, last].filter(Boolean).join(" ").trim();
    return full || b.email || b.username || b.name || "Buyer";
  }

  // Fallback to fields on request
  return req?.buyerName || req?.clientName || req?.email || "Buyer";
}

function getCategory(req) {
  return req?.category || req?.type || "Other";
}

function getTitle(req) {
  return req?.productName || req?.name || req?.title || "Request";
}

function getQuantity(req) {
  return req?.quantity ?? req?.qty ?? req?.amount ?? "—";
}

/* ----------------------------- API CALLS ----------------------------- */
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

/* ----------------------------- COMPONENT ----------------------------- */
export default function BuyerDashboard() {
  const navigate = useNavigate();

  const userId = useMemo(() => normalizeId(localStorage.getItem("userId")), []);
  const token = getToken();

  const [requests, setRequests] = useState([]);
  const [offersMap, setOffersMap] = useState({}); // requestId -> { lowestOffer, offersCount }
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!token || !userId) navigate("/login");
  }, [token, userId, navigate]);

  // Load buyer requests
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        // NOTE: keep the same endpoints you've been using
        const data = await apiGet(`/api/requests/buyer/${userId}`);

        if (cancelled) return;

        const list = Array.isArray(data) ? data : data?.requests || [];
        setRequests(list);
      } catch (err) {
        console.error("BuyerDashboard load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (token && userId) load();

    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  // Load offers per request (lowest offer + count)
  useEffect(() => {
    let cancelled = false;

    const loadOffersFor = async (reqId) => {
      try {
        // Keep your existing endpoint assumption; if backend differs, keep as-is
        const data = await apiGet(`/api/bids/request/${reqId}`);

        if (cancelled) return;

        const bids = Array.isArray(data) ? data : data?.bids || [];
        const numericOffers = bids
          .map((b) => safeNum(b?.totalPrice ?? b?.totalprice ?? b?.amount ?? b?.price))
          .filter((n) => n !== null);

        const lowest = numericOffers.length ? Math.min(...numericOffers) : null;

        setOffersMap((prev) => ({
          ...prev,
          [reqId]: {
            lowestOffer: lowest,
            offersCount: bids.length,
          },
        }));
      } catch (err) {
        // If offers endpoint fails, keep a safe fallback (do NOT crash UI)
        if (cancelled) return;
        setOffersMap((prev) => ({
          ...prev,
          [reqId]: { lowestOffer: null, offersCount: 0 },
        }));
      }
    };

    if (!requests?.length) return;

    // Fire and forget per request
    requests.forEach((r) => {
      const rid = normalizeId(r?._id || r?.id);
      if (rid) loadOffersFor(rid);
    });

    return () => {
      cancelled = true;
    };
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;

    return requests.filter((r) => {
      const id = String(r?._id || r?.id || "").toLowerCase();
      const name = String(getTitle(r)).toLowerCase();
      const cat = String(getCategory(r)).toLowerCase();
      return id.includes(q) || name.includes(q) || cat.includes(q);
    });
  }, [requests, query]);

  const openCount = useMemo(() => filtered.length, [filtered]);

  const activeOffersCount = useMemo(() => {
    let total = 0;
    filtered.forEach((r) => {
      const rid = normalizeId(r?._id || r?.id);
      const info = offersMap[rid];
      if (info?.offersCount) total += info.offersCount;
    });
    return total;
  }, [filtered, offersMap]);

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${Galactic1})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-2xl border border-white/15 bg-[#0B001F]/85 hover:bg-[#0B001F] transition p-2.5 shadow-[0_0_18px_rgba(255,255,255,0.08)]"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5 text-white/80" />
            </button>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Buyer Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-white/55 mt-1">
                Track your requests and choose your winning offer when ready.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/create-request")}
            className="rounded-2xl border border-cyan-500/30 bg-[#0B001F]/85 hover:bg-[#0B001F] transition p-2.5 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
            aria-label="Place New Request"
            title="Place New Request"
          >
            <Plus className="w-5 h-5 text-cyan-200" />
          </button>
        </div>

        {/* Search Panel (no category dropdown) */}
        <div
          className="
            mt-8
            bg-[#0B001F]/80
            border border-cyan-500/25
            rounded-3xl
            p-5 sm:p-6
            shadow-[0_0_30px_rgba(34,211,238,0.15)]
            backdrop-blur-sm
          "
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-cyan-100">Find a request</h2>
              <p className="text-xs text-white/55 mt-1">
                Search your requests by name, ID, or category text.
              </p>
            </div>

            <div className="text-xs text-white/50">
              Showing <span className="text-white/80">{filtered.length}</span> /{" "}
              <span className="text-white/80">{requests.length}</span>
            </div>
          </div>

          <div className="mt-4 relative">
            <Search className="w-4 h-4 text-white/50 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search my requests..."
              className="
                w-full
                bg-[#070016]/80
                border border-cyan-500/20
                rounded-2xl
                pl-11 pr-4 py-3
                text-sm
                outline-none
                focus:border-cyan-400/50
                focus:ring-2 focus:ring-cyan-400/20
              "
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div
            className="
              bg-[#0B001F]/75
              border border-cyan-500/20
              rounded-3xl
              p-5
              shadow-[0_0_26px_rgba(34,211,238,0.12)]
            "
          >
            <div className="text-xs text-white/55">Open Requests</div>
            <div className="text-3xl font-extrabold text-cyan-200 mt-2">{openCount}</div>
          </div>

          <div
            className="
              bg-[#0B001F]/75
              border border-cyan-500/20
              rounded-3xl
              p-5
              shadow-[0_0_26px_rgba(34,211,238,0.12)]
            "
          >
            <div className="text-xs text-white/55">Active Offers</div>
            <div className="text-3xl font-extrabold text-cyan-200 mt-2">{activeOffersCount}</div>
          </div>
        </div>

        {/* Section header */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-cyan-100">My Active Offers</h2>
            <p className="text-xs text-white/55 mt-1">
              Review bids and pick your winner when ready.
            </p>
          </div>

          <button
            onClick={() => navigate("/create-request")}
            className="
              inline-flex items-center gap-2
              bg-[#0B001F]/90
              border border-cyan-500/30
              text-yellow-300
              px-4 py-2
              rounded-xl
              hover:bg-[#0B001F]
              transition
              shadow-[0_0_20px_rgba(34,211,238,0.22)]
            "
          >
            <Plus className="w-4 h-4" />
            Place New Request
          </button>
        </div>

        {/* List */}
        <div className="mt-6 space-y-5">
          {loading ? (
            <div className="text-center text-white/60 py-16">Loading your requests...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-white/60 py-16">
              No requests found. Try placing a new request.
            </div>
          ) : (
            filtered.map((req) => {
              const rid = normalizeId(req?._id || req?.id);
              const info = offersMap[rid] || { lowestOffer: null, offersCount: 0 };

              return (
                <div
                  key={rid}
                  className="
                    bg-[#0B001F]/85
                    border border-cyan-500/20
                    rounded-3xl
                    p-5 sm:p-6
                    shadow-[0_0_28px_rgba(34,211,238,0.14)]
                    backdrop-blur-sm
                  "
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="text-xs text-white/55">
                        {getCategory(req)} • x{fmtQty(getQuantity(req))}
                      </div>
                      <div className="text-xl sm:text-2xl font-extrabold mt-1">
                        {getTitle(req)}
                      </div>

                      <div className="mt-3 text-sm text-white/75">
                        Lowest offer:{" "}
                        <span className="text-cyan-200 font-semibold">
                          {info.lowestOffer === null ? "No offers yet" : fmtMoney(info.lowestOffer)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/requests/${rid}/acceptbid`)}
                        className="
                          inline-flex items-center justify-center gap-2
                          bg-cyan-500/90 hover:bg-cyan-400
                          text-black font-semibold
                          px-5 py-3
                          rounded-xl
                          transition
                          shadow-[0_0_24px_rgba(34,211,238,0.28)]
                          min-w-[160px]
                        "
                      >
                        <ReceiptText className="w-4 h-4" />
                        View Offers
                      </button>

                      <button
                        onClick={() => {
                          // Keep existing delete behavior placeholder (if implemented elsewhere)
                          alert("Delete action not wired here.");
                        }}
                        className="
                          bg-[#2a0011]/70 hover:bg-[#3a0017]
                          border border-red-400/30
                          text-red-200
                          px-5 py-3
                          rounded-xl
                          transition
                          min-w-[110px]
                        "
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Extra meta */}
                  <div className="mt-4 text-xs text-white/45">
                    Request ID: <span className="text-white/55">{rid}</span>
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
