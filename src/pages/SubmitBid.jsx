import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
} from "lucide-react";

import logopic2 from "../assets/logopic2.png";
import Galactic1 from "../assets/Galactic1.png";

// ✅ Match SellerDashboard env fallback
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// ✅ Axios instance with timeout (no infinite hang)
const http = axios.create({
  timeout: 12000,
});

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

// ✅ Convert "5 days" or "3-5 business days" -> 5
function deliveryTimeToDays(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const nums = raw.match(/\d+(\.\d+)?/g);
  if (!nums || !nums.length) return null;

  // take the max number found (e.g., "3-5" => 5)
  const values = nums.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (!values.length) return null;

  return Math.max(...values);
}

export default function SubmitBid() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const sellerId = localStorage.getItem("userId") || "";

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const [unitPrice, setUnitPrice] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  const [photos, setPhotos] = useState([]);
  const photoPreviews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);

  const [myBid, setMyBid] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

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

      if (!requestId) {
        setRequest(null);
        setMyBid(null);
        setExistingImages([]);
        setShowAdvanced(true);
        return;
      }

      // 1) Load request
      const res = await http.get(`${API_BASE_URL}/api/requests/${requestId}`, {
        headers: authHeaders(),
      });

      setRequest(res.data);

      // 2) Load bids for this request
      try {
        const bidRes = await http.get(`${API_BASE_URL}/api/bids/request/${requestId}`, {
          headers: authHeaders(),
        });

        const bids = Array.isArray(bidRes.data) ? bidRes.data : [];

        const mine =
          Array.isArray(bids) &&
          bids.find((b) => String(b?.sellerId?._id || b?.sellerId) === String(sellerId));

        if (mine) {
          setMyBid(mine);
          setUnitPrice(String(mine.unitPrice ?? ""));
          setTotalPrice(String(mine.totalPrice ?? ""));
          setDeliveryTime(String(mine.deliveryTime ?? ""));

          const imgs = Array.isArray(mine.images) ? mine.images : [];
          setExistingImages(imgs);
          setShowAdvanced(false);
        } else {
          setMyBid(null);
          setExistingImages([]);
          setShowAdvanced(true);
        }
      } catch {
        // bids endpoint timeout/error -> still render page
        setMyBid(null);
        setExistingImages([]);
        setShowAdvanced(true);
      }
    } catch {
      setRequest(null);
      setMyBid(null);
      setExistingImages([]);
      setShowAdvanced(true);
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
    if (isSubmitting) return;

    if (!sellerId) {
      alert("Missing sellerId. Please log out and log in again.");
      return;
    }

    const u = Number(unitPrice);
    const t = Number(totalPrice);

    if (!Number.isFinite(u) || u <= 0 || !Number.isFinite(t) || t <= 0) {
      alert("Enter valid Unit Price and Total Lot Price (numbers only).");
      return;
    }

    const deliveryDays = deliveryTimeToDays(deliveryTime);
    if (!deliveryDays || !Number.isFinite(deliveryDays) || deliveryDays <= 0) {
      alert("Delivery Time must include a valid number of days (e.g. 5 or 3-5 days).");
      return;
    }

    try {
      setIsSubmitting(true);

      const isUpdate = !!myBid;

      let imagesToSend = [];
      if (photos.length) {
        imagesToSend = await Promise.all(photos.map(fileToBase64));
      } else if (isUpdate && existingImages.length) {
        imagesToSend = existingImages;
      } else {
        imagesToSend = [];
      }

      const payload = {
        requestId,
        sellerId,
        unitPrice: u,
        totalPrice: t,
        deliveryTime: deliveryDays, // ✅ send NUMBER of days
        images: imagesToSend,
      };

      const postRes = await http.post(`${API_BASE_URL}/api/bids/request/${requestId}`, payload, {
        headers: authHeaders({ "Content-Type": "application/json" }),
      });

      if (!postRes || !postRes.data) {
        alert("Error submitting bid.");
        return;
      }

      alert(isUpdate ? "Offer updated successfully!" : "Bid submitted successfully!");
      navigate("/seller-dashboard");
    } catch (e) {
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message || e?.response?.data?.error;

      if (status === 400 && !serverMsg) {
        alert("Bad Request (400). Backend rejected the bid payload. Check required fields/types (deliveryTime must be a number of days).");
      } else {
        const msg =
          serverMsg ||
          (e?.code === "ECONNABORTED"
            ? "Server timeout submitting bid. Try again."
            : "Error submitting bid. Try again.");
        alert(msg);
      }
    } finally {
      setIsSubmitting(false);
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

  const shipText = formatShipping(request?.shippingAddress);

  const fieldCard = "rounded-2xl border border-white/12 bg-[#0a0128]/55 p-4";
  const inputBase =
    "w-full rounded-xl bg-black/55 border border-white/25 px-3 py-2.5 text-sm text-white/90 outline-none " +
    "focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25 " +
    "placeholder:text-white/35";

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
          "
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-cyan-200" />
        </button>

        <div className="mt-6 flex items-center gap-3">
          <img
            src={logopic2}
            alt="MerqNet"
            className="w-9 h-9 rounded-xl border border-white/15 bg-black/40 p-1"
          />
          <div>
            <div className="text-xs text-white/60 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-200" />
              MerqNet
            </div>
            <h1 className="text-2xl font-bold text-white">Submit Offer</h1>
            <p className="text-sm text-white/60">You are submitting an offer for a buyer request.</p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl border border-white/12 bg-[#0B001F]/75 p-6 shadow-[0_0_26px_rgba(2,6,23,0.55)] backdrop-blur-md">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-white/60 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-cyan-200" />
                    {request?.category || "Category"}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-white">{request?.productName}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={fieldCard}>
                  <div className="text-xs text-white/60 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-200" />
                    Quantity
                  </div>
                  <div className="mt-2 text-white font-semibold">{request?.quantity ?? "N/A"}</div>
                </div>

                <div className={fieldCard}>
                  <div className="text-xs text-white/60 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-amber-200" />
                    Size / Weight
                  </div>
                  <div className="mt-2 text-white font-semibold">{request?.sizeWeight || "N/A"}</div>
                </div>

                <div className={fieldCard}>
                  <div className="text-xs text-white/60 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-200" />
                    Ships to
                  </div>
                  <div className="mt-2 text-white font-semibold">{shipText || "Not provided"}</div>
                </div>

                <div className={fieldCard}>
                  <div className="text-xs text-white/60 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-200" />
                    Condition
                  </div>
                  <div className="mt-2 text-white font-semibold">{request?.condition || "N/A"}</div>
                </div>
              </div>

              <div className={fieldCard}>
                <div className="text-xs text-white/60 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-200" />
                  Description
                </div>
                <div className="mt-2 text-white/85">{request?.description || "No description."}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/12 bg-[#0B001F]/75 p-6 shadow-[0_0_26px_rgba(2,6,23,0.55)] backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Your Offer</div>
                <div className="text-xs text-white/60">
                  {myBid ? "Updating existing offer" : "Submitting first offer"}
                </div>
              </div>

              {myBid ? (
                <span className="inline-flex items-center gap-2 text-[11px] px-3 py-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> EXISTING OFFER
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div>
                <label className="text-xs text-white/70 flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-amber-200" />
                  Unit Price
                </label>
                <input
                  className={inputBase}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="e.g. 12.50"
                />
              </div>

              <div>
                <label className="text-xs text-white/70 flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-amber-200" />
                  Total Lot Price
                </label>
                <input
                  className={inputBase}
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(e.target.value)}
                  placeholder="e.g. 2500"
                />
              </div>

              <div>
                <label className="text-xs text-white/70 flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-cyan-200" />
                  Delivery Time (days)
                </label>
                <input
                  className={inputBase}
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="e.g. 5 or 3-5 days"
                />
              </div>

              <button
                onClick={() => setShowAdvanced((p) => !p)}
                className="mt-1 text-xs text-cyan-200 hover:text-cyan-100 flex items-center gap-2"
              >
                <PencilLine className="w-4 h-4" />
                {showAdvanced ? "Hide images" : "Edit images"}
              </button>

              {showAdvanced ? (
                <div className="mt-2 rounded-2xl border border-white/12 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/70 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-amber-200" />
                      Photos (optional)
                    </div>

                    {existingImages.length > 0 ? (
                      <button onClick={clearExistingImages} className="text-[11px] text-red-200 hover:text-red-100">
                        Clear saved images
                      </button>
                    ) : null}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onPickPhotos}
                    className="mt-3 text-xs text-white/70"
                  />

                  {photoPreviews.length ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {photoPreviews.map((src, idx) => (
                        <div key={src} className="relative rounded-xl overflow-hidden border border-white/10">
                          <img src={src} alt="preview" className="w-full h-28 object-cover" />
                          <button
                            onClick={() => removePhotoAt(idx)}
                            className="absolute top-2 right-2 bg-black/70 border border-white/20 rounded-lg p-1.5"
                            aria-label="Remove"
                          >
                            <X className="w-4 h-4 text-white/80" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button
                onClick={submitBid}
                disabled={isSubmitting}
                className="
                  mt-2
                  w-full
                  bg-amber-400 hover:bg-amber-300
                  disabled:opacity-60 disabled:cursor-not-allowed
                  text-black font-semibold
                  py-3
                  rounded-xl
                  shadow-[0_0_22px_rgba(245,158,11,0.22)]
                  transition
                "
              >
                {isSubmitting ? "Submitting..." : myBid ? "Update Offer" : "Submit Offer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
