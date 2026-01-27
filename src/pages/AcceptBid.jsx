import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// ✅ Robust API base:
// - In localhost dev, default to http://localhost:5000 if VITE_API_URL is missing
// - In production, VITE_API_URL should be set (Railway). If missing, it will still try same-origin.
function getApiBase() {
  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  // fallback only for local dev
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }

  // last resort: same-origin (may be wrong if backend is separate)
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

// ✅ Safe JSON fetch that won't crash on HTML responses
async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  // If not OK, try to read JSON or text for a useful error
  if (!res.ok) {
    let body = null;

    if (contentType.includes("application/json")) {
      try {
        body = await res.json();
      } catch {
        body = null;
      }
    } else {
      try {
        const text = await res.text();
        body = { message: text?.slice(0, 300) || "Non-JSON error response" };
      } catch {
        body = { message: "Non-JSON error response" };
      }
    }

    const msg = body?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  // If OK but still not JSON, return empty
  if (!contentType.includes("application/json")) {
    // This prevents "Unexpected token <"
    return [];
  }

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

    // If API base is empty in production, this will likely fail; log it clearly
    if (!API) {
      console.error(
        "VITE_API_URL is missing. Set it in .env for local dev and Railway Variables for production."
      );
    }

    setLoading(true);
    try {
      const url = `${API}/api/bids/request/${requestId}`;
      const data = await fetchJson(url, { headers: authHeaders() });
      setBids(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("LOAD BIDS FAILED:", err?.status, err?.message, err?.body);

      // If unauthorized, this is the exact issue you saw in browser
      if (err?.status === 401 || err?.status === 403) {
        // keep UI calm; just show empty and log
        setBids([]);
        return;
      }

      setBids([]);
    } finally {
      setLoading(false);
    }
  };

  // Lowest price first
  const sortedBids = useMemo(() => {
    return [...bids].sort(
      (a, b) => safeNumber(a?.totalPrice) - safeNumber(b?.totalPrice)
    );
  }, [bids]);

  const acceptBid = async (bidId) => {
    if (!bidId) return;

    if (!API) {
      alert("API base missing. Set VITE_API_URL and reload.");
      return;
    }

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
      console.error("ACCEPT BID FAILED:", err?.status, err?.message, err?.body);
      alert(err?.message || "Could not accept bid (network/server error).");
    } finally {
      setAcceptingBidId("");
    }
  };

  // ✅ FIX: pass requestId via state (Option 1)
  const proceedToPayment = (bidId) => {
    navigate(`/payment/${bidId}`, { state: { requestId } });
  };

  const renderRating = (bid) => {
    const rating = safeNumber(bid?.sellerRating);
    const ratingCount = safeNumber(bid?.sellerRatingCount);

    if (ratingCount > 0) {
      return (
        <>
          <div className="text-cyan-300 font-semibold">
            {rating.toFixed(1)} / 10
          </div>
          <div className="text-xs text-white/50">
            Based on {ratingCount} rated sales
          </div>
        </>
      );
    }

    return <span className="text-white/40">—</span>;
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 pt-[160px] pb-20">
      <button
        onClick={() => navigate(-1)}
        className="rounded-xl border border-white/15 bg-[#0b0a1c]/70 hover:bg-[#0b0a1c]/85 transition p-2 backdrop-blur-md text-white/80 hover:text-white"
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

      <div className="mt-10 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-white/15 bg-[#0b0a1c]/80 backdrop-blur-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-white/70 border-b border-white/10">
              <tr>
                <th className="p-4 text-left">Seller</th>
                <th className="p-4">Seller Rating</th>
                <th className="p-4">Seller Offer</th>
                <th className="p-4">Delivery</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>

            <tbody>
              {sortedBids.map((bid) => {
                const seller = bid?.sellerId;
                const sellerEmail = seller?.email || "Unknown";

                return (
                  <tr
                    key={bid._id}
                    className="border-t border-white/5 hover:bg-white/2 transition"
                  >
                    <td className="p-4 align-top">
                      <div className="font-medium">{sellerEmail}</div>
                    </td>

                    <td className="p-4 text-center align-top">
                      {renderRating(bid)}
                    </td>

                    <td className="p-4 text-center align-top text-orange-300 font-semibold">
                      ${safeNumber(bid.totalPrice).toLocaleString()}
                    </td>

                    <td className="p-4 text-center align-top">
                      {bid.deliveryTime}
                    </td>

                    <td className="p-4 text-center align-top">
                      {bid.accepted ? (
                        <span className="text-green-400 font-semibold">
                          Accepted
                        </span>
                      ) : (
                        <span className="text-white/60">Pending</span>
                      )}
                    </td>

                    <td className="p-4 text-center align-top">
                      <div className="flex flex-col gap-2 items-center">
                        <button className="px-4 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition">
                          Ask the Seller
                        </button>

                        {!bid.accepted && (
                          <button
                            disabled={acceptingBidId === bid._id}
                            onClick={() => acceptBid(bid._id)}
                            className="px-4 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-semibold transition disabled:opacity-50"
                          >
                            Accept Bid
                          </button>
                        )}

                        {bid.accepted && (
                          <button
                            onClick={() => proceedToPayment(bid._id)}
                            className="px-4 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition"
                          >
                            Proceed to Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedBids.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-white/50">
                    No bids yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
