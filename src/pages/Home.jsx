import React from "react";
import { useNavigate } from "react-router-dom";
import logopic2 from "../assets/logopic2.png";

const Home = () => {
  const navigate = useNavigate();

  // ONE CTA ONLY: ENTER
  // If logged in -> dashboard, else -> login
  const handleEnter = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("userToken");
    navigate(token ? "/dashboard" : "/login");
  };

  return (
    <div
      className="
        text-white overflow-hidden
        [min-height:100svh]
        bg-[#05040b]
        pt-[calc(5.5rem+env(safe-area-inset-top))]
        pb-[calc(7.5rem+env(safe-area-inset-bottom))]
      "
    >
      {/* Minimal background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#05040b]" />
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(900px 700px at 45% 18%, rgba(255,80,200,0.10), transparent 60%), radial-gradient(900px 700px at 55% 60%, rgba(0,180,255,0.10), transparent 62%), radial-gradient(900px 700px at 55% 42%, rgba(255,170,0,0.07), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />
      </div>

      <main className="max-w-xl mx-auto px-4">
        {/* Use flex + 100svh so ENTER is visible without scroll on mobile */}
        <section className="min-h-[calc(100svh-13rem)] flex items-center justify-center">
          <div className="w-full text-center">
            {/* MERQNET title */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-orange-400">
                MERQ
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-orange-400 to-orange-500">
                NET
              </span>
            </h1>

            {/* GAME TAGLINE (video-game style) */}
            <div className="mt-3 flex justify-center">
              <div
                className="
                  relative inline-flex items-center gap-2
                  px-4 py-2 rounded-full
                  border border-white/10
                  bg-white/[0.03] backdrop-blur
                  shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_14px_45px_rgba(0,0,0,0.55)]
                "
              >
                {/* glow */}
                <div className="pointer-events-none absolute -inset-6 rounded-full blur-2xl opacity-55 bg-gradient-to-r from-fuchsia-500/20 via-cyan-400/18 to-amber-400/18" />
                {/* tiny pulse dot */}
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                </span>

                <p
                  className="
                    relative text-sm sm:text-base font-extrabold tracking-wide
                    text-transparent bg-clip-text
                    bg-gradient-to-r from-white via-cyan-200 to-white
                    [text-shadow:0_0_14px_rgba(34,211,238,0.35)]
                  "
                >
                  The buyer is in control.
                </p>
              </div>
            </div>

            {/* BIG dog/logo - scale down on mobile so the CTA stays visible */}
            <div className="mt-4 flex justify-center">
              <div className="relative w-[280px] sm:w-[430px] max-w-full">
                <div className="absolute -inset-10 rounded-full blur-3xl opacity-55 bg-gradient-to-r from-fuchsia-500/25 via-orange-400/20 to-cyan-400/20" />
                <img
                  src={logopic2}
                  alt="MerqNet neon dog"
                  className="relative w-full h-auto select-none"
                  draggable="false"
                />
              </div>
            </div>

            {/* 3-step line (mission steps style) */}
            <div className="mt-4 flex justify-center">
              <div
                className="
                  relative inline-flex items-center justify-center
                  gap-2 sm:gap-3
                  px-4 py-2 rounded-xl
                  border border-white/10
                  bg-[#0B001F]/35
                  shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_16px_55px_rgba(0,0,0,0.6)]
                "
              >
                <div className="pointer-events-none absolute -inset-6 rounded-2xl blur-2xl opacity-45 bg-gradient-to-r from-amber-400/18 via-fuchsia-500/14 to-cyan-400/16" />

                <span className="relative text-sm sm:text-base font-extrabold tracking-wide text-white/95 [text-shadow:0_0_16px_rgba(255,255,255,0.18)]">
                  Request
                </span>

                <span className="relative text-white/25 font-black select-none">—</span>

                <span className="relative text-sm sm:text-base font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-200 [text-shadow:0_0_18px_rgba(34,211,238,0.25)]">
                  Vendors compete
                </span>

                <span className="relative text-white/25 font-black select-none">—</span>

                <span className="relative text-sm sm:text-base font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-orange-400 [text-shadow:0_0_18px_rgba(251,191,36,0.25)]">
                  You save
                </span>
              </div>
            </div>

            {/* Single CTA */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleEnter}
                className="relative w-[260px] rounded-xl px-10 py-3 font-extrabold tracking-wide
                           border border-cyan-200/55 bg-cyan-400/10
                           shadow-[0_0_30px_rgba(34,211,238,0.22)]
                           hover:border-cyan-200/75 hover:bg-cyan-400/15 hover:shadow-[0_0_38px_rgba(34,211,238,0.28)]
                           transition"
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
