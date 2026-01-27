import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  Search,
  ReceiptText,
  RefreshCcw,
  Sparkles,
  Wallet,
  BadgeDollarSign,
} from "lucide-react";

/* ----------------------------- API BASE ----------------------------- */
const API_BASE_URL = (() => {
  const raw = import.meta.env.VITE_API_URL || "";
  const trimmed = typeof raw === "string" ? raw.replace(/\/$/, "") : "";
  if (trimmed) return trimmed;

  // DEV fallback only (local dev)
  if (import.meta.env.DEV) return "http://localhost:5000";

  // In prod, don't guess
  return "";
})();

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

function getCategory(req) {
  return req?.category || req?.type || "Other";
}

function getTitle(req) {
  return req?.productName || req?.name || req?.title || "Request";
}

function getQuantity(req) {
  return req?.quantity ?? req?.qty ?? req?.amount ?? "—";
}

/**
 * BuyerDashboard MUST NOT show completed/paid/closed/expired/awarded requests.
 */
function isExpiredRequest(r) {
  const status = String(r?.status || r?.requestStatus || "").toLowerCase();
  const paymentStatus = String(r?.paymentStatus || "").toLowerCase();

  const paidFlag = r?.isPaid === true || r?.paid === true;
  const hasReceipt = Boolean(r?.receiptId || r?.receiptURL || r?.receiptUrl);

  return (
    paidFlag ||
    hasReceipt ||
    paymentStatus === "paid" ||
    status.includes("paid") ||
    status.includes("awarded") || // ← ÚNICO CAMBIO
    status.includes("closed") ||
    status.includes("completed") ||
    status.includes("expired") ||
    status.includes("canceled") ||
    status.includes("cancelled")
  );
}

/* ----------------------------- API HELPERS ----------------------------- */
async function apiGet(path) {
  if (!API_BASE_URL) {
    throw new Error("Missing API base URL (VITE_API_URL).");
  }

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

/**
 * Offers can be "bids". Backends often vary on route naming.
 * We try multiple endpoints safely and take the first one that works.
 */
async function apiGetOffersByRequestId(reqId) {
  const candidates = [
    `/api/bids/request/${reqId}`,
    `/api/bids/requests/${reqId}`,
    `/api/bids/byRequest/${reqId}`,
    `/api/bids/forRequest/${reqId}`,
  ];

  let lastErr = null;

  for (const path of candidates) {
    try {
      const data = await apiGet(path);
      return data;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Could not load offers.");
}

/* ----------------------------- COMPONENT ----------------------------- */
export default function BuyerDashboard() {
  const navigate = useNavigate();

  const userId = useMemo(() => normalizeId(localStorage.getItem("userId")), []);
  const token = getToken();

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [query, setQuery] = useState("");

  // offersMap[reqId] = { status: "idle|loading|ok|err", offersCount, lowestOffer }
  const [offersMap, setOffersMap] = useState({});

  const [errorTop, setErrorTop] = useState("");

  useEffect(() => {
    if (!token || !userId) navigate("/login");
  }, [token, userId, navigate]);

  const loadRequests = useCallback(async () => {
    try {
      setErrorTop("");
      setLoadingRequests(true);

      const data = await apiGet(`/api/requests/buyer/${userId}`);
      const list = Array.isArray(data) ? data : data?.requests || [];

      setRequests(list);
    } catch (err) {
      console.error("BuyerDashboard load error:", err);
      setErrorTop(err?.message || "Failed to load requests.");
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [userId]);

  useEffect(() => {
    if (token && userId) loadRequests();
  }, [token, userId, loadRequests]);

  const loadOffersFor = useCallback(async (reqId) => {
    setOffersMap((prev) => ({
      ...prev,
      [reqId]: { ...(prev[reqId] || {}), status: "loading" },
    }));

    try {
      const data = await apiGetOffersByRequestId(reqId);

      const bids =
        (Array.isArray(data) && data) ||
        data?.bids ||
        data?.offers ||
        data?.data ||
        [];

      const arr = Array.isArray(bids) ? bids : [];

      const numericOffers = arr
        .map((b) =>
          safeNum(
            b?.totalPrice ??
              b?.totalprice ??
              b?.amount ??
              b?.price ??
              b?.bidAmount ??
              b?.offerAmount
          )
        )
        .filter((n) => n !== null);

      const lowest = numericOffers.length ? Math.min(...numericOffers) : null;

      setOffersMap((prev) => ({
        ...prev,
        [reqId]: { status: "ok", offersCount: arr.length, lowestOffer: lowest },
      }));
    } catch (e) {
      setOffersMap((prev) => ({
        ...prev,
        [reqId]: { status: "err", offersCount: 0, lowestOffer: null },
      }));
    }
  }, []);

  // Load offers for each ACTIVE request
  useEffect(() => {
    if (!requests?.length) return;

    const active = requests.filter((r) => !isExpiredRequest(r));
    active.forEach((r) => {
      const rid = normalizeId(r?._id || r?.id);
      if (!rid) return;

      // Don’t spam reload if already loaded
      if (offersMap[rid]?.status === "ok") return;

      loadOffersFor(rid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, loadOffersFor]);

  const filtered = useMemo(() => {
    const activeRequests = (requests || []).filter((r) => !isExpiredRequest(r));

    const q = query.trim().toLowerCase();
    if (!q) return activeRequests;

    return activeRequests.filter((r) => {
      const id = String(r?._id || r?.id || "").toLowerCase();
      const name = String(getTitle(r)).toLowerCase();
      const cat = String(getCategory(r)).toLowerCase();
      return id.includes(q) || name.includes(q) || cat.includes(q);
    });
  }, [requests, query]);

  const totalActive = filtered.length;

  return (
    <div className="min-h-screen bg-black text-white pt-28 sm:pt-32 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="shrink-0 rounded-2xl border border-white/10 bg-[#0B001F]/75 hover:bg-[#0B001F] transition p-2.5"
              aria-label="Back to Dashboard"
            >
              <ChevronLeft className="w-5 h-5 text-white/80" />
            </button>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Buyer Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-white/55 mt-1 max-w-[34rem]">
                Track your requests and review offers. You choose the winning offer when you’re ready.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRequests}
              className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-2 flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/80 hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => navigate("/createrequest")}
              className="rounded-2xl border border-cyan-500/25 bg-[#0B001F]/85 hover:bg-[#0B001F] transition px-4 py-2.5 flex items-center gap-2"
            >
              <Plus className="w-5 h-5 text-cyan-200" />
              <span className="text-sm font-semibold text-cyan-200">Create Request</span>
            </button>
          </div>
        </div>

        {!import.meta.env.DEV && !API_BASE_URL && (
          <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            Missing <span className="font-bold">VITE_API_URL</span> in production. Offers won’t load until it’s set in Railway variables.
          </div>
        )}

        {errorTop && (
          <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100">
            {errorTop}
          </div>
        )}

        {/* Search card */}
        <div className="mt-6 rounded-3xl border border-cyan-500/20 bg-[#0B001F]/70 p-5 sm:p-6 shadow-[0_0_30px_rgba(100,200,255,0.08)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-white/5 border border-white/10 p-2.5">
                <Sparkles className="w-5 h-5 text-cyan-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-cyan-100">Find a request</h2>
                <p className="text-xs text-white/55 mt-1">
                  Search by request ID, product name, or category.
                </p>
              </div>
            </div>

            <div className="text-xs text-white/50">
              Showing <span className="text-white/85">{totalActive}</span> active
            </div>
          </div>

          <div className="mt-4 relative">
            <Search className="w-4 h-4 text-white/50 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search my requests…"
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-10 pr-3 outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
            />
          </div>
        </div>

        {/* Requests list */}
        <div className="mt-6 grid grid-cols-1 gap-4">
          {loadingRequests ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70">
              Loading requests…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#0B001F]/55 p-7 text-center text-white/70">
              No active requests right now. Paid/closed/expired/awarded requests won’t show here.
            </div>
          ) : (
            filtered.map((r) => {
              const rid = normalizeId(r?._id || r?.id);
              const info = offersMap[rid] || { status: "idle", offersCount: 0, lowestOffer: null };

              const offersLabel =
                info.status === "loading"
                  ? "Loading…"
                  : `${info.offersCount || 0}`;

              const lowestLabel =
                info.status === "loading"
                  ? "…"
                  : info.lowestOffer !== null
                    ? fmtMoney(info.lowestOffer)
                    : "—";

              return (
                <div
                  key={rid}
                  className="rounded-3xl border border-white/10 bg-[#0B001F]/60 p-4 sm:p-5 shadow-[0_0_30px_rgba(170,90,255,0.08)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-base sm:text-lg font-extrabold truncate">
                          {getTitle(r)}
                        </div>
                        <span className="text-[11px] px-2 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-100">
                          {getCategory(r)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
                        <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">
                          Qty: <span className="text-white/80">{fmtQty(getQuantity(r))}</span>
                        </span>
                        <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">
                          ID: <span className="text-white/70">{String(rid).slice(-8)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                          <div className="flex items-center gap-2 text-xs text-white/60">
                            <Wallet className="w-4 h-4 text-white/60" />
                            Offers
                          </div>
                          <div className="text-sm font-bold text-white/90">{offersLabel}</div>
                        </div>

                        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2">
                          <div className="flex items-center gap-2 text-xs text-cyan-200">
                            <BadgeDollarSign className="w-4 h-4 text-cyan-200" />
                            Lowest
                          </div>
                          <div className="text-sm font-extrabold text-cyan-100">{lowestLabel}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {info.status === "err" && (
                          <button
                            onClick={() => loadOffersFor(rid)}
                            className="text-xs px-3 py-2 rounded-xl border border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/15 transition"
                          >
                            Retry offers
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/bids/${rid}`)}
                          className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-2xl font-extrabold text-black
                                     bg-gradient-to-r from-yellow-400 to-amber-500
                                     hover:from-yellow-300 hover:to-amber-400 transition
                                     shadow-[0_10px_30px_rgba(251,191,36,0.35)]"
                        >
                          <ReceiptText className="w-4 h-4" />
                          View offers
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-white/35">
                    Offers load from your bids endpoint. If it stays 0, your backend route name might differ — this UI now tries multiple common routes.
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
