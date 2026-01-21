// src/pages/MainDashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ReceiptText,
  Mail,
  Sparkles,
  Zap,
  ShoppingCart,
  Store,
  ChevronRight,
} from "lucide-react";

export default function MainDashboard() {
  const navigate = useNavigate();

  // Replace these with real data when ready (API / context / props)
  const stats = {
    receipts: 0,
    messages: 0,
    activeRequests: 3,
    liveBids: 5,
  };

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Cosmic background */}
      <div className="absolute inset-0">
        {/* Deep gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#13001f] to-black" />

        {/* Nebula blobs */}
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-3xl" />

        {/* Star noise overlay */}
        <div className="absolute inset-0 opacity-[0.22] mix-blend-screen pointer-events-none [background-image:radial-gradient(#ffffff55_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="absolute inset-0 opacity-[0.08] mix-blend-screen pointer-events-none [background-image:radial-gradient(#ffffff55_1px,transparent_1px)] [background-size:6px_6px]" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-[420px] px-5 pt-12 pb-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-fuchsia-300 via-violet-200 to-indigo-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(199,76,255,0.45)]">
              MerqNet
            </span>{" "}
            <span className="text-white/95 drop-shadow-[0_0_18px_rgba(199,76,255,0.35)]">
              Dashboard
            </span>
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Your command center for <span className="text-white/85">requests</span>,{" "}
            <span className="text-white/85">bids</span>, and{" "}
            <span className="text-white/85">messages</span>.
          </p>
        </div>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <StatCard
            icon={<ReceiptText className="h-5 w-5" />}
            label="Receipts"
            value={stats.receipts}
          />
          <StatCard
            icon={<Mail className="h-5 w-5" />}
            label="Messages"
            value={stats.messages}
          />
          <StatCard
            icon={<Sparkles className="h-5 w-5" />}
            label="Active Requests"
            value={stats.activeRequests}
          />
          <StatCard
            icon={<Zap className="h-5 w-5" />}
            label="Live Bids"
            value={stats.liveBids}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-8 space-y-4">
          <ActionButton
            title="Enter Buyer Mode"
            subtitle="Create requests, compare bids, choose the winner."
            icon={<ShoppingCart className="h-5 w-5" />}
            onClick={() => navigate("/buyer")}
          />
          <ActionButton
            title="Enter Seller Mode"
            subtitle="Bid on requests, manage sales, receipts."
            icon={<Store className="h-5 w-5" />}
            onClick={() => navigate("/seller")}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="relative rounded-2xl p-[1px]">
      {/* Glow border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-fuchsia-500/70 via-violet-500/70 to-indigo-500/70 blur-[10px] opacity-70" />
      <div className="relative rounded-2xl border border-white/10 bg-[#0b0613]/70 backdrop-blur-md px-4 py-4 shadow-[0_0_18px_rgba(170,76,255,0.18)]">
        <div className="flex items-center gap-2 text-white/85">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-[0_0_14px_rgba(180,90,255,0.20)]">
            {icon}
          </span>
          <span className="text-sm font-semibold">{label}</span>
        </div>

        <div className="mt-3 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_14px_rgba(199,76,255,0.25)]">
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full rounded-2xl p-[1px] text-left transition-transform active:scale-[0.99]"
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-fuchsia-500/80 via-violet-500/80 to-indigo-500/80 blur-[14px] opacity-75 transition-opacity group-hover:opacity-95" />
      <div className="relative flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#2a0a45]/70 via-[#160622]/70 to-[#0b0613]/70 px-5 py-5 backdrop-blur-md shadow-[0_0_22px_rgba(170,76,255,0.22)]">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-[0_0_16px_rgba(180,90,255,0.28)]">
          {icon}
        </div>

        <div className="flex-1">
          <div className="text-lg font-extrabold tracking-tight text-white">
            {title}
          </div>
          <div className="mt-1 text-xs text-white/70">{subtitle}</div>
        </div>

        <ChevronRight className="h-6 w-6 text-white/70 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
