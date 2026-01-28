import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mobile-first Seller Dashboard for MerqNet
// Shows buyer requests as cards with:
// buyer name, rating, product, qty, category, delivery notes
// bidding state: no offers yet | lowest offer + winning | lowest offer + outbid

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("userToken");

      const res = await fetch(`${import.meta.env.VITE_API_URL}/requests/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setRequests(data || []);
    } catch (err) {
      console.error("Failed loading seller requests", err);
    }
  }

  const filtered = requests.filter((r) =>
    r.productName?.toLowerCase().includes(search.toLowerCase()) ||
    r.buyerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-24 pt-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-1">Seller Dashboard</h1>
        <p className="text-sm text-gray-400 mb-6">Browse buyer requests and submit your offers.</p>

        {/* Search */}
        <div className="flex items-center gap-2 mb-6 bg-[#0f0a1a] rounded-xl px-3 py-2 border border-purple-900">
          <Search size={18} className="text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>

        {/* Requests */}
        <div className="space-y-4">
          {filtered.map((req) => (
            <RequestCard key={req._id} request={req} onBid={() => navigate(`/submitbid/${req._id}`)} />
          ))}

          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">No active requests found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestCard({ request, onBid }) {
  const lowest = request.lowestOffer;
  const myStatus = request.myBidStatus; // "winning" | "outbid" | null

  return (
    <Card className="bg-gradient-to-br from-[#12091f] to-[#050208] border border-yellow-500/30 shadow-xl">
      <CardContent className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-yellow-400">{request.buyerName}</span>
            <span className="text-xs text-gray-400">⭐ {request.buyerRating}/10</span>
          </div>

          <h3 className="text-lg font-semibold">{request.productName}</h3>

          <div className="text-xs text-gray-400 mt-1">
            Qty: {request.quantity} • {request.category}
          </div>

          {request.description && (
            <div className="text-xs text-gray-500 mt-1">{request.description}</div>
          )}

          <div className="mt-3 text-sm">
            {!lowest && <span className="text-gray-400">No offers yet</span>}

            {lowest && myStatus === "winning" && (
              <span className="text-green-400">Lowest Offer: ${lowest} • Winning</span>
            )}

            {lowest && myStatus === "outbid" && (
              <span className="text-red-400">Lowest Offer: ${lowest} • Outbid</span>
            )}

            {lowest && !myStatus && (
              <span className="text-cyan-400">Lowest Offer: ${lowest}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="text-yellow-400 font-bold text-xl">${request.targetPrice}</div>

          <Button
            onClick={onBid}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl px-5"
          >
            Make Offer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
