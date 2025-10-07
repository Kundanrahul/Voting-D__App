"use client";

import { useState, useEffect } from "react";
import { getVotingContract } from "../../lib/Voting";
import CandidateCard from "../components/CandidateCard";
import dynamic from "next/dynamic";

// Dynamically import chart to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function Home() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [voteId, setVoteId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Voting time & phase
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [phase, setPhase] = useState<string>("");

  const COLORS = ["#82ca9d", "#8884d8", "#ff8042", "#ff6384", "#36a2eb", "#ffcd56"];

  // Fetch candidates + voting info
  const fetchCandidates = async () => {
    try {
      const contract = await getVotingContract();
      if (!contract) return;

      const totalBN = await contract.totalCandidates();
      const total = totalBN.toNumber?.() ?? Number(totalBN);

      const arr = [];
      for (let i = 0; i < total; i++) {
        const [name, image, voteCount] = await contract.getCandidate(i);
        arr.push({
          name,
          image,
          voteCount: voteCount.toNumber?.() ?? Number(voteCount),
        });
      }
      setCandidates(arr);

      // Voting times
      const start = await contract.startTime();
      const end = await contract.endTime();
      const now = Math.floor(Date.now() / 1000);
      setStartTime(Number(start));
      setEndTime(Number(end));

      if (Number(start) === 0 && Number(end) === 0) setPhase("Not Set");
      else if (now < Number(start)) setPhase("Not Started");
      else if (now >= Number(start) && now <= Number(end)) setPhase("In Progress");
      else setPhase("Ended");

      // Voter info
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const voter = await contract.voters(accounts[0]);
      if (voter.voted)
        setVotedIndex(voter.voteIndex.toNumber?.() ?? Number(voter.voteIndex));
    } catch (err: any) {
      console.error("Error fetching candidates:", err);
      setStatus("❌ " + err.message);
    }
  };

  // Countdown Timer: days, hours, minutes
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

      setTimeLeft(`${label} ${formatTime(diff)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  // Format seconds → Dd HHh MMm
  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    result += `${minutes}m`;

    return result;
  };

  const vote = async (index: number) => {
    try {
      const contract = await getVotingContract();
      if (!contract) {
        setStatus("❌ Connect MetaMask first.");
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now < startTime) {
        setStatus("❌ Voting has not started yet!");
        return;
      }
      if (now > endTime) {
        setStatus("❌ Voting has ended!");
        return;
      }

      const tx = await contract.vote(index);
      await tx.wait();

      setVoteId(tx.hash);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      setStatus("✅ Voted successfully!");
      setVotedIndex(index);
      fetchCandidates();
    } catch (err: any) {
      console.error("Vote error:", err);
      setStatus("❌ " + err.message);
    }
  };

  useEffect(() => {
    fetchCandidates();
    const interval = setInterval(fetchCandidates, 10000);
    return () => clearInterval(interval);
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
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white px-4 py-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 text-slate-300">
        VOTING DAPP 🗳️
      </h1>

      {/* Voting Timer */}
      {phase !== "Not Set" && (
        <div className="mb-6 flex flex-col items-center justify-center bg-gray-800 px-6 py-4 rounded-xl shadow-lg w-full max-w-md text-center">
          <p className="text-lg sm:text-sm md:text-xl font-semibold font-mono text-yellow-400 text-center">
       {timeLeft}
</p>

          <p className="text-sm text-gray-400 mt-1">Phase: {phase}</p>
        </div>
      )}

      {/* Status */}
      {status && (
        <p className={`mb-4 text-center text-sm sm:text-base font-semibold ${status.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
          {status}
        </p>
      )}

      {/* Toast */}
      <div className={`fixed top-5 right-5 bg-blue-600 text-white px-4 py-3 rounded shadow-lg transition-all duration-500 ${showToast ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[150%]"}`}>
        {voteId && <>✅ Vote ID: <strong>{voteId.slice(0, 10)}...</strong></>}
      </div>

      {candidates.length === 0 && <p className="text-gray-400 text-center text-sm sm:text-base"> </p>}

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
          <h2 className="text-lg font-semibold text-center mb-3">📊 Vote Distribution</h2>
          <Chart options={chartOptions} series={pieData} type="donut" width="100%" height="320" />
          <p className="text-center mt-2 text-gray-300 text-sm">
            Total Votes: <span className="text-indigo-400 font-bold">{totalVotes}</span>
          </p>
        </div>
      )}
    </div>
  );
}



