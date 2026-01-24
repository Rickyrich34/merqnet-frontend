import React from "react";
import { useNavigate } from "react-router-dom";
import { Target, Swords, Trophy } from "lucide-react";
import logopic2 from "../assets/logopic2.png";

const Home = () => {
  const navigate = useNavigate();

  const handleEnter = () => {
    const token =
      localStorage.getItem("token") || localStorage.getItem("userToken");
    navigate(token ? "/dashboard" : "/login");
  };

  return (
    <div className="min-h-[100svh] bg-[#05040b] text-white overflow-hidden pt-24 pb-24">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#05040b]" />
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(900px 700px at 55% 35%, rgba(255,140,0,0.10), transparent 60%), radial-gradient(900px 700px at 45% 55%, rgba(255,0,200,0.08), transparent 62%), radial-gradient(900px 700px at 58% 60%, rgba(0,200,255,0.08), transparent 64%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 1; }
          50% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes floaty {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulseGlow {
          0% { filter: drop-shadow(0 0 14px rgba(34,211,238,0.20)); }
          50% { filter: drop-shadow(0 0 22px rgba(34,211,238,0.38)); }
          100% { filter: drop-shadow(0 0 14px rgba(34,211,238,0.20)); }
        }
      `}</style>

      <main className="max-w-3xl mx-auto px-4">
        <section className="min-h-[calc(100svh-12rem)] flex items-center justify-center">
          <div className="w-full text-center">

            {/* TITLE – same gold gradient as Navbar */}
            <h1
              className="
                text-5xl sm:text-7xl font-black tracking-tight
                bg-gradient-to-r from-yellow-200 via-amber-400 to-orange-500
                bg-clip-text text-transparent
                drop-shadow-[0_6px_30px_rgba(0,0,0,0.65)]
              "
            >
              MerqNet
            </h1>

            {/* Tagline */}
            <div className="mt-4 flex justify-center">
              <div className="relative inline-flex items-center justify-center px-5 py-2 rounded-full border border-white/12 bg-white/[0.04] backdrop-blur shadow-[0_18px_55px_rgba(0,0,0,0.65)] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 w-1/2 opacity-60"
                  style={{
                    animation: "shimmer 2.8s ease-in-out infinite",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), rgba(34,211,238,0.14), transparent)",
                  }}
                />
                <span className="relative text-[11px] sm:text-sm font-black tracking-[0.22em] uppercase text-white/95">
                  <span className="text-cyan-200">The buyer</span> is in control.
                </span>
                <span className="absolute left-2 text-cyan-300/60 font-black">[</span>
                <span className="absolute right-2 text-cyan-300/60 font-black">]</span>
              </div>
            </div>

            {/* Dog */}
            <div className="mt-6 flex justify-center">
              <div className="relative w-[280px] sm:w-[430px] max-w-full">
                <div className="absolute -inset-12 rounded-full blur-3xl opacity-45 bg-gradient-to-r from-fuchsia-500/25 via-orange-400/22 to-cyan-400/22" />
                <img
                  src={logopic2}
                  alt="MerqNet"
                  className="relative w-full h-auto select-none"
                  draggable="false"
                  style={{ animation: "floaty 4.2s ease-in-out infinite" }}
                />
              </div>
            </div>

            {/* Mission steps */}
            <div className="mt-6 flex justify-center">
              <div className="relative w-full max-w-[520px] px-4 py-4 rounded-2xl border border-white/10 bg-[#0B001F]/45 shadow-[0_20px_70px_rgba(0,0,0,0.65)]">
                <div className="absolute -inset-8 rounded-3xl blur-2xl opacity-35 bg-gradient-to-r from-amber-400/18 via-fuchsia-500/14 to-cyan-400/16" />

                <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
                  <span className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                    <Target className="w-4 h-4 text-cyan-200" />
                    <span className="font-extrabold text-sm sm:text-base">REQUEST</span>
                  </span>

                  <span className="hidden sm:inline text-white/35 font-black">—</span>

                  <span className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                    <Swords className="w-4 h-4 text-fuchsia-200" />
                    <span className="font-extrabold text-sm sm:text-base text-cyan-200">
                      VENDORS COMPETE
                    </span>
                  </span>

                  <span className="hidden sm:inline text-white/35 font-black">—</span>

                  <span className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                    <Trophy className="w-4 h-4 text-amber-300" />
                    <span className="font-extrabold text-sm sm:text-base text-amber-300">
                      YOU SAVE
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-7 flex justify-center">
              <button
                onClick={handleEnter}
                className="relative w-[260px] rounded-xl px-10 py-3 font-extrabold tracking-[0.20em] uppercase border border-cyan-200/55 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.22)] hover:border-cyan-200/75 hover:bg-cyan-400/15 transition"
                style={{ animation: "pulseGlow 2.6s ease-in-out infinite" }}
              >
                ENTER
              </button>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
