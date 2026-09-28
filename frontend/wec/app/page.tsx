"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Wallet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Coins,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const Navbar = ({ isConnected, onConnect }: any) => (
  <nav className="sticky top-0 z-50 w-full bg-[#FFF8F3]/90 backdrop-blur-md border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-20">
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center cursor-pointer">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mr-3">
            <span className="text-[#FFF8F3] font-bold text-xl tracking-tighter">
              W
            </span>
          </div>
          <span className="font-bold text-2xl text-black tracking-tight">
            WEC
          </span>
        </div>

        {/* Connect Wallet Button */}
        <div>
          <button
            onClick={onConnect}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-all duration-200 shadow-md active:scale-95"
          >
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                0x4A...2f9B
              </>
            ) : (
              <>
                <Wallet size={18} />
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </nav>
);

const PresaleCard = () => {
  const [wecAmount, setWecAmount] = useState("");
  const [usdCost, setUsdCost] = useState(0);
  const WEC_PRICE = 0.01;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || Number(val) >= 0) {
      setWecAmount(val);
      setUsdCost(val === "" ? 0 : Number(val) * WEC_PRICE);
    }
  };

  const handlePurchase = (currency: any) => {
    if (!wecAmount || Number(wecAmount) <= 0) {
      alert("Please enter a valid amount of WEC.");
      return;
    }
    // In a real app, this would trigger a smart contract transaction
    console.log(
      `Initiating purchase of ${wecAmount} WEC with ${currency}. Total cost: $${usdCost.toFixed(
        2,
      )}`,
    );
    alert(
      `Mock Transaction Started: Buying ${wecAmount} WEC for $${usdCost.toFixed(
        2,
      )} ${currency}`,
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#FFF8F3] rounded-full opacity-50 blur-2xl"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">
              Buy WEC Token
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              Join the exclusive presale
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#FFF8F3] px-3 py-1 rounded-full border border-gray-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-black uppercase tracking-wider">
              Live
            </span>
          </div>
        </div>

        {/* Exchange Rate Info */}
        <div className="bg-[#FFF8F3] rounded-xl p-4 mb-6 border border-gray-100 flex items-center justify-between">
          <span className="text-gray-600 font-medium text-sm">
            Current Price
          </span>
          <span className="text-black font-bold text-lg">1 WEC = $0.01</span>
        </div>

        {/* Input Section */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Amount (WEC)
            </label>
            <div className="relative">
              <input
                type="number"
                value={wecAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 text-black text-lg rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                  <span className="text-[#FFF8F3] font-bold text-xs">W</span>
                </div>
                <span className="font-bold text-gray-700">WEC</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="text-gray-300 rotate-90" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              You Pay (USD)
            </label>
            <div className="relative">
              <input
                type="text"
                value={`$${usdCost.toFixed(2)}`}
                disabled
                className="w-full bg-gray-50 border border-gray-200 text-black font-semibold text-lg rounded-xl px-4 py-3.5 opacity-80"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                USD
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handlePurchase("USDT")}
            className="group flex flex-col items-center justify-center bg-black text-white rounded-xl py-3 px-4 hover:bg-gray-800 transition-all duration-200 active:scale-95 shadow-md"
          >
            <span className="text-xs text-gray-400 font-medium mb-1">
              Buy with
            </span>
            <span className="inline-flex items-center gap-2 font-bold text-lg group-hover:text-green-400 transition-colors">
              <Image
                src="/images/usdt.jpg"
                alt="Logo USDT"
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
              USDT
            </span>
          </button>
          <button
            onClick={() => handlePurchase("USDC")}
            className="group flex flex-col items-center justify-center bg-black text-white rounded-xl py-3 px-4 hover:bg-gray-800 transition-all duration-200 active:scale-95 shadow-md"
          >
            <span className="text-xs text-gray-400 font-medium mb-1">
              Buy with
            </span>
            <span className="inline-flex items-center gap-2 font-bold text-lg group-hover:text-blue-400 transition-colors">
              <Image
                src="/images/usdc.jpg"
                alt="Logo USDC"
                width={24}
                height={24}
                className="h-6 w-6 rounded-full object-cover"
              />
              USDC
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Transactions are secured and encrypted.
        </p>
      </div>
    </div>
  );
};

const Hero = () => (
  <div className="relative pt-20 pb-32 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
        {/* Hero Text */}
        <div className="lg:col-span-6 text-center lg:text-left mb-16 lg:mb-0">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-8">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            <span className="text-sm font-semibold text-black uppercase tracking-wide">
              Wec is Live
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-black tracking-tight mb-6 leading-tight">
            The Future of <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">
              Web3 Economy
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            WEC is the next-generation utility token designed to power a
            decentralized ecosystem. Get in early during our exclusive presale
            phase before public launch.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <a
              href="#about"
              className="flex items-center justify-center w-full sm:w-auto gap-2 bg-white text-black border-2 border-black px-8 py-3.5 rounded-full font-bold hover:bg-black hover:text-white transition-all duration-300"
            >
              Read Whitepaper
              <ChevronRight size={18} />
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 border-t border-gray-200 pt-8">
            <div>
              <div className="text-2xl font-black text-black">1B</div>
              <div className="text-sm text-gray-500 font-medium">
                Total Supply
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-black">100%</div>
              <div className="text-sm text-gray-500 font-medium">
                For Presale
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-black">$10M+</div>
              <div className="text-sm text-gray-500 font-medium">
                Target Cap
              </div>
            </div>
          </div>
        </div>

        {/* Presale Box */}
        <div className="lg:col-span-6 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-gray-200 to-white rounded-[2.5rem] transform rotate-3 scale-105 opacity-50 blur-lg"></div>
          <PresaleCard />
        </div>
      </div>
    </div>
  </div>
);

const About = () => (
  <div id="about" className="bg-white py-24 border-t border-gray-100">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
          Why Choose WEC?
        </h2>
        <p className="text-gray-600 text-lg">
          Our token is built on solid fundamentals, offering real utility and
          governance rights within our expansive ecosystem.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            icon: <ShieldCheck size={32} className="text-black" />,
            title: "Secure & Audited",
            desc: "Smart contracts are fully audited by top-tier security firms ensuring your funds are safe.",
          },
          {
            icon: <Zap size={32} className="text-black" />,
            title: "Lightning Fast",
            desc: "Built on a high-performance network allowing for near-instantaneous transactions.",
          },
          {
            icon: <Coins size={32} className="text-black" />,
            title: "Real Yield",
            desc: "Stake your WEC tokens to earn protocol fees and participate in governance.",
          },
        ].map((feature, idx) => (
          <div
            key={idx}
            className="bg-[#FFF8F3] rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-black mb-3">
              {feature.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Footer = () => (
  <footer className="bg-black py-12 text-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="w-8 h-8 bg-[#FFF8F3] rounded-full flex items-center justify-center mr-3">
            <span className="text-black font-bold text-lg tracking-tighter">
              W
            </span>
          </div>
          <span className="font-bold text-xl tracking-tight text-[#FFF8F3]">
            WEC Token
          </span>
        </div>

        <div className="flex gap-6 text-sm text-gray-400">
          <a href="#" className="hover:text-white transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Audits
          </a>
        </div>
      </div>
      <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} WEC Foundation. All rights reserved.
      </div>
    </div>
  </footer>
);

export default function App() {
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    // Mock wallet connection toggle
    setIsConnected(!isConnected);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F3] font-sans selection:bg-black selection:text-[#FFF8F3]">
      <Navbar isConnected={isConnected} onConnect={handleConnect} />
      <main>
        <Hero />
        <About />
      </main>
      <Footer />
    </div>
  );
}
