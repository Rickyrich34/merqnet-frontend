console.log("STRIPE ENV =", import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  CreditCard,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import Galactic1 from "../assets/Galactic1.png";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

/* ============================
   API helpers
============================ */
const API_BASE =
 import.meta.env.VITE_API_URL?.replace(/\/$/, "") 

function getToken() {
  return localStorage.getItem("userToken");
}

async function apiGetCards() {
  const res = await fetch(`${API_BASE}/api/payments/cards`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to load cards");
  return data?.cards || [];
}

async function apiAddCard(paymentMethodId) {
  const res = await fetch(`${API_BASE}/api/payments/cards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ paymentMethodId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to add card");
  return data;
}

async function apiSetDefault(card) {
  const res = await fetch(`${API_BASE}/api/payments/cards/default`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    // ✅ FIX: supports legacy stripeSourceId (card_), new stripePaymentMethodId (pm_), and mongo _id fallback
    body: JSON.stringify({
      stripePaymentMethodId: card.stripePaymentMethodId || null,
      stripeSourceId: card.stripeSourceId || null,
      cardId: card._id,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to set default");
  return data;
}

async function apiDeleteCard(card) {
  const res = await fetch(`${API_BASE}/api/payments/cards/${card._id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to delete card");
  return data;
}

async function apiGetSummary(bidId) {
  const res = await fetch(`${API_BASE}/api/payments/summary/${bidId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to load summary");
  return data;
}

async function apiPayNow(bidId) {
  const res = await fetch(`${API_BASE}/api/payments/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ bidId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Payment failed");
  return data;
}

/* ============================
   Main Component
============================ */
export default function PaymentMethods() {
  const navigate = useNavigate();
  const { bidId: bidIdFromRoute } = useParams();

  const stripePk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
  const stripePromise = useMemo(() => {
    if (!stripePk) return null;
    return loadStripe(stripePk);
  }, [stripePk]);

  // Show non-stripe version if key missing
  if (!stripePromise) {
    return <PaymentMethodsNoStripe bidIdFromRoute={bidIdFromRoute} navigate={navigate} />;
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodsStripe bidIdFromRoute={bidIdFromRoute} navigate={navigate} />
    </Elements>
  );
}

/* ============================
   No-Stripe fallback component
============================ */
function PaymentMethodsNoStripe({ bidIdFromRoute, navigate }) {
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsErr, setCardsErr] = useState("");

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryErr, setSummaryErr] = useState("");
  const [bid, setBid] = useState(null);
  const [request, setRequest] = useState(null);

  const [busyId, setBusyId] = useState("");
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [payOk, setPayOk] = useState("");

  const defaultCard = useMemo(
    () => cards.find((c) => c.isDefault) || null,
    [cards]
  );

  useEffect(() => {
    let alive = true;

    async function loadCards() {
      try {
        setLoadingCards(true);
        setCardsErr("");
        const list = await apiGetCards();
        if (!alive) return;
        setCards(list);
      } catch (e) {
        if (!alive) return;
        setCardsErr(String(e?.message || "Failed to load cards"));
      } finally {
        if (!alive) return;
        setLoadingCards(false);
      }
    }

    loadCards();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadSummary() {
      if (!bidIdFromRoute) return;
      try {
        setSummaryLoading(true);
        setSummaryErr("");
        const data = await apiGetSummary(bidIdFromRoute);
        if (!alive) return;
        setBid(data?.bid || null);
        setRequest(data?.request || null);
      } catch (e) {
        if (!alive) return;
        setSummaryErr(String(e?.message || "Failed to load summary"));
      } finally {
        if (!alive) return;
        setSummaryLoading(false);
      }
    }
    loadSummary();
    return () => {
      alive = false;
    };
  }, [bidIdFromRoute]);

  async function setDefault(card) {
    try {
      setBusyId(card._id);
      setCardsErr("");
      await apiSetDefault(card);
      const refreshed = await apiGetCards();
      setCards(refreshed);
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to set default"));
    } finally {
      setBusyId("");
    }
  }

  async function del(card) {
    try {
      setBusyId(card._id);
      setCardsErr("");
      await apiDeleteCard(card);
      const refreshed = await apiGetCards();
      setCards(refreshed);
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to delete"));
    } finally {
      setBusyId("");
    }
  }

  async function payNow() {
    if (!bidIdFromRoute) return;
    setPayErr("");
    setPayOk("");
    try {
      setPaying(true);
      const data = await apiPayNow(bidIdFromRoute);
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
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-semibold">Back</span>
            </button>

            <div className="text-white font-bold tracking-wide">
              Payment Methods
            </div>

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

            {cardsErr ? (
              <div className="mt-4 text-red-400 text-sm">{cardsErr}</div>
            ) : null}

            {!loadingCards && cards.length === 0 ? (
              <div className="mt-4 text-white/60 text-sm">
                No cards saved.
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              {cards.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0a1c]/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <div className="text-white/90 text-sm font-semibold">
                        {(c.brand || "CARD").toUpperCase()} •••• {c.last4}
                      </div>
                      <div className="text-xs text-white/60">
                        Exp {(c.exp_month ?? c.expMonth) ? String(c.exp_month ?? c.expMonth).padStart(2, "0") : "--"}/{(c.exp_year ?? c.expYear) ? String(c.exp_year ?? c.expYear).slice(-2) : "--"}
                        {c.isDefault ? " • Default" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!c.isDefault ? (
                      <button
                        onClick={() => setDefault(c)}
                        disabled={busyId === c._id}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition disabled:opacity-50"
                      >
                        {busyId === c._id ? "..." : "Make Default"}
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Default
                      </div>
                    )}

                    <button
                      onClick={() => del(c)}
                      disabled={busyId === c._id}
                      className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition disabled:opacity-50"
                      title="Delete card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Card note */}
            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-white/80 text-sm font-semibold">Add a new card</div>
              <div className="mt-2 text-xs text-white/60">
                Stripe is not available (missing publishable key). Add cards from a Stripe-enabled build.
              </div>
            </div>
          </div>

          {/* Pay Now */}
          {bidIdFromRoute && (
            <>
              <div className="rounded-2xl border border-white/20 bg-[#0b0a1c]/88 backdrop-blur-md p-6 mt-6">
                <div className="text-white/90 font-semibold">Pay Now</div>
                <div className="mt-2 text-xs text-white/60">
                  You must have a default card saved to complete payment.
                </div>

                {summaryErr ? <div className="mt-3 text-red-400 text-sm">{summaryErr}</div> : null}
                {payErr ? <div className="mt-3 text-red-400 text-sm">{payErr}</div> : null}
                {payOk ? <div className="mt-3 text-emerald-300 text-sm">{payOk}</div> : null}

                {/* Desktop button */}
                <div className="mt-4 hidden md:block">
                  <button
                    onClick={payNow}
                    disabled={
                      paying ||
                      summaryLoading ||
                      !bid ||
                      !request ||
                      !defaultCard ||
                      (!defaultCard.stripeSourceId && !defaultCard.stripePaymentMethodId)
                    }
                    className="w-full md:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition disabled:opacity-50"
                  >
                    {paying ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              </div>

              {/* ✅ MOBILE FIX: fixed bottom bar so Pay button is ALWAYS visible */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9998] border-t border-white/10 bg-[#0b0a1c]/92 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 pt-3 pb-[env(safe-area-inset-bottom)]">
                  <button
                    onClick={payNow}
                    disabled={
                      paying ||
                      summaryLoading ||
                      !bid ||
                      !request ||
                      !defaultCard ||
                      (!defaultCard.stripeSourceId && !defaultCard.stripePaymentMethodId)
                    }
                    className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition disabled:opacity-50"
                  >
                    {paying ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================
   Stripe-enabled component
============================ */
function PaymentMethodsStripe({ bidIdFromRoute, navigate }) {
  const stripe = useStripe();
  const elements = useElements();

  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsErr, setCardsErr] = useState("");

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryErr, setSummaryErr] = useState("");
  const [bid, setBid] = useState(null);
  const [request, setRequest] = useState(null);

  const [busyId, setBusyId] = useState("");
  const [adding, setAdding] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [payOk, setPayOk] = useState("");

  const defaultCard = useMemo(
    () => cards.find((c) => c.isDefault) || null,
    [cards]
  );

  useEffect(() => {
    let alive = true;

    async function loadCards() {
      try {
        setLoadingCards(true);
        setCardsErr("");
        const list = await apiGetCards();
        if (!alive) return;
        setCards(list);
      } catch (e) {
        if (!alive) return;
        setCardsErr(String(e?.message || "Failed to load cards"));
      } finally {
        if (!alive) return;
        setLoadingCards(false);
      }
    }

    loadCards();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadSummary() {
      if (!bidIdFromRoute) return;
      try {
        setSummaryLoading(true);
        setSummaryErr("");
        const data = await apiGetSummary(bidIdFromRoute);
        if (!alive) return;
        setBid(data?.bid || null);
        setRequest(data?.request || null);
      } catch (e) {
        if (!alive) return;
        setSummaryErr(String(e?.message || "Failed to load summary"));
      } finally {
        if (!alive) return;
        setSummaryLoading(false);
      }
    }
    loadSummary();
    return () => {
      alive = false;
    };
  }, [bidIdFromRoute]);

  async function addNewCard() {
    setCardsErr("");
    if (!stripe || !elements) {
      setCardsErr("Stripe is not ready yet.");
      return;
    }

    try {
      setAdding(true);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      });

      if (error) throw new Error(error.message || "Failed to create payment method");
      if (!paymentMethod?.id) throw new Error("Missing paymentMethod id");

      await apiAddCard(paymentMethod.id);
      const refreshed = await apiGetCards();
      setCards(refreshed);
      cardElement.clear();
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to add card"));
    } finally {
      setAdding(false);
    }
  }

  async function setDefault(card) {
    try {
      setBusyId(card._id);
      setCardsErr("");
      await apiSetDefault(card);
      const refreshed = await apiGetCards();
      setCards(refreshed);
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to set default"));
    } finally {
      setBusyId("");
    }
  }

  async function del(card) {
    try {
      setBusyId(card._id);
      setCardsErr("");
      await apiDeleteCard(card);
      const refreshed = await apiGetCards();
      setCards(refreshed);
    } catch (e) {
      setCardsErr(String(e?.message || "Failed to delete"));
    } finally {
      setBusyId("");
    }
  }

  async function payNow() {
    if (!bidIdFromRoute) return;
    setPayErr("");
    setPayOk("");

    try {
      setPaying(true);
      const data = await apiPayNow(bidIdFromRoute);
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
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-semibold">Back</span>
            </button>

            <div className="text-white font-bold tracking-wide">
              Payment Methods
            </div>

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

            {cardsErr ? (
              <div className="mt-4 text-red-400 text-sm">{cardsErr}</div>
            ) : null}

            {!loadingCards && cards.length === 0 ? (
              <div className="mt-4 text-white/60 text-sm">
                No cards saved.
              </div>
            ) : null}

            <div className="mt-4 grid gap-3">
              {cards.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0a1c]/60 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <div className="text-white/90 text-sm font-semibold">
                        {(c.brand || "CARD").toUpperCase()} •••• {c.last4}
                      </div>
                      <div className="text-xs text-white/60">
                        Exp {(c.exp_month ?? c.expMonth) ? String(c.exp_month ?? c.expMonth).padStart(2, "0") : "--"}/{(c.exp_year ?? c.expYear) ? String(c.exp_year ?? c.expYear).slice(-2) : "--"}
                        {c.isDefault ? " • Default" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!c.isDefault ? (
                      <button
                        onClick={() => setDefault(c)}
                        disabled={busyId === c._id}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold transition disabled:opacity-50"
                      >
                        {busyId === c._id ? "..." : "Make Default"}
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Default
                      </div>
                    )}

                    <button
                      onClick={() => del(c)}
                      disabled={busyId === c._id}
                      className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition disabled:opacity-50"
                      title="Delete card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
                    },
                  }}
                />
              </div>

              <button
                onClick={addNewCard}
                disabled={adding || !stripe || !elements}
                className="mt-4 w-full md:w-auto px-4 py-2 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-black font-semibold transition disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Card"}
              </button>
            </div>
          </div>

          {/* Pay Now */}
          {bidIdFromRoute && (
            <>
              <div className="rounded-2xl border border-white/20 bg-[#0b0a1c]/88 backdrop-blur-md p-6 mt-6">
                <div className="text-white/90 font-semibold">Pay Now</div>
                <div className="mt-2 text-xs text-white/60">
                  You must have a default card saved to complete payment.
                </div>

                {summaryErr ? <div className="mt-3 text-red-400 text-sm">{summaryErr}</div> : null}
                {payErr ? <div className="mt-3 text-red-400 text-sm">{payErr}</div> : null}
                {payOk ? <div className="mt-3 text-emerald-300 text-sm">{payOk}</div> : null}

                {/* Desktop button */}
                <div className="mt-4 hidden md:block">
                  <button
                    onClick={payNow}
                    disabled={
                      paying ||
                      summaryLoading ||
                      !bid ||
                      !request ||
                      !defaultCard ||
                      (!defaultCard.stripeSourceId && !defaultCard.stripePaymentMethodId)
                    }
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
                    disabled={
                      paying ||
                      summaryLoading ||
                      !bid ||
                      !request ||
                      !defaultCard ||
                      (!defaultCard.stripeSourceId && !defaultCard.stripePaymentMethodId)
                    }
                    className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition disabled:opacity-50"
                  >
                    {paying ? "Processing..." : "Pay Now"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
