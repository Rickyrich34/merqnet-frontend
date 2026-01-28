import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, CreditCard, Trash2, CheckCircle2, Loader2 } from "lucide-react";

import Galactic1 from "../assets/Galactic1.png";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

/* ============================
   API helpers (MUST match backend)
============================ */

function getApiBase() {
  const envBase = (import.meta.env.VITE_API_URL || "").trim();
  if (envBase) return envBase.replace(/\/+$/, "");

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }
  return "";
}

const API_BASE = getApiBase();

function getToken() {
  // Support both keys (some pages store "token", others store "userToken")
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("userToken") ||
    ""
  );
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function apiGetCards() {
  const res = await fetch(`${API_BASE}/api/payments/cards`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Failed to load cards");
  return data?.cards || [];
}

// Backend expects: { tokenId, makeDefault }
async function apiAddCardToken(tokenId, makeDefault) {
  const res = await fetch(`${API_BASE}/api/payments/cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ tokenId, makeDefault: !!makeDefault }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Failed to add card");
  return data;
}

// Backend route: PATCH /cards/:cardId/default, controller treats :cardId as last4
async function apiSetDefaultByLast4(last4) {
  const res = await fetch(
    `${API_BASE}/api/payments/cards/${encodeURIComponent(last4)}/default`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${getToken()}` },
    }
  );
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Failed to set default");
  return data;
}

// Backend route: DELETE /cards/:cardId, controller treats :cardId as last4
async function apiDeleteByLast4(last4) {
  const res = await fetch(
    `${API_BASE}/api/payments/cards/${encodeURIComponent(last4)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    }
  );
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Failed to delete card");
  return data;
}

// Backend requires: { requestId, bidId }
async function apiPayNow({ requestId, bidId }) {
  const res = await fetch(`${API_BASE}/api/payments/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ requestId, bidId }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data?.message || "Payment failed");
  return data;
}

/* ============================
   Main Component
============================ */
export default function PaymentMethods() {
  const navigate = useNavigate();
  const { bidId: bidIdFromRoute } = useParams();
  const location = useLocation();

  const stripePk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
  const stripePromise = useMemo(() => {
    if (!stripePk) return null;
    return loadStripe(stripePk);
  }, [stripePk]);

  // requestId can come from:
  // 1) navigation state
  // 2) query string
  // 3) sessionStorage fallback (for refresh / alternate navigation)
  const requestIdFromState = location?.state?.requestId || null;

  const requestIdFromQuery = useMemo(() => {
    try {
      const sp = new URLSearchParams(location.search || "");
      return (
        sp.get("requestId") ||
        sp.get("requestid") ||
        sp.get("rid") ||
        null
      );
    } catch {
      return null;
    }
  }, [location.search]);

  const sessionKey = useMemo(() => {
    const bid = String(bidIdFromRoute || "").trim();
    return bid ? `merqnet_pay_requestId_${bid}` : "";
  }, [bidIdFromRoute]);

  const [resolvedRequestId, setResolvedRequestId] = useState(
    requestIdFromState || requestIdFromQuery || null
  );

  // Resolve requestId once bidId exists; allow refresh to recover it
  useEffect(() => {
    const direct = requestIdFromState || requestIdFromQuery || null;

    if (direct) {
      setResolvedRequestId(direct);
      if (sessionKey) sessionStorage.setItem(sessionKey, direct);
      return;
    }

    if (!direct && sessionKey) {
      const cached = sessionStorage.getItem(sessionKey);
      if (cached) {
        setResolvedRequestId(cached);
      }
    }
  }, [requestIdFromState, requestIdFromQuery, sessionKey]);

  // Also store whenever we already have it (extra safety)
  useEffect(() => {
    if (sessionKey && resolvedRequestId) {
      sessionStorage.setItem(sessionKey, resolvedRequestId);
    }
  }, [sessionKey, resolvedRequestId]);

  if (!stripePromise) {
    return (
      <div
        className="min-h-screen w-full bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url(${Galactic1})` }}
      >
        <div className="min-h-screen w-full bg-black/50 pb-24 md:pb-10">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-white/80 hover:text-white transition"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-semibold">Back</span>
              </button>
              <div className="text-white font-bold tracking-wide">Payment Methods</div>
              <div className="w-20" />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6 text-white/80">
              Stripe publishable key is missing. Set VITE_STRIPE_PUBLISHABLE_KEY.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodsStripe
        bidIdFromRoute={bidIdFromRoute}
        requestId={resolvedRequestId}
        onBack={() => navigate(-1)}
      />
    </Elements>
  );
}

/* ============================
   Stripe-enabled component
============================ */
function PaymentMethodsStripe({ bidIdFromRoute, requestId, onBack }) {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsErr, setCardsErr] = useState("");

  const [busyKey, setBusyKey] = useState("");
  const [adding, setAdding] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [payOk, setPayOk] = useState("");

  const defaultCard = useMemo(() => cards.find((c) => c.isDefault) || null, [cards]);

  async function refreshCards() {
    setCardsErr("");
    setLoadingCards(true);
    try {
      const list = await apiGetCards();
      setCards(Array.isArray(list) ? list : []);
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to load cards"));
      setCards([]);
    } finally {
      setLoadingCards(false);
    }
  }

  useEffect(() => {
    refreshCards();
  }, []);

  async function addNewCard(makeDefault = true) {
    setCardsErr("");
    setPayErr("");
    setPayOk("");

    if (!stripe || !elements) {
      setCardsErr("Stripe is not ready yet.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCardsErr("Card input not found.");
      return;
    }

    try {
      setAdding(true);

      // MUST match backend: tokenId
      const { token, error } = await stripe.createToken(cardElement);
      if (error) throw new Error(error.message || "Failed to tokenize card");
      if (!token?.id) throw new Error("Missing Stripe token id");

      await apiAddCardToken(token.id, makeDefault);

      await refreshCards();
      cardElement.clear();
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to add card"));
    } finally {
      setAdding(false);
    }
  }

  async function setDefault(card) {
    setCardsErr("");
    setPayErr("");
    setPayOk("");

    const last4 = String(card?.last4 || "");
    if (!last4) {
      setCardsErr("Card last4 missing.");
      return;
    }

    try {
      setBusyKey(`default-${last4}`);
      await apiSetDefaultByLast4(last4);
      await refreshCards();
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to set default"));
    } finally {
      setBusyKey("");
    }
  }

  async function del(card) {
    setCardsErr("");
    setPayErr("");
    setPayOk("");

    const last4 = String(card?.last4 || "");
    if (!last4) {
      setCardsErr("Card last4 missing.");
      return;
    }

    try {
      setBusyKey(`delete-${last4}`);
      await apiDeleteByLast4(last4);
      await refreshCards();
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to delete card"));
    } finally {
      setBusyKey("");
    }
  }

  async function payNow() {
    setPayErr("");
    setPayOk("");

    if (!bidIdFromRoute) {
      setPayErr("Missing bidId in route.");
      return;
    }
    if (!requestId) {
      setPayErr(
        "Missing requestId. Go back to offers and click Proceed to Payment again."
      );
      return;
    }
    if (!defaultCard) {
      setPayErr("No default card selected.");
      return;
    }
    if (!String(defaultCard.stripeSourceId || "")) {
      setPayErr(
        "Your default card has no stripeSourceId saved. Delete the card and add it again."
      );
      return;
    }

    try {
      setPaying(true);
      const data = await apiPayNow({ requestId, bidId: bidIdFromRoute });
      setPayOk(data?.message || "Payment successful");

      if (data?.receiptId) {
        setTimeout(() => navigate(`/receipt/${data.receiptId}`), 600);
      }
    } catch (e) {
      setPayErr(String(e?.message || "Payment failed"));
    } finally {
      setPaying(false);
    }
  }

  const payDisabled =
    paying ||
    !bidIdFromRoute ||
    !requestId ||
    !defaultCard ||
    !String(defaultCard?.stripeSourceId || "");

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${Galactic1})` }}
    >
      <div className="min-h-screen w-full bg-black/40 backdrop-blur-[1px] pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-semibold">Back</span>
            </button>

            <div className="text-white font-bold tracking-wide">Payment Methods</div>

            <div className="w-20" />
          </div>

          {/* Cards */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-6">
            <div className="flex items-center gap-2 text-white/90 font-semibold">
              <CreditCard className="w-5 h-5" />
              Saved Cards
            </div>

            {loadingCards ? (
              <div className="mt-4 text-white/70 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading cards...
              </div>
            ) : null}

            {cardsErr ? <div className="mt-4 text-red-400 text-sm">{cardsErr}</div> : null}

            {!loadingCards && cards.length === 0 ? (
              <div className="mt-4 text-white/60 text-sm">No cards saved.</div>
            ) : null}

            <div className="mt-4 grid gap-3">
              {cards.map((c) => {
                const last4 = String(c?.last4 || "");
                return (
                  <div
                    key={c._id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0a1c]/60 p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white/80" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white/90 text-sm font-semibold truncate">
                          {(c.brand || "CARD").toUpperCase()} •••• {last4}
                        </div>
                        <div className="text-xs text-white/60">
                          Exp{" "}
                          {c.exp_month ? String(c.exp_month).padStart(2, "0") : "--"}/
                          {c.exp_year ? String(c.exp_year).slice(-2) : "--"}
                          {c.isDefault ? " • Default" : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!c.isDefault ? (
                        <button
                          onClick={() => setDefault(c)}
                          disabled={busyKey === `default-${last4}` || !last4}
                          className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition disabled:opacity-50"
                        >
                          {busyKey === `default-${last4}` ? "..." : "Make Default"}
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          Default
                        </div>
                      )}

                      <button
                        onClick={() => del(c)}
                        disabled={busyKey === `delete-${last4}` || !last4}
                        className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition disabled:opacity-50"
                        title="Delete card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Card form */}
            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-white/80 text-sm font-semibold">Add a new card</div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <CardElement
                  options={{
                    style: {
                      base: {
                        color: "#fff",
                        fontSize: "16px",
                        "::placeholder": { color: "rgba(255,255,255,0.5)" },
                      },
                      invalid: { color: "#ff6b6b" },
                    },
                  }}
                />
              </div>

              <button
                onClick={() => addNewCard(true)}
                disabled={adding || !stripe || !elements}
                className="mt-4 w-full md:w-auto px-4 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-black font-semibold transition disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Card"}
              </button>
            </div>
          </div>

          {/* Pay Now */}
          {bidIdFromRoute ? (
            <>
              <div className="rounded-2xl border border-white/20 bg-[#0b0a1c]/88 backdrop-blur-md p-6 mt-6">
                <div className="text-white/90 font-semibold">Pay Now</div>

                {!requestId ? (
                  <div className="mt-3 text-yellow-300 text-sm">
                    Missing requestId. Go back to offers and click{" "}
                    <span className="text-white/90 font-semibold">Proceed to Payment</span>.
                  </div>
                ) : null}

                {payErr ? <div className="mt-3 text-red-400 text-sm">{payErr}</div> : null}
                {payOk ? <div className="mt-3 text-emerald-300 text-sm">{payOk}</div> : null}

                {/* Desktop button */}
                <div className="mt-4 hidden md:block">
                  <button
                    onClick={payNow}
                    disabled={payDisabled}
                    className="w-full md:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition disabled:opacity-50"
                  >
                    {paying ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              </div>

              {/* Mobile fixed bottom bar */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9998] border-t border-white/10 bg-[#0b0a1c]/92 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 pt-3 pb-[env(safe-area-inset-bottom)]">
                  <button
                    onClick={payNow}
                    disabled={payDisabled}
                    className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition disabled:opacity-50"
                  >
                    {paying ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
