"use client";

import { useState, useEffect } from "react";
import { connectWallet, disconnectWallet as disconnectWalletLib, getReadOnlyContract } from "../../lib/Voting";
import CandidateCard from "../components/CandidateCard";
import dynamic from "next/dynamic";
import { FaWallet } from "react-icons/fa";
import { HiOutlineLogout } from "react-icons/hi";
import type { ApexOptions } from "apexcharts";
import { ethers } from "ethers";

// Dynamically import chart to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function Home() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [voteId, setVoteId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [contract, setContract] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [phase, setPhase] = useState<string>("");

  const [showMobilePrompt, setShowMobilePrompt] = useState(false);

  const COLORS = ["#82ca9d", "#8884d8", "#ff8042", "#ff6384", "#36a2eb", "#ffcd56"];

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // ------------------ Connect / Disconnect Wallet ------------------
  const handleConnectWallet = async () => {
    if (isMobile && !(window as any).ethereum) {
      setShowMobilePrompt(true);
      return;
    }

    try {
      const result = await connectWallet();
      if (!result) {
        setStatus("❌ Wallet connection failed!");
        return;
      }

      setContract(result.contract);
      setWalletAddress(result.address);
      setWalletConnected(true);
      setStatus("✅ Wallet connected!");

      fetchCandidates(result.contract);
      fetchVoterInfo(result.contract, result.address);
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  const handleDisconnectWallet = () => {
    disconnectWalletLib();
    setWalletConnected(false);
    setWalletAddress(null);
    setContract(null);
    setVotedIndex(null);
    setStatus("Wallet disconnected.");
  };

  // ------------------ Fetch Candidates ------------------
  const fetchCandidates = async (contractInstance?: any) => {
    try {
      const contractToUse = contractInstance || contract || (await getReadOnlyContract());
      if (!contractToUse) return;

      const totalBN = await contractToUse.totalCandidates();
      const total = totalBN.toNumber?.() ?? Number(totalBN);

      const arr = [];
      for (let i = 0; i < total; i++) {
        const [name, image, voteCount] = await contractToUse.getCandidate(i);
        arr.push({
          name,
          image,
          voteCount: voteCount.toNumber?.() ?? Number(voteCount),
        });
      }
      setCandidates(arr);

      const start = await contractToUse.startTime();
      const end = await contractToUse.endTime();
      const now = Math.floor(Date.now() / 1000);
      setStartTime(Number(start));
      setEndTime(Number(end));

      if (Number(start) === 0 && Number(end) === 0) setPhase("Not Set");
      else if (now < Number(start)) setPhase("Not Started");
      else if (now >= Number(start) && now <= Number(end)) setPhase("In Progress");
      else setPhase("Ended");
    } catch (err: any) {
      console.error("Error fetching candidates:", err);
      setStatus("❌ " + err.message);
    }
  };

  // ------------------ Fetch voter info ------------------
  const fetchVoterInfo = async (contractInstance?: any, address?: string) => {
    try {
      const contractToUse = contractInstance || contract;
      const userAddress = address || walletAddress;
      if (!contractToUse || !userAddress) return;

      const voter = await contractToUse.voters(userAddress);
      if (voter.voted) setVotedIndex(voter.voteIndex.toNumber?.() ?? Number(voter.voteIndex));
      else setVotedIndex(null);
    } catch (err: any) {
      console.error("Error fetching voter info:", err);
    }
  };

  // ------------------ Auto-reconnect / listeners ------------------
  useEffect(() => {
    (async () => {
      try {
        if ((window as any)?.ethereum) await handleConnectWallet();
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) handleDisconnectWallet();
      else handleConnectWallet();
    };
    (window as any).ethereum?.on?.("accountsChanged", handleAccountsChanged);
    return () => {
      (window as any).ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  // ------------------ Countdown Timer ------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (!startTime || !endTime) return;
      const now = Math.floor(Date.now() / 1000);
      let diff = 0;
      let label = "";

      if (now < startTime) {
        diff = startTime - now;
        label = "Starts in";
      } else if (now >= startTime && now <= endTime) {
        diff = endTime - now;
        label = "Ends in";
      } else {
        setTimeLeft("Voting Ended");
        return;
      }

      const days = Math.floor(diff / (3600 * 24));
      const hours = Math.floor((diff % (3600 * 24)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      let result = "";
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      result += `${minutes}m`;
      setTimeLeft(`${label} ${result}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  // ------------------ Vote ------------------
  const vote = async (index: number) => {
    try {
      if (!contract || !walletConnected) {
        setStatus("❌ Connect Wallet first.");
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now < startTime) return setStatus("❌ Voting has not started yet!");
      if (now > endTime) return setStatus("❌ Voting has ended!");

      const tx = await contract.vote(index);
      await tx.wait();

      setVoteId(tx.hash);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      setStatus("✅ Voted successfully!");
      setVotedIndex(index);

      fetchCandidates();
      fetchVoterInfo();
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  const pieData = candidates.map((c) => c.voteCount);
  const pieLabels = candidates.map((c) => c.name);

  const chartOptions = {
    chart: { type: "donut" },
    colors: COLORS,
    labels: pieLabels,
    legend: { show: true, position: "bottom", labels: { colors: "#fff" } },
    tooltip: { theme: "dark", y: { formatter: (val: number) => `${val} votes` } },
    dataLabels: { enabled: true, style: { fontSize: "12px", colors: ["#fff"] }, dropShadow: { enabled: false } },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: {
            show: true,
            total: { show: true, label: "Votes", formatter: () => `${totalVotes}`, color: "#fff" },
            value: { color: "#00e6ff", fontSize: "16px", fontWeight: 700 },
          },
        },
      },
    },
  }as const satisfies ApexOptions;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-4 py-8 font-sans">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 text-slate-300 tracking-wide">
        VOTING DAPP 🗳️
      </h1>

      {/* Wallet button */}
      <div className="fixed top-4 right-4 z-50">
        {walletConnected ? (
          <div className="flex items-center gap-3 bg-gray-800 bg-opacity-90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-700 min-w-[180px] sm:min-w-[220px]">
            <FaWallet className="text-green-300" />
            <span className="text-sm sm:text-base font-medium text-green-300 truncate">
              :{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </span>
            <button
              onClick={handleDisconnectWallet}
              className="px-3 py-1 bg-red-400 hover:bg-red-300 text-red-900 hover:text-red-950 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              <HiOutlineLogout />
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectWallet}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-md text-sm sm:text-base font-semibold transition-all"
          >
            🔗 Connect Wallet
          </button>
        )}
      </div>

      {/* Mobile prompt */}
      {showMobilePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl text-center shadow-lg w-11/12 max-w-sm">
            <h2 className="text-xl font-bold mb-4">Wallet not detected</h2>
            <p className="mb-4">
              To use this dApp on mobile, open it in a wallet browser like MetaMask, Trust Wallet, or Rainbow.
            </p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-semibold"
            >
              Install MetaMask
            </a>
            <button
              onClick={() => setShowMobilePrompt(false)}
              className="px-4 py-2 rounded bg-red-500 hover:bg-red-400 text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Voting Timer */}
      {phase !== "Not Set" && (
        <div className="mb-6 flex flex-col items-center justify-center bg-gray-800 px-6 py-4 rounded-xl shadow-lg w-full max-w-md text-center">
          <p className="text-lg sm:text-xl md:text-2xl font-semibold font-mono text-yellow-400 text-center">
            {timeLeft}
          </p>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Phase: {phase}</p>
        </div>
      )}

      {/* Status */}
      {status && (
        <p className={`mb-4 text-center text-sm sm:text-base font-semibold ${status.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
          {status}
        </p>
      )}

      {/* Toast */}
      <div
        className={`fixed top-20 right-5 bg-blue-600 text-white px-4 py-3 rounded shadow-lg transition-all duration-500 ${
          showToast ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[150%]"
        }`}
      >
        {voteId && (
          <>
            ✅ Vote ID: <strong>{voteId.slice(0, 10)}...</strong>
          </>
        )}
      </div>

      {/* Candidate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 place-items-center justify-center w-full max-w-6xl mb-10">
        {candidates.map((c, index) => (
          <CandidateCard
            key={index}
            name={c.name}
            image={c.image}
            voteCount={c.voteCount}
            voted={votedIndex === index}
            onVote={phase === "In Progress" && votedIndex === null ? () => vote(index) : undefined}
          />
        ))}
      </div>

      {/* Chart */}
      {candidates.length > 0 && totalVotes > 0 && (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-2xl mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-center mb-3">📊 Vote Distribution</h2>
          <Chart options={chartOptions} series={pieData} type="donut" width="100%" height="320" />
          <p className="text-center mt-2 text-gray-300 text-sm sm:text-base">
            Total Votes: <span className="text-indigo-400 font-bold">{totalVotes}</span>
          </p>
        </div>
      )}
    </div>
  );
}










