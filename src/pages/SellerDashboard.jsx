import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCw } from "lucide-react";

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("userToken") || "";
}

function getUserId() {
  return (localStorage.getItem("userId") || "").trim();
}

function money(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Normalize/derive offer info from whatever the backend returns.
 * Supports these shapes (any combination):
 * - request.lowestOffer
 * - request.offersCount / request.bidsCount
 * - request.bids: [{ amount, sellerId }]
 * - request.myLowestOffer / request.myOffer / request.myBidAmount
 */
function deriveOfferState(request, myUserId) {
  const bids = Array.isArray(request?.bids) ? request.bids : [];
  const offersCount =
    Number(request?.offersCount) ||
    Number(request?.bidsCount) ||
    Number(request?.offers) ||
    (bids.length || 0);

  // lowest offer from explicit field or from bids array
  let lowestOffer = Number.isFinite(Number(request?.lowestOffer))
    ? Number(request.lowestOffer)
    : null;

  if (lowestOffer === null && bids.length > 0) {
    const bidAmounts = bids
      .map((b) => Number(b?.amount))
      .filter((x) => Number.isFinite(x));
    if (bidAmounts.length > 0) lowestOffer = Math.min(...bidAmounts);
  }

  // my bid amount: from explicit field or find my lowest bid in bids array
  let myBidAmount = null;

  const explicitMine =
    request?.myLowestOffer ??
    request?.myOffer ??
    request?.myBidAmount ??
    request?.myAmount;

  if (Number.isFinite(Number(explicitMine))) {
    myBidAmount = Number(explicitMine);
  } else if (bids.length > 0 && myUserId) {
    const myAmounts = bids
      .filter((b) => String(b?.sellerId || b?.sellerID || "").trim() === myUserId)
      .map((b) => Number(b?.amount))
      .filter((x) => Number.isFinite(x));
    if (myAmounts.length > 0) myBidAmount = Math.min(...myAmounts);
  }

  // status
  // - if no offers -> "none"
  // - if offers exist:
  //    - if myBid exists & myBid === lowest -> winning
  //    - if myBid exists & myBid > lowest -> outbid
  //    - else -> neutral (just show lowest)
  let status = "none";
  if ((offersCount || 0) > 0 || lowestOffer !== null) {
    status = "neutral";
    if (myBidAmount !== null && lowestOffer !== null) {
      if (myBidAmount === lowestOffer) status = "winning";
      else if (myBidAmount > lowestOffer) status = "outbid";
      else status = "winning"; // if myBidAmount < lowestOffer, you’re winning anyway
    }
  }

  return { offersCount, lowestOffer, myBidAmount, status };
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => getToken(), []);
  const myUserId = useMemo(() => getUserId(), []);

  async function fetchRequests() {
    setLoading(true);
    try {
      if (!token) {
        navigate("/login");
        return;
      }

      // ✅ Use the endpoint you already started using.
      // If your backend uses /api prefix, change to `${base}/api/requests/active`
      const base = import.meta.env.VITE_API_URL;
      const res = await fetch(`${base}/requests/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      // Accept either {requests:[...]} or direct [...]
      const list = Array.isArray(data) ? data : Array.isArray(data?.requests) ? data.requests : [];
      setRequests(list);
    } catch (err) {
      console.error("SellerDashboard fetchRequests error:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;

    return (requests || []).filter((r) => {
      const id = String(r?._id || "").toLowerCase();
      const productName = String(r?.productName || "").toLowerCase();
      const category = String(r?.category || "").toLowerCase();
      const buyerName = String(r?.buyerName || r?.buyerEmail || "").toLowerCase();
      return (
        id.includes(q) ||
        productName.includes(q) ||
        category.includes(q) ||
        buyerName.includes(q)
      );
    });
  }, [requests, search]);

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-24 pt-8">
      <div className="max-w-5xl mx-auto">
        {/* Header (no global navbar here) */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Seller Dashboard
            </h1>
            <p className="text-sm text-white/55 mt-1">
              Browse buyer requests and submit your offer.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0B001F]/70 hover:bg-[#0B001F] px-4 py-2 text-sm text-white/80 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-[#0B001F]/55 px-4 py-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by buyer, product, category, or ID..."
              className="w-full bg-transparent outline-none text-sm placeholder:text-white/35"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequestCard
              key={req?._id}
              request={req}
              myUserId={myUserId}
              onMakeOffer={() => navigate(`/submitbid/${req._id}`)}
            />
          ))}

          {!loading && filtered.length === 0 && (
            <div className="text-center text-white/45 py-16">
              No active requests found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, myUserId, onMakeOffer }) {
  const buyerName = request?.buyerName || request?.buyerEmail || "Buyer";
  const buyerRating =
    request?.buyerRating ?? request?.buyerScore ?? request?.rating ?? null;

  const { offersCount, lowestOffer, status } = deriveOfferState(request, myUserId);

  const statusPill =
    status === "winning"
      ? { text: "Winning", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" }
      : status === "outbid"
      ? { text: "Outbid", cls: "bg-rose-500/15 text-rose-300 border-rose-500/25" }
      : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#12091f] via-[#090514] to-[#050208] p-4 sm:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.6)]">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="text-yellow-400 font-semibold truncate">
              {buyerName}
            </div>

            {buyerRating !== null && buyerRating !== undefined && (
              <div className="text-xs text-white/55">
                ⭐ {Number(buyerRating).toFixed(1)} / 10
              </div>
            )}

            {statusPill && (
              <span
                className={`text-xs px-2 py-1 rounded-full border ${statusPill.cls}`}
              >
                {statusPill.text}
              </span>
            )}
          </div>

          <div className="text-lg sm:text-xl font-bold text-white">
            {request?.productName || "Request"}
          </div>

          <div className="mt-1 text-xs sm:text-sm text-white/55 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              Qty: {request?.quantity ?? "—"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
              {request?.category || "—"}
            </span>
            {request?.condition && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                {request.condition}
              </span>
            )}
            {request?.sizeWeight && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                {request.sizeWeight}
              </span>
            )}
          </div>

          {request?.description && (
            <div className="mt-3 text-sm text-white/60">
              {request.description}
            </div>
          )}

          {/* Offer status line */}
          <div className="mt-4 text-sm">
            {(!offersCount || offersCount === 0) && lowestOffer === null ? (
              <span className="text-white/55">No offers yet</span>
            ) : (
              <span className="text-cyan-300">
                Lowest Offer: ${money(lowestOffer)}
                {status === "winning" ? (
                  <span className="text-emerald-300"> • Winning</span>
                ) : status === "outbid" ? (
                  <span className="text-rose-300"> • Outbid</span>
                ) : null}
              </span>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3">
          <div className="text-right">
            <div className="text-xs text-white/45">Target</div>
            <div className="text-xl sm:text-2xl font-extrabold text-yellow-400">
              ${money(request?.unitPrice ?? request?.targetPrice ?? request?.price)}
            </div>
          </div>

          <button
            onClick={onMakeOffer}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl px-5 py-2.5 transition shadow-[0_10px_30px_rgba(245,158,11,0.25)]"
          >
            Make Offer
          </button>
        </div>
      </div>
    </div>
  );
}
