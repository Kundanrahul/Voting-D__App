"use client";

import { useState, useEffect } from "react";
import { getVotingContract } from "../../../lib/Voting";
import CandidateCard from "../../components/CandidateCard";
import { ethers } from "ethers";

interface Candidate {
  name: string;
  image: string;
  voteCount: number;
}

export default function Admin() {
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // ✅ Voting Time States
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [currentPhase, setCurrentPhase] = useState("");

  // ✅ Fetch all candidates + timing
  const fetchCandidates = async () => {
    try {
      const contract = await getVotingContract();
      if (!contract) return;

      const total = await contract.totalCandidates();
      const arr: Candidate[] = [];

      for (let i = 0; i < total; i++) {
        const c = await contract.getCandidate(i);
        arr.push({
          name: c[0],
          image: c[1],
          voteCount: Number(c[2]),
        });
      }

      // ✅ Fetch timing info
      const start = await contract.startTime();
      const end = await contract.endTime();
      const now = Math.floor(Date.now() / 1000);

      let phase = "";
      if (Number(start) === 0 && Number(end) === 0) phase = "Not Set";
      else if (now < Number(start)) phase = "Voting Not Started";
      else if (now >= Number(start) && now <= Number(end)) phase = "Voting In Progress";
      else phase = "Voting Ended";

      setStartTime(new Date(Number(start) * 1000).toISOString().slice(0, 16));
      setEndTime(new Date(Number(end) * 1000).toISOString().slice(0, 16));
      setCurrentPhase(phase);
      setCandidates(arr);
    } catch (err: any) {
      console.error("Error fetching candidates:", err.message);
      setStatus(err.message);
    }
  };

  // ✅ Connect wallet and check admin
  const connectWallet = async () => {
    try {
      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        setStatus("Connect MetaMask first.");
        return;
      }

      const connectedWallet = accounts[0];
      setWalletAddress(connectedWallet);

      const contract = await getVotingContract();
      if (!contract) return;

      const adminAddress = await contract.admin();
      const isUserAdmin = adminAddress.toLowerCase() === connectedWallet.toLowerCase();
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) await fetchCandidates();
    } catch (err: any) {
      console.error("❌ Wallet connection error:", err.message);
      setStatus("❌ " + err.message);
    }
  };

  // ✅ Auto-refresh
  useEffect(() => {
    if (walletAddress && isAdmin) {
      fetchCandidates();
      const interval = setInterval(fetchCandidates, 50000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, isAdmin]);

  // ✅ Add new candidate
  const addCandidate = async () => {
    if (!name || !image) {
      setStatus("Please fill in both name and image URL");
      return;
    }

    try {
      const contract = await getVotingContract();
      if (!contract) return;

      const tx = await contract.addCandidate(name, image);
      await tx.wait();

      setStatus("✅ Candidate added!");
      setName("");
      setImage("");

      fetchCandidates();
    } catch (err: any) {
      console.error("Error adding candidate:", err.message);
      setStatus(err.message);
    }
  };

  // ✅ Update voting schedule
  const updateVotingTimes = async () => {
    try {
      if (!startTime || !endTime) {
        setStatus("Please select both start and end time");
        return;
      }

      const contract = await getVotingContract();
      if (!contract) return;

      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

      if (endTimestamp <= startTimestamp) {
        setStatus("End time must be after start time");
        return;
      }

      const tx = await contract.setVotingPeriod(startTimestamp, endTimestamp);
      await tx.wait();

      setStatus("✅ Voting schedule updated!");
      fetchCandidates();
    } catch (err: any) {
      console.error("Error updating times:", err.message);
      setStatus(err.message);
    }
  };

  // --- UI ---
  if (!walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <button
          onClick={connectWallet}
          className="px-6 py-3 rounded-lg bg-indigo-500 hover:bg-indigo-600 font-bold"
        >
          Connect Wallet
        </button>
        {status && <p className="mt-4 text-red-400 font-semibold text-center">{status}</p>}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl font-semibold">
          You are not the admin of this voting contract ❌.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {/* Add Candidate Form */}
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Candidate</h2>

        <input
          type="text"
          placeholder="Candidate Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
        />
        <input
          type="text"
          placeholder="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
        />

        <button
          onClick={addCandidate}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-bold shadow-lg hover:scale-105 transition-all"
        >
          Add Candidate
        </button>

        {status && (
          <p
            className={`mt-4 text-center font-semibold ${
              status.startsWith("✅") ? "text-green-400" : "text-red-400"
            }`}
          >
            {status}
          </p>
        )}
      </div>

      {/* ✅ Voting Schedule Section */}
      <div className="mt-10 max-w-md mx-auto bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Set Voting Schedule</h2>

        <label className="block mb-2 text-gray-300">Start Time:</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
        />

        <label className="block mb-2 text-gray-300">End Time:</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none"
        />

        <button
          onClick={updateVotingTimes}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 text-white font-bold shadow-lg hover:scale-105 transition-all"
        >
          Update Schedule
        </button>

        <p className="mt-4 text-center text-gray-400 font-medium">
          Current Phase:{" "}
          <span className="text-indigo-400 font-semibold">{currentPhase}</span>
        </p>
      </div>

      {/* Candidates List */}
      <h2 className="text-2xl font-bold mt-10 mb-4 text-center">Candidates</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {candidates.length === 0 && (
          <p className="text-gray-400 text-center col-span-full">
            No candidates yet.
          </p>
        )}

        {candidates.map((c, index) => (
          <CandidateCard
            key={index}
            name={c.name}
            image={c.image}
            voteCount={c.voteCount}
            onRemove={async () => {
              try {
                const contract = await getVotingContract();
                if (!contract) return;

                const tx = await contract.removeCandidate(index);
                await tx.wait();

                setStatus(`✅ Removed ${c.name}`);
                fetchCandidates();
              } catch (err: any) {
                console.error("❌ Remove failed:", err.message);
                setStatus("❌ " + err.message);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

