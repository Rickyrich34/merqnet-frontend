import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Tag,
  Package,
  Ruler,
  FileText,
  DollarSign,
  Truck,
  Upload,
  X,
  MapPin,
  Briefcase,
  PencilLine,
  CheckCircle2,
  Lock,
} from "lucide-react";

import logopic2 from "../assets/logopic2.png";
import Galactic1 from "../assets/Galactic1.png";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("userToken") || localStorage.getItem("token") || "";
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatShipping(addr) {
  if (!addr) return null;

  const street = addr.street || addr.streetAddress || "";
  const city = addr.city || "";
  const state = addr.state || "";
  const country = addr.country || "";
  const postal = addr.postalCode || addr.zip || "";

  const line1 = [city, state].filter(Boolean).join(", ");
  const line2 = [country, postal].filter(Boolean).join(" ");
  const compact = [line1, line2].filter(Boolean).join(" • ");
  const full = [street, compact].filter(Boolean).join(" — ");

  return full || compact || null;
}

/**
 * ✅ Defensive "closed request" detector.
 * Works even if backend uses different names.
 */
function isRequestClosed(req) {
  if (!req || typeof req !== "object") return false;

  const status = String(req.status || req.requestStatus || req.state || "").toLowerCase();

  if (
    status.includes("closed") ||
    status.includes("completed") ||
    status.includes("complete") ||
    status.includes("accepted") ||
    status.includes("awarded") ||
    status.includes("winner") ||
    status.includes("paid") ||
    status.includes("fulfilled") ||
    status.includes("done")
  ) {
    return true;
  }

  // common boolean flags
  if (req.isClosed === true || req.closed === true || req.isComplete === true || req.completed === true) {
    return true;
  }

  // common "winner/accepted" pointers
  if (
    req.acceptedBidId ||
    req.acceptedBid ||
    req.winningBidId ||
    req.winningBid ||
    req.selectedBidId ||
    req.selectedBid ||
    req.chosenBidId ||
    req.chosenBid ||
    req.winnerBidId ||
    req.winnerBid ||
    req.paymentIntentId ||
    req.receiptId
  ) {
    return true;
  }

  return false;
}

export default function SubmitBid() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const sellerId = localStorage.getItem("userId") || "";

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ NEW: closed guard state
  const [requestClosed, setRequestClosed] = useState(false);

  // Pricing (always editable)
  const [unitPrice, setUnitPrice] = useState("");
  const [totalPrice, setTotalPrice] = useState("");

  // Delivery + images (required on first bid, preserved on updates)
  const [deliveryTime, setDeliveryTime] = useState("");

  // New photos the seller picks this time (optional)
  const [photos, setPhotos] = useState([]); // File[]
  const photoPreviews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);

  // Existing bid (if any)
  const [myBid, setMyBid] = useState(null);

  // Existing images stored on the bid (base64 or urls) - preserved unless user changes
  const [existingImages, setExistingImages] = useState([]);

  // If seller has an existing bid, advanced fields are collapsed by default
  const [showAdvanced, setShowAdvanced] = useState(true);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoPreviews]);

  useEffect(() => {
    fetchRequestAndMyBid();
    // eslint-disable-next-line
  }, [requestId]);

  const fetchRequestAndMyBid = async () => {
    try {
      setLoading(true);

      // 1) Load request
      const res = await fetch(`${API_BASE_URL}/api/requests/${requestId}`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        setRequest(null);
        setRequestClosed(false);
        return;
      }

      const reqData = await res.json();
      setRequest(reqData);

      // ✅ NEW: detect closed/accepted request
      const closed = isRequestClosed(reqData);
      setRequestClosed(closed);

      // If closed, don't even bother loading bids for editing/submitting
      if (closed) {
        setMyBid(null);
        setExistingImages([]);
        setShowAdvanced(false);
        return;
      }

      // 2) Load bids for this request and find current seller’s bid (if any)
      try {
        const bidRes = await fetch(`${API_BASE_URL}/api/bids/request/${requestId}`, {
          headers: authHeaders(),
        });

        if (bidRes.ok) {
          const bids = await bidRes.json();

          const mine =
            Array.isArray(bids) &&
            bids.find((b) => String(b?.sellerId?._id || b?.sellerId) === String(sellerId));

          if (mine) {
            setMyBid(mine);

            // Prefill pricing
            setUnitPrice(String(mine.unitPrice ?? ""));
            setTotalPrice(String(mine.totalPrice ?? ""));

            // Preserve deliveryTime (editable only if they want)
            setDeliveryTime(String(mine.deliveryTime ?? ""));

            // Preserve images (editable only if they want)
            const imgs = Array.isArray(mine.images) ? mine.images : [];
            setExistingImages(imgs);

            // Collapse advanced fields by default for updates
            setShowAdvanced(false);
          } else {
            setMyBid(null);
            setExistingImages([]);
            setShowAdvanced(true);
          }
        } else {
          setMyBid(null);
          setExistingImages([]);
          setShowAdvanced(true);
        }
      } catch {
        setMyBid(null);
        setExistingImages([]);
        setShowAdvanced(true);
      }
    } catch {
      setRequest(null);
      setMyBid(null);
      setExistingImages([]);
      setShowAdvanced(true);
      setRequestClosed(false);
    } finally {
      setLoading(false);
    }
  };

  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const next = [...photos, ...files].slice(0, 2);
    setPhotos(next);
    e.target.value = "";
  };

  const removePhotoAt = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearExistingImages = () => {
    setExistingImages([]);
  };

  const submitBid = async () => {
    // ✅ NEW: hard stop if request is closed
    if (requestClosed) {
      alert("This request is closed. The buyer already selected a winner.");
      navigate("/seller-dashboard");
      return;
    }

    // Always require pricing
    if (!unitPrice || !totalPrice) {
      alert("Enter Unit Price and Total Lot Price.");
      return;
    }

    const isUpdate = !!myBid;

    // Delivery time rule:
    if (!deliveryTime) {
      alert("Delivery Time is required.");
      return;
    }

    try {
      let imagesToSend = [];

      if (photos.length) {
        imagesToSend = await Promise.all(photos.map(fileToBase64));
      } else if (isUpdate && existingImages.length) {
        imagesToSend = existingImages;
      } else {
        imagesToSend = [];
      }

      const payload = {
        sellerId,
        unitPrice: Number(unitPrice),
        totalPrice: Number(totalPrice),
        deliveryTime,
        images: imagesToSend,
      };

      const res = await fetch(`${API_BASE_URL}/api/bids/request/${requestId}`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.message || `Error submitting bid (${res.status})`);
        return;
      }

      alert(isUpdate ? "Offer updated successfully!" : "Bid submitted successfully!");
      navigate("/seller-dashboard");
    } catch {
      alert("Server error submitting bid.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-black text-red-400 flex items-center justify-center">
        Request not found.
      </div>
    );
  }

  // ✅ NEW: Closed screen (no offer allowed)
  if (requestClosed) {
    return (
      <div className="relative min-h-screen w-full text-white overflow-x-hidden bg-black">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${Galactic1})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>

        <div className="relative z-10 max-w-xl mx-auto pt-44 px-6 pb-24">
          <div className="rounded-3xl border border-white/15 bg-[#0B001F]/82 backdrop-blur-md shadow-[0_18px_70px_rgba(0,0,0,0.65)] p-8 text-center">
            <div className="flex items-center justify-center gap-3">
              <Lock className="w-6 h-6 text-amber-200" />
              <h1 className="text-[22px] font-semibold text-white/95">Request Closed</h1>
            </div>

            <p className="mt-3 text-sm text-white/80">
              This request is no longer accepting offers. The buyer already selected a winner.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => navigate("/seller-dashboard")}
                className="
                  w-full
                  rounded-2xl
                  bg-amber-400 hover:bg-amber-300
                  text-black font-semibold
                  py-3
                  shadow-[0_0_22px_rgba(245,158,11,0.20)]
                  transition
                "
              >
                Back to Seller Dashboard
              </button>

              <button
                onClick={() => navigate("/dashboard")}
                className="w-full text-xs text-white/70 hover:text-white transition"
              >
                Go to Main Dashboard
              </button>
            </div>

            <div className="mt-6 text-[11px] text-white/50">
              Request ID: <span className="text-white/75">{request?._id}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shipText = formatShipping(request?.shippingAddress);

  const fieldCard = "rounded-2xl border border-white/12 bg-[#0a0128]/55 p-4";
  const inputBase =
    "w-full rounded-xl bg-black/55 border border-white/25 px-3 py-2.5 text-sm text-white/90 outline-none " +
    "focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25 " +
    "placeholder:text-white/35";

  return (
    <div className="relative min-h-screen w-full text-white overflow-x-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${Galactic1})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 600px at 18% 12%, rgba(34,211,238,0.12), transparent 58%), radial-gradient(900px 650px at 82% 24%, rgba(245,158,11,0.10), transparent 62%), radial-gradient(900px 700px at 50% 90%, rgba(148,163,184,0.06), transparent 65%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto pt-44 px-6 pb-24">
        {/* Back */}
        <button
          onClick={() => navigate("/seller-dashboard")}
          className="
            rounded-2xl
            border border-cyan-400/25
            bg-[#0B001F]/80
            hover:bg-[#0B001F]
            transition
            p-2.5
            shadow-[0_0_18px_rgba(34,211,238,0.14)]
            backdrop-blur-md
            text-white/85
          "
          aria-label="Back"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5 text-cyan-200" />
        </button>

        {/* Brand + Title */}
        <div className="mt-6 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3">
            <img
              src={logopic2}
              alt="MerqNet"
              className="w-9 h-9 rounded-full object-cover shadow-[0_0_16px_rgba(34,211,238,0.14)]"
            />
            <span className="font-semibold tracking-wide text-white/90">MerqNet</span>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border border-amber-400/25 bg-[#0B001F]/75 text-white/75">
            <Briefcase className="w-3.5 h-3.5 text-amber-200" />
            SELLER — Submit your offer
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-[22px] font-semibold text-white/95">
              {myBid ? "Update Your Offer" : "Submit Your Bid"}
            </h1>

            {myBid ? (
              <p className="mt-1 text-xs text-white/75 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-200" />
                Existing offer found — only pricing is required. Delivery/photos stay the same unless you edit them.
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/75">
                Confirm request details (quantity + shipping) and enter your offer.
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Specs */}
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0B001F]/82 backdrop-blur-md shadow-[0_18px_70px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
            <div className="p-5 pb-6">
              <h2 className="text-sm font-semibold text-cyan-200">Request Specifications</h2>
              <div className="mt-3 h-px bg-white/10" />

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="grid grid-cols-2 gap-3 text-[11px] text-white/80">
                  <div className="rounded-xl border border-white/10 bg-[#0a0128]/55 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-white/60">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Category</span>
                    </div>
                    <div className="text-white/92 font-medium">{request.category || "—"}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0a0128]/55 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-white/60">
                      <Package className="w-3.5 h-3.5" />
                      <span>Condition</span>
                    </div>
                    <div className="text-white/92 font-medium">{request.condition || "—"}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0a0128]/55 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-white/60">
                      <Package className="w-3.5 h-3.5" />
                      <span>Quantity</span>
                    </div>
                    <div className="text-white/92 font-medium">{request.quantity ?? "—"}</div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0a0128]/55 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-white/60">
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Size/Weight</span>
                    </div>
                    <div className="text-white/92 font-medium">{request.sizeWeight || "—"}</div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-[#0a0128]/45 px-3 py-2.5">
                  <div className="text-[11px] text-white/60">Product</div>
                  <div className="text-white/95 font-semibold text-sm">{request.productName}</div>
                </div>

                {request.description ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-[#0a0128]/35 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-white/60">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Description</span>
                    </div>
                    <div className="mt-1 text-[12px] text-white/90">{request.description}</div>
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-amber-400/20 bg-[#0a0128]/35 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-white/60">
                    <MapPin className="w-3.5 h-3.5 text-amber-200" />
                    <span>Ships to</span>
                  </div>
                  <div className="mt-1 text-[12px] text-white/90">
                    {shipText || "Not provided"}
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-white/45">Request ID: {request._id}</div>
              </div>
            </div>
          </div>

          {/* Right: Offer */}
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0B001F]/82 backdrop-blur-md shadow-[0_18px_70px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
            <div className="p-5 pb-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white/90">Your Offer</h2>

                {myBid ? (
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((p) => !p)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/35 px-3 py-2 text-xs text-white/85 hover:bg-black/45 transition"
                    title="Toggle advanced fields"
                  >
                    <PencilLine className="w-4 h-4 text-cyan-200" />
                    {showAdvanced ? "Hide details" : "Edit details"}
                  </button>
                ) : null}
              </div>

              <div className="mt-3 h-px bg-white/10" />

              <div className="mt-4 space-y-3">
                <div className={fieldCard}>
                  <label className="flex items-center gap-2 text-xs text-white/75 mb-2">
                    <DollarSign className="w-4 h-4 text-cyan-200" />
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className={inputBase}
                    placeholder="e.g. 18.00"
                  />
                </div>

                <div className={fieldCard}>
                  <label className="flex items-center gap-2 text-xs text-white/75 mb-2">
                    <DollarSign className="w-4 h-4 text-cyan-200" />
                    Total Lot Price ($)
                  </label>
                  <input
                    type="number"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className={inputBase}
                    placeholder="e.g. 1800.00"
                  />
                </div>

                {myBid && !showAdvanced ? (
                  <div className="rounded-2xl border border-white/12 bg-black/25 p-4">
                    <div className="text-xs text-white/70">
                      Delivery Time:{" "}
                      <span className="text-white/90 font-semibold">
                        {deliveryTime || "—"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-white/70">
                      Photos on file:{" "}
                      <span className="text-white/90 font-semibold">
                        {photos.length ? photos.length : existingImages.length}
                      </span>
                    </div>
                    <div className="mt-3 text-[11px] text-white/55">
                      These details are preserved. Click “Edit details” if you want to change them.
                    </div>
                  </div>
                ) : null}

                {(!myBid || showAdvanced) && (
                  <>
                    <div className={fieldCard}>
                      <label className="flex items-center gap-2 text-xs text-white/75 mb-2">
                        <Truck className="w-4 h-4 text-amber-200" />
                        Delivery Time
                      </label>
                      <input
                        type="text"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className={inputBase}
                        placeholder="e.g. 3 days"
                      />
                    </div>

                    <div className={fieldCard}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-white/80">
                            <Upload className="w-4 h-4 text-cyan-200" />
                            <span>Add Photos (optional)</span>
                          </div>
                          <div className="text-[11px] text-white/55 mt-1">
                            Up to 2 pictures. Existing photos are kept unless you upload new ones or clear them.
                          </div>
                        </div>

                        <label className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/35 px-3 py-2 text-xs text-white/90 hover:bg-black/45 transition">
                          <Upload className="w-4 h-4 text-amber-200" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={onPickPhotos}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {existingImages.length > 0 && photos.length === 0 ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] text-white/70">
                              Existing photos on file:{" "}
                              <span className="text-white/90 font-semibold">{existingImages.length}</span>
                            </div>
                            <button
                              type="button"
                              onClick={clearExistingImages}
                              className="text-[11px] text-amber-200 hover:text-amber-100 underline"
                              title="Remove stored photos"
                            >
                              Clear existing photos
                            </button>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-3">
                            {existingImages.slice(0, 2).map((src, idx) => (
                              <div
                                key={`${idx}-${String(src).slice(0, 14)}`}
                                className="relative overflow-hidden rounded-2xl border border-white/25 bg-black/35"
                              >
                                <img
                                  src={src}
                                  alt={`existing-${idx}`}
                                  className="w-full h-32 object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {photoPreviews.length > 0 ? (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {photoPreviews.map((src, idx) => (
                            <div
                              key={src}
                              className="relative overflow-hidden rounded-2xl border border-white/25 bg-black/35"
                            >
                              <button
                                type="button"
                                onClick={() => removePhotoAt(idx)}
                                className="absolute top-2 right-2 z-10 rounded-lg border border-white/25 bg-black/60 p-1 text-white/80 hover:text-white hover:bg-black/75 transition"
                                title="Remove"
                                aria-label="Remove photo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <img src={src} alt={`upload-${idx}`} className="w-full h-32 object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        existingImages.length === 0 && (
                          <div className="mt-3 text-[11px] text-white/55">No photos selected.</div>
                        )
                      )}
                    </div>
                  </>
                )}

                <button
                  onClick={submitBid}
                  className="
                    w-full mt-2
                    rounded-2xl
                    bg-amber-400 hover:bg-amber-300
                    text-black font-semibold
                    py-3
                    shadow-[0_0_22px_rgba(245,158,11,0.20)]
                    transition
                  "
                >
                  {myBid ? "Update Offer" : "Submit Offer"}
                </button>

                <button
                  onClick={() => navigate("/seller-dashboard")}
                  className="w-full text-xs text-white/70 hover:text-white transition"
                >
                  Cancel and return
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}
