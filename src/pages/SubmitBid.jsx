import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Truck, UploadCloud } from "lucide-react";

// Robust API base
function getApiBase() {
  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }
  return "";
}

const API_BASE_URL = getApiBase();

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("userToken") || "";
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

// Safe JSON fetch
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

  if (!contentType.includes("application/json")) return [];
  return res.json();
}

export default function SubmitBid() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);

  // Pricing
  const [unitPrice, setUnitPrice] = useState("");
  const [totalPrice, setTotalPrice] = useState("");

  // Delivery + images
  const [deliveryTime, setDeliveryTime] = useState(""); // user typed, optional
  const [photos, setPhotos] = useState([]); // File[]
  const photoPreviews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);

  // Existing bid
  const [myBid, setMyBid] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sellerId = localStorage.getItem("userId") || localStorage.getItem("userID") || "";

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line
  }, [requestId]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photoPreviews]);

  const loadAll = async () => {
    if (!requestId) return;

    setLoading(true);
    try {
      const headers = authHeaders();

      // 1) Load request details (optional; ignore failure if endpoint not present)
      try {
        const reqData = await fetchJson(`${API_BASE_URL}/api/requests/${requestId}`, {
          headers,
        });
        setRequest(reqData || null);
      } catch {
        setRequest(null);
      }

      // 2) Load bids for request, find mine
      const bids = await fetchJson(`${API_BASE_URL}/api/bids/request/${requestId}`, {
        headers,
      });

      const mine = Array.isArray(bids)
        ? bids.find((b) => String(b?.sellerId?._id || b?.sellerId) === String(sellerId))
        : null;

      if (mine) {
        setMyBid(mine);

        setUnitPrice(String(mine.unitPrice ?? ""));
        setTotalPrice(String(mine.totalPrice ?? ""));

        // ✅ Don’t force “Negotiated in chat”
        setDeliveryTime(typeof mine.deliveryTime === "string" ? mine.deliveryTime : "");
        setExistingImages(Array.isArray(mine.images) ? mine.images : []);

        setShowAdvanced(false);
      } else {
        setMyBid(null);
        setUnitPrice("");
        setTotalPrice("");
        setDeliveryTime("");
        setExistingImages([]);
        setShowAdvanced(false);
      }
    } catch (err) {
      console.error("LOAD SUBMIT BID FAILED:", err?.status, err?.message, err?.body);
      setMyBid(null);
    } finally {
      setLoading(false);
    }
  };

  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotos(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const u = Number(unitPrice);
    const t = Number(totalPrice);

    if (!Number.isFinite(u) || !Number.isFinite(t) || u <= 0 || t <= 0) {
      alert("Please enter valid Unit Price and Total Lot Price (numbers only).");
      return;
    }

    // ✅ No “Negotiated in chat” phrase anywhere
    const deliverySafe = String(deliveryTime || "TBD");

    try {
      setSubmitting(true);

      // images: if user picked photos, send them (you currently store strings; keep behavior)
      const imagesToSend = Array.isArray(existingImages) ? existingImages : [];

      const payload = {
        sellerId,
        unitPrice: u,
        totalPrice: t,
        deliveryTime: deliverySafe,
        images: imagesToSend,
      };

      const res = await fetchJson(`${API_BASE_URL}/api/bids/request/${requestId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      setMyBid(res || null);
      alert(myBid ? "Offer updated!" : "Offer submitted!");
      navigate(`/seller`, { replace: false });
    } catch (err) {
      console.error("SUBMIT BID FAILED:", err?.status, err?.message, err?.body);
      alert(err?.message || "Could not submit offer.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase =
    "w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-cyan-500/40";

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 pt-[140px] pb-24">
      <button
        onClick={() => navigate(-1)}
        className="rounded-xl border border-white/15 bg-[#0b0a1c]/70 hover:bg-[#0b0a1c]/85 transition p-2 text-white/80 hover:text-white"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="mt-6 text-center">
        <div className="text-xs text-white/60">MerqNet</div>
        <h1 className="text-2xl font-semibold">Submit Offer</h1>
        <p className="text-sm text-white/70 mt-1">
          You are submitting an offer for a buyer request.
        </p>
        {loading && <div className="mt-3 text-xs text-white/50">Loading…</div>}
      </div>

      <div className="mt-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Request overview (optional) */}
        <div className="rounded-2xl border border-white/15 bg-[#0b0a1c]/80 backdrop-blur-md p-5">
          <div className="text-xs text-white/60 mb-2">Request</div>
          <div className="text-xl font-semibold">
            {request?.productName || request?.title || "Buyer Request"}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 text-xs">Quantity</div>
              <div className="font-semibold">{request?.quantity ?? "—"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-white/60 text-xs">Size / Weight</div>
              <div className="font-semibold">{request?.sizeWeight ?? "—"}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 col-span-2">
              <div className="text-white/60 text-xs">Condition</div>
              <div className="font-semibold">{request?.condition ?? "—"}</div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/60 text-xs">Description</div>
            <div className="mt-1">{request?.description ?? "—"}</div>
          </div>

          <div className="mt-4 text-xs text-white/40">
            Request ID: {requestId}
          </div>
        </div>

        {/* RIGHT: Offer form */}
        <div className="rounded-2xl border border-white/15 bg-[#0b0a1c]/80 backdrop-blur-md p-5">
          <div className="text-xs text-white/60 mb-2">Your Offer</div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/70">Unit Price</label>
              <input
                className={inputBase}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="e.g. 75.00"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">Total Lot Price</label>
              <input
                className={inputBase}
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                placeholder="e.g. 7000.00"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-sm text-cyan-300 hover:text-cyan-200 underline"
            >
              {showAdvanced ? "Hide advanced (delivery & photos)" : "Show advanced (delivery & photos)"}
            </button>

            {showAdvanced && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <Truck className="w-4 h-4 text-amber-200" />
                    Delivery Time
                  </label>
                  <input
                    className={inputBase}
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    placeholder='e.g. "5 days"'
                  />
                  <div className="text-xs text-white/45 mt-1">
                    Optional. If left blank, it will show as “TBD”.
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <UploadCloud className="w-4 h-4 text-cyan-200" />
                    Photos (optional)
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={onPickPhotos}
                    className="mt-3 text-sm text-white/70"
                  />

                  {photos.length > 0 && (
                    <div className="mt-3 text-xs text-white/60">
                      {photos.length} file(s) selected (upload wiring optional)
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl py-3 text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-black transition disabled:opacity-60"
            >
              {submitting ? "Submitting…" : myBid ? "Update Offer" : "Submit Offer"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
