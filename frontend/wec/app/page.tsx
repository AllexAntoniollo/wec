"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { formatUnits, isAddress } from "ethers";
import {
  Wallet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Coins,
  ChevronRight,
} from "lucide-react";
import {
  approve,
  connectWallet,
  debtValue,
  freeWithdraw,
  getAllowance,
  getRequiredPaymentAmount,
  getWalletBalances,
  isFreeWallet,
  parseTokenAmount,
  payDebt,
  PRESALE_ADDRESS,
  TOKEN_ADDRESSES,
  swap,
  type WalletBalances,
} from "../services/Web3Service";

interface NavbarProps {
  account: string | null;
  onConnect: () => Promise<void>;
}

const Navbar = ({ account, onConnect }: NavbarProps) => (
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
            onClick={() => void onConnect()}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-all duration-200 shadow-md active:scale-95"
          >
            {account ? (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
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

type PaymentToken = "USDT" | "USDC";

interface PresaleCardProps {
  account: string | null;
  balances: WalletBalances | null;
  error: string;
  onConnect: () => Promise<void>;
  onRefreshBalances: () => Promise<void>;
}

const PresaleCard = ({
  account,
  balances,
  error,
  onConnect,
  onRefreshBalances,
}: PresaleCardProps) => {
  const [wecAmount, setWecAmount] = useState("");
  const [usdCost, setUsdCost] = useState(0);
  const [sufficientAllowance, setSufficientAllowance] = useState({
    USDT: false,
    USDC: false,
  });
  const [processing, setProcessing] = useState<PaymentToken | null>(null);
  const [processingAction, setProcessingAction] = useState<
    "approve" | "swap" | null
  >(null);
  const [transactionError, setTransactionError] = useState("");
  const WEC_PRICE = 0.01;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || Number(val) >= 0) {
      setWecAmount(val);
      setUsdCost(val === "" ? 0 : Number(val) * WEC_PRICE);
      setSufficientAllowance({ USDT: false, USDC: false });
      setTransactionError("");
    }
  };

  useEffect(() => {
    if (!account || !wecAmount || Number(wecAmount) <= 0) {
      setSufficientAllowance({ USDT: false, USDC: false });
      return;
    }

    let isCurrent = true;
    const checkAllowances = async () => {
      try {
        const requiredAmount = await getRequiredPaymentAmount(wecAmount);
        const [usdtAllowance, usdcAllowance] = await Promise.all([
          getAllowance(TOKEN_ADDRESSES.USDT, PRESALE_ADDRESS, account),
          getAllowance(TOKEN_ADDRESSES.USDC, PRESALE_ADDRESS, account),
        ]);
        if (isCurrent) {
          setSufficientAllowance({
            USDT: usdtAllowance >= requiredAmount,
            USDC: usdcAllowance >= requiredAmount,
          });
        }
      } catch {
        if (isCurrent) {
          setSufficientAllowance({ USDT: false, USDC: false });
        }
      }
    };

    void checkAllowances();
    return () => {
      isCurrent = false;
    };
  }, [account, wecAmount]);

  const handlePurchase = async (currency: PaymentToken) => {
    if (
      !wecAmount ||
      !Number.isFinite(Number(wecAmount)) ||
      Number(wecAmount) <= 0
    ) {
      setTransactionError("Informe uma quantidade válida de WECR.");
      return;
    }

    if (!account) {
      await onConnect();
      return;
    }

    setProcessing(currency);
    setTransactionError("");
    try {
      const requiredAmount = await getRequiredPaymentAmount(wecAmount);
      const tokenAddress = TOKEN_ADDRESSES[currency];
      const allowance = await getAllowance(
        tokenAddress,
        PRESALE_ADDRESS,
        account,
      );

      if (allowance < requiredAmount) {
        setProcessingAction("approve");
        await approve(tokenAddress, PRESALE_ADDRESS, requiredAmount);
        const updatedAllowance = await getAllowance(
          tokenAddress,
          PRESALE_ADDRESS,
          account,
        );
        setSufficientAllowance((current) => ({
          ...current,
          [currency]: updatedAllowance >= requiredAmount,
        }));
        return;
      }

      setProcessingAction("swap");
      await swap(wecAmount, currency === "USDT");
      setSufficientAllowance((current) => ({
        ...current,
        [currency]: false,
      }));
      await onRefreshBalances();
    } catch (purchaseError) {
      setTransactionError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "A transação falhou. Tente novamente.",
      );
    } finally {
      setProcessing(null);
      setProcessingAction(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#FFF8F3] rounded-full opacity-50 blur-2xl"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black mb-1">
              Buy WECR Token
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
              Amount (WECR)
            </label>
            <div className="relative">
              <input
                type="number"
                value={wecAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full bg-gray-50 border border-gray-200 text-black text-lg rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
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
            onClick={() => void handlePurchase("USDT")}
            disabled={processing !== null || Number(wecAmount) <= 0}
            className="group flex flex-col items-center justify-center bg-black text-white rounded-xl py-3 px-4 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 active:scale-95 shadow-md"
          >
            <span className="text-xs text-gray-400 font-medium mb-1">
              {processing === "USDT"
                ? processingAction === "approve"
                  ? "Approving..."
                  : "Swapping..."
                : !account
                ? "Connect wallet"
                : sufficientAllowance.USDT
                ? "Swap with"
                : "Approve"}
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
            onClick={() => void handlePurchase("USDC")}
            disabled={processing !== null || Number(wecAmount) <= 0}
            className="group flex flex-col items-center justify-center bg-black text-white rounded-xl py-3 px-4 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 active:scale-95 shadow-md"
          >
            <span className="text-xs text-gray-400 font-medium mb-1">
              {processing === "USDC"
                ? processingAction === "approve"
                  ? "Approving..."
                  : "Swapping..."
                : !account
                ? "Connect wallet"
                : sufficientAllowance.USDC
                ? "Swap with"
                : "Approve"}
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

        <div className="mt-4 grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-gray-50 py-3 text-center">
          {[
            { symbol: "USDT", amount: balances?.usdt },
            { symbol: "USDC", amount: balances?.usdc },
            { symbol: "WECR", amount: balances?.wecr },
          ].map(({ symbol, amount }) => (
            <div key={symbol} className="min-w-0 px-2">
              <div className="text-xs font-semibold text-gray-500">
                {symbol}
              </div>
              <div className="mt-1 truncate text-sm font-bold text-black">
                {amount ?? "--"}
              </div>
            </div>
          ))}
        </div>

        {(transactionError || error) && (
          <p role="alert" className="mt-3 text-center text-sm text-red-600">
            {transactionError || error}
          </p>
        )}

        <p className="text-center text-xs text-gray-400 mt-5">
          {account
            ? "Transactions on the Polygon network"
            : "Connect your wallet to view your balances and purchase tokens."}
        </p>
      </div>
    </div>
  );
};

type HeroProps = PresaleCardProps;

const Hero = (props: HeroProps) => (
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
          <PresaleCard {...props} />
        </div>
      </div>
    </div>
  </div>
);

interface DebtManagementProps {
  account: string | null;
  refreshKey: number;
  onRefreshBalances: () => Promise<void>;
  onRefreshDebt: () => void;
}

const DebtManagement = ({
  account,
  refreshKey,
  onRefreshBalances,
  onRefreshDebt,
}: DebtManagementProps) => {
  const [debt, setDebt] = useState("0");
  const [debtLoading, setDebtLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [allowances, setAllowances] = useState({ USDT: false, USDC: false });
  const [processing, setProcessing] = useState<PaymentToken | null>(null);
  const [processingAction, setProcessingAction] = useState<
    "approve" | "payDebt" | null
  >(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!account) {
      setDebt("0");
      return;
    }

    let isCurrent = true;
    setDebtLoading(true);
    void debtValue(account)
      .then((value) => {
        if (isCurrent) setDebt(formatUnits(value, 18));
      })
      .catch((debtError) => {
        if (isCurrent) {
          setError(
            debtError instanceof Error
              ? debtError.message
              : "Não foi possível consultar a dívida.",
          );
        }
      })
      .finally(() => {
        if (isCurrent) setDebtLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [account, refreshKey]);

  useEffect(() => {
    if (
      !account ||
      !paymentAmount ||
      !Number.isFinite(Number(paymentAmount)) ||
      Number(paymentAmount) <= 0
    ) {
      setAllowances({ USDT: false, USDC: false });
      return;
    }

    let isCurrent = true;
    const checkAllowances = async () => {
      try {
        const [usdtAmount, usdcAmount] = await Promise.all([
          parseTokenAmount(TOKEN_ADDRESSES.USDT, paymentAmount),
          parseTokenAmount(TOKEN_ADDRESSES.USDC, paymentAmount),
        ]);
        const [usdtAllowance, usdcAllowance] = await Promise.all([
          getAllowance(TOKEN_ADDRESSES.USDT, PRESALE_ADDRESS, account),
          getAllowance(TOKEN_ADDRESSES.USDC, PRESALE_ADDRESS, account),
        ]);
        if (isCurrent) {
          setAllowances({
            USDT: usdtAllowance >= usdtAmount,
            USDC: usdcAllowance >= usdcAmount,
          });
        }
      } catch {
        if (isCurrent) setAllowances({ USDT: false, USDC: false });
      }
    };

    void checkAllowances();
    return () => {
      isCurrent = false;
    };
  }, [account, paymentAmount]);

  const handlePayDebt = async (currency: PaymentToken) => {
    if (
      !paymentAmount ||
      !Number.isFinite(Number(paymentAmount)) ||
      Number(paymentAmount) <= 0
    ) {
      setError("Informe um valor válido para pagar.");
      return;
    }

    if (!account) return;

    setProcessing(currency);
    setError("");
    try {
      const tokenAddress = TOKEN_ADDRESSES[currency];
      const amount = await parseTokenAmount(tokenAddress, paymentAmount);
      const allowance = await getAllowance(
        tokenAddress,
        PRESALE_ADDRESS,
        account,
      );

      if (allowance < amount) {
        setProcessingAction("approve");
        await approve(tokenAddress, PRESALE_ADDRESS, amount);
        const updatedAllowance = await getAllowance(
          tokenAddress,
          PRESALE_ADDRESS,
          account,
        );
        setAllowances((current) => ({
          ...current,
          [currency]: updatedAllowance >= amount,
        }));
        return;
      }

      setProcessingAction("payDebt");
      await payDebt(paymentAmount, currency === "USDT");
      setPaymentAmount("");
      setAllowances({ USDT: false, USDC: false });
      onRefreshDebt();
      await onRefreshBalances();
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Não foi possível pagar a dívida.",
      );
    } finally {
      setProcessing(null);
      setProcessingAction(null);
    }
  };

  if (!account) return null;

  return (
    <>
      <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-bold text-black">Account debt</h3>
        <p className="mt-0.5 text-xs text-gray-500">Pending balance</p>
        <div className="mt-5 flex items-baseline gap-2 border-t border-gray-100 pt-4">
          <div className="truncate text-2xl font-bold text-black">
            {debtLoading ? "..." : debt}
          </div>
          <div className="text-xs font-semibold text-gray-500">WECR</div>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-bold text-black">Pay debt</h3>
        <p className="mt-0.5 text-xs text-gray-500">Pay with USDT or USDC.</p>
        <p className="mt-2 text-xs font-medium text-gray-600">
          WECR deducted: {(Number(paymentAmount) / 0.01).toLocaleString()}
        </p>
        <label
          htmlFor="debt-payment-amount"
          className="mb-1.5 mt-3 block text-xs font-semibold text-gray-700"
        >
          Amount to pay (USD)
        </label>
        <input
          id="debt-payment-amount"
          type="number"
          min="0"
          step="any"
          value={paymentAmount}
          onChange={(event) => {
            setPaymentAmount(event.target.value);
            setError("");
          }}
          placeholder="0.00"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["USDT", "USDC"] as const).map((currency) => (
            <button
              key={currency}
              type="button"
              onClick={() => void handlePayDebt(currency)}
              disabled={processing !== null || debtLoading}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-black px-2 py-2 font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Image
                src={`/images/${currency.toLowerCase()}.jpg`}
                alt={`Logo ${currency}`}
                width={20}
                height={20}
                className="h-5 w-5 rounded-full object-cover"
              />
              <span className="text-left">
                <span className="block text-[10px] font-medium leading-tight text-gray-300">
                  {processing === currency
                    ? processingAction === "approve"
                      ? "Approving..."
                      : "Paying debt..."
                    : allowances[currency]
                    ? "Pay debt"
                    : "Approve"}
                </span>
                {currency}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </>
  );
};

interface FreeWalletWithdrawProps {
  account: string | null;
  onRefreshBalances: () => Promise<void>;
  onRefreshDebt: () => void;
}

const FreeWalletWithdraw = ({
  account,
  onRefreshBalances,
  onRefreshDebt,
}: FreeWalletWithdrawProps) => {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setTo(account ?? "");
    setAmount("");
    setError("");
  }, [account]);

  const handleWithdraw = async () => {
    const destination = to.trim();

    if (!isAddress(destination)) {
      setError("Please enter a valid destination address.");
      return;
    }
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid WECR amount.");
      return;
    }

    setProcessing(true);
    setError("");
    try {
      await freeWithdraw(destination, amount);
      setAmount("");
      onRefreshDebt();
      await onRefreshBalances();
    } catch (withdrawError) {
      setError(
        withdrawError instanceof Error
          ? withdrawError.message
          : "Withdrawal failed. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!account) return null;

  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-bold text-black">Free withdrawal</h3>
      <p className="mt-0.5 text-xs text-gray-500">Send WECR to an address.</p>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="free-withdraw-to"
            className="mb-1.5 block text-xs font-semibold text-gray-700"
          >
            Destination Address
          </label>
          <input
            id="free-withdraw-to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label
            htmlFor="free-withdraw-amount"
            className="mb-1.5 block text-xs font-semibold text-gray-700"
          >
            Amount (WECR)
          </label>
          <div className="relative">
            <input
              id="free-withdraw-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-black focus:border-transparent focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-100 bg-red-50 p-2"
          >
            <p className="text-center text-xs font-medium text-red-600">
              {error}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleWithdraw()}
          disabled={processing}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing ? "Processing..." : "Withdraw"}
        </button>
      </div>
    </div>
  );
};

interface FreeWalletSessionProps {
  account: string | null;
  refreshKey: number;
  onRefreshBalances: () => Promise<void>;
  onRefreshDebt: () => void;
}

const FreeWalletSession = ({
  account,
  refreshKey,
  onRefreshBalances,
  onRefreshDebt,
}: FreeWalletSessionProps) => {
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    setIsFree(false);
    if (!account) return;

    let isCurrent = true;
    void isFreeWallet(account)
      .then((result) => {
        if (isCurrent) setIsFree(result);
      })
      .catch(() => {
        if (isCurrent) setIsFree(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [account]);

  if (!account || !isFree) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">Free wallet</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Authorized
        </span>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DebtManagement
          account={account}
          refreshKey={refreshKey}
          onRefreshBalances={onRefreshBalances}
          onRefreshDebt={onRefreshDebt}
        />
        <FreeWalletWithdraw
          account={account}
          onRefreshBalances={onRefreshBalances}
          onRefreshDebt={onRefreshDebt}
        />
      </div>
    </section>
  );
};
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
  const [account, setAccount] = useState<string | null>(null);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [walletError, setWalletError] = useState("");
  const [debtRefreshKey, setDebtRefreshKey] = useState(0);

  const handleConnect = async () => {
    try {
      setWalletError("");
      const wallet = await connectWallet();
      if (wallet.chainId !== 80002) {
        throw new Error("Mude a carteira para a rede Polygon Amoy.");
      }
      setAccount(wallet.address);
      setBalances(await getWalletBalances(wallet.address));
    } catch (connectionError) {
      setWalletError(
        connectionError instanceof Error
          ? connectionError.message
          : "Não foi possível conectar a carteira.",
      );
    }
  };

  const handleRefreshBalances = async () => {
    if (account) setBalances(await getWalletBalances(account));
  };

  const handleRefreshDebt = () => {
    setDebtRefreshKey((current) => current + 1);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F3] font-sans selection:bg-black selection:text-[#FFF8F3]">
      <Navbar account={account} onConnect={handleConnect} />
      <main>
        <Hero
          account={account}
          balances={balances}
          error={walletError}
          onConnect={handleConnect}
          onRefreshBalances={handleRefreshBalances}
        />
        <FreeWalletSession
          account={account}
          refreshKey={debtRefreshKey}
          onRefreshBalances={handleRefreshBalances}
          onRefreshDebt={handleRefreshDebt}
        />
        <About />
      </main>
      <Footer />
    </div>
  );
}
