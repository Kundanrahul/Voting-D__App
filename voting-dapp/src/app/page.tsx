"use client";

import { useState, useEffect } from "react";
import {
  connectWallet,
  disconnectWallet as disconnectWalletLib,
  getReadOnlyContract,
} from "../../lib/Voting";
import CandidateCard from "../components/CandidateCard";
import dynamic from "next/dynamic";
import { FaWallet } from "react-icons/fa";
import { HiOutlineLogout } from "react-icons/hi";
import type { ApexOptions } from "apexcharts";

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

  const COLORS = ["#82ca9d", "#8884d8", "#ff8042", "#ff6384", "#36a2eb", "#ffcd56"];

  // ✅ Connect wallet (works across mobile/desktop)
  const handleConnectWallet = async () => {
    try {
      const result = await connectWallet();
      if (!result) return setStatus("❌ Wallet connection failed!");

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
    setStatus("🔌 Wallet disconnected");
  };

  // ✅ Fetch candidates
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
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // ✅ Fetch voter info
  const fetchVoterInfo = async (contractInstance?: any, address?: string) => {
    try {
      const contractToUse = contractInstance || contract;
      const userAddress = address || walletAddress;
      if (!contractToUse || !userAddress) return;

      const voter = await contractToUse.voters(userAddress);
      if (voter.voted)
        setVotedIndex(voter.voteIndex.toNumber?.() ?? Number(voter.voteIndex));
      else setVotedIndex(null);
    } catch (err: any) {
      console.error("Error fetching voter info:", err);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER");
    if (cached) handleConnectWallet();
  }, []);

  // ✅ Timer
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

  // ✅ Vote
  const vote = async (index: number) => {
    try {
      if (!contract || !walletConnected)
        return setStatus("❌ Connect wallet first!");

      const now = Math.floor(Date.now() / 1000);
      if (now < startTime) return setStatus("❌ Voting not started yet!");
      if (now > endTime) return setStatus("❌ Voting has ended!");

      const tx = await contract.vote(index);
      await tx.wait();

      setVoteId(tx.hash);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      setStatus("✅ Vote cast successfully!");
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

  // ✅ Chart setup
  const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
  const pieData = candidates.map((c) => c.voteCount);
  const pieLabels = candidates.map((c) => c.name);

  const chartOptions: ApexOptions = {
    chart: { type: "donut" },
    colors: COLORS,
    labels: pieLabels,
    legend: { show: true, position: "bottom", labels: { colors: "#fff" } },
    tooltip: { theme: "dark", y: { formatter: (val: number) => `${val} votes` } },
    dataLabels: { enabled: true, style: { fontSize: "12px", colors: ["#fff"] } },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: { show: true, label: "Votes", formatter: () => `${totalVotes}` },
          },
        },
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-4 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-center mb-6 tracking-wide">
        VOTING DAPP 🗳️
      </h1>

      {/* Wallet Button */}
      <div className="fixed top-4 right-4 z-50">
        {walletConnected ? (
          <div className="flex items-center gap-3 bg-gray-800 bg-opacity-90 px-4 py-2 rounded-xl shadow-lg border border-gray-700">
            <FaWallet className="text-green-300" />
            <span className="text-sm font-medium text-green-300 truncate">
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </span>
            <button
              onClick={handleDisconnectWallet}
              className="px-3 py-1 bg-red-400 hover:bg-red-300 text-red-900 rounded-lg text-xs font-semibold"
            >
              <HiOutlineLogout />
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectWallet}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl shadow-md text-sm font-semibold"
          >
            🔗 Connect Wallet
          </button>
        )}
      </div>

      {/* Timer */}
      {phase !== "Not Set" && (
        <div className="mb-6 bg-gray-800 px-6 py-4 rounded-xl shadow-lg text-center">
          <p className="text-lg sm:text-xl font-semibold text-yellow-400">{timeLeft}</p>
          <p className="text-sm text-gray-400 mt-1">Phase: {phase}</p>
        </div>
      )}

      {/* Status */}
      {status && (
        <p
          className={`mb-4 text-center font-semibold ${
            status.startsWith("✅") ? "text-green-400" : "text-red-400"
          }`}
        >
          {status}
        </p>
      )}

      {/* ✅ Centered Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 place-items-center w-full max-w-6xl mb-10">
        {candidates.map((c, i) => (
          <CandidateCard
            key={i}
            name={c.name}
            image={c.image}
            voteCount={c.voteCount}
            voted={votedIndex === i}
            onVote={phase === "In Progress" && votedIndex === null ? () => vote(i) : undefined}
          />
        ))}
      </div>

      {/* Chart */}
      {candidates.length > 0 && totalVotes > 0 && (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-2xl mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-center mb-3">
            📊 Vote Distribution
          </h2>
          <Chart options={chartOptions} series={pieData} type="donut" width="100%" height="320" />
        </div>
      )}
    </div>
  );
}










