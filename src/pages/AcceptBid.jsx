import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

function getApiBase() {
  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }
  return "";
}

const API = getApiBase();

function getToken() {
  return localStorage.getItem("userToken") || localStorage.getItem("token") || "";
}

function authHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    let body = null;
    if (contentType.includes("application/json")) {
      try {
        body = await res.json();
      } catch {}
    } else {
      try {
        const text = await res.text();
        body = { message: text?.slice(0, 300) };
      } catch {}
    }
    const err = new Error(body?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (!contentType.includes("application/json")) return [];
  return res.json();
}

export default function AcceptBid() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [bids, setBids] = useState([]);
  const [acceptingBidId, setAcceptingBidId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, [requestId]);

  const loadAll = async () => {
    if (!requestId) return;

    setLoading(true);
    try {
      const url = `${API}/api/bids/request/${requestId}`;
      const data = await fetchJson(url, { headers: authHeaders() });
      setBids(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD BIDS FAILED:", err?.status, err?.message);
      setBids([]);
    } finally {
      setLoading(false);
    }
  };

  const sortedBids = useMemo(() => {
    return [...bids].sort(
      (a, b) => safeNumber(a?.totalPrice) - safeNumber(b?.totalPrice)
    );
  }, [bids]);

  const acceptBid = async (bidId) => {
    if (!bidId) return;
    try {
      setAcceptingBidId(bidId);
      const url = `${API}/api/bids/${bidId}/accept`;
      await fetchJson(url, {
        method: "PUT",
        headers: authHeaders(),
      });
      await loadAll();
      alert("Bid accepted!");
    } catch (err) {
      alert(err?.message || "Could not accept bid.");
    } finally {
      setAcceptingBidId("");
    }
  };

  const proceedToPayment = (bidId) => {
    navigate(`/payment/${bidId}`, { state: { requestId } });
  };

  const askSeller = (sellerId) => {
    // buyer-only flow assumed; backend should enforce
    navigate(`/messages`, {
      state: { requestId, sellerId },
    });
  };

  const renderRating = (bid) => {
    const rating = safeNumber(bid?.sellerRating);
    const ratingCount = safeNumber(bid?.sellerRatingCount);

    if (ratingCount > 0) {
      return (
        <span className="text-cyan-300 font-semibold">
          {rating.toFixed(1)} / 10
        </span>
      );
    }
    return <span className="text-white/40">—</span>;
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 pt-[140px] pb-24">
      <button
        onClick={() => navigate(-1)}
        className="rounded-xl border border-white/15 bg-[#0b0a1c]/70 hover:bg-[#0b0a1c]/85 transition p-2 text-white/80 hover:text-white"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="mt-6 text-center">
        <h1 className="text-2xl font-semibold">Offers on Your Request</h1>
        <p className="text-sm text-white/70 mt-1">
          Choose one offer to accept, then proceed to payment.
        </p>
        {loading && (
          <div className="mt-3 text-xs text-white/50">Loading offers…</div>
        )}
      </div>

      <div className="mt-10 max-w-3xl mx-auto space-y-4">
        {sortedBids.map((bid) => {
          const seller = bid?.sellerId;
          const sellerName = seller?.email || "Unknown seller";

          return (
            <div
              key={bid._id}
              className="rounded-2xl border border-white/15 bg-[#0b0a1c]/80 backdrop-blur-md p-4 sm:p-5"
            >
              {/* Seller */}
              <div className="text-sm text-white/60">Seller</div>
              <div className="font-medium mb-2">{sellerName}</div>

              {/* Rating */}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Seller Rating</span>
                {renderRating(bid)}
              </div>

              {/* Offer */}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Seller Offer</span>
                <span className="text-orange-300 font-semibold">
                  ${safeNumber(bid.totalPrice).toLocaleString()}
                </span>
              </div>

              {/* Delivery */}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Delivery</span>
                <span>{bid.deliveryTime}</span>
              </div>

              {/* Status */}
              <div className="flex justify-between text-sm mb-3">
                <span className="text-white/60">Status</span>
                {bid.accepted ? (
                  <span className="text-green-400 font-semibold">Accepted</span>
                ) : (
                  <span className="text-white/60">Pending</span>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => askSeller(seller?._id)}
                  className="w-full rounded-xl py-3 text-sm font-semibold
                    bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white
                    shadow-lg active:scale-[0.99] transition"
                >
                  Ask the Seller
                </button>

                {!bid.accepted && (
                  <button
                    disabled={acceptingBidId === bid._id}
                    onClick={() => acceptBid(bid._id)}
                    className="w-full rounded-xl py-3 text-sm font-semibold
                      bg-orange-500 hover:bg-orange-600 text-black
                      disabled:opacity-50 transition"
                  >
                    Accept Offer
                  </button>
                )}

                {bid.accepted && (
                  <button
                    onClick={() => proceedToPayment(bid._id)}
                    className="w-full rounded-xl py-3 text-sm font-semibold
                      bg-emerald-500 hover:bg-emerald-600 text-black transition sm:col-span-2"
                  >
                    Proceed to Payment
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {!loading && sortedBids.length === 0 && (
          <div className="text-center text-white/50 mt-6">No bids yet.</div>
        )}
      </div>
    </div>
  );
}
