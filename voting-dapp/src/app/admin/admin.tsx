"use client";

import { useState, useEffect } from "react";
import {  connectWallet as connectWalletLib, disconnectWallet as disconnectWalletLib } from "../../../lib/Voting";
import CandidateCard from "../../components/CandidateCard";
import { FaWallet } from "react-icons/fa";

interface Candidate {
  name: string;
  image: string;
  voteCount: number;
}

export default function Admin() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [contract, setContract] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [currentPhase, setCurrentPhase] = useState("");

  // ✅ Connect Wallet
  const connectWallet = async () => {
    try {
      const result = await connectWalletLib();
      if (!result) return;

      setWalletAddress(result.address);
      setContract(result.contract);
      setWalletConnected(true);

      const adminAddr = await result.contract.admin();
      const isUserAdmin = adminAddr.toLowerCase() === result.address.toLowerCase();
      setIsAdmin(isUserAdmin);

      if (isUserAdmin) {
        setStatus("✅ Admin connected");
        fetchCandidates(result.contract);
      } else {
        setStatus("❌ You are not the admin");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // ✅ Disconnect Wallet
  const disconnectWallet = () => {
    disconnectWalletLib();
    setWalletConnected(false);
    setWalletAddress(null);
    setContract(null);
    setIsAdmin(false);
    setCandidates([]);
    setStatus("🔌 Wallet disconnected.");
  };

  // ✅ Fetch candidates + voting times
  const fetchCandidates = async (contractInstance?: any) => {
    try {
      const contractToUse = contractInstance || contract;
      if (!contractToUse) return;

      const total = Number(await contractToUse.totalCandidates());
      const arr: Candidate[] = [];
      for (let i = 0; i < total; i++) {
        const [name, image, voteCount] = await contractToUse.getCandidate(i);
        arr.push({ name, image, voteCount: Number(voteCount) });
      }
      setCandidates(arr);

      // Voting times
      const start = Number(await contractToUse.startTime());
      const end = Number(await contractToUse.endTime());
      const now = Math.floor(Date.now() / 1000);

      let phase = "";
      if (start === 0 && end === 0) phase = "Not Set";
      else if (now < start) phase = "Voting Not Started";
      else if (now >= start && now <= end) phase = "Voting In Progress";
      else phase = "Voting Ended";

      setStartTime(new Date(start * 1000).toISOString().slice(0, 16));
      setEndTime(new Date(end * 1000).toISOString().slice(0, 16));
      setCurrentPhase(phase);
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // ✅ Add candidate
  const addCandidate = async () => {
    if (!name || !image) return setStatus("Fill both name and image URL");
    try {
      const tx = await contract.addCandidate(name, image);
      await tx.wait();
      setStatus("✅ Candidate added!");
      setName("");
      setImage("");
      fetchCandidates();
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // ✅ Update voting times
  const updateVotingTimes = async () => {
    if (!startTime || !endTime) return setStatus("Select both start and end times");
    try {
      const startTs = Math.floor(new Date(startTime).getTime() / 1000);
      const endTs = Math.floor(new Date(endTime).getTime() / 1000);
      if (endTs <= startTs) return setStatus("End time must be after start time");

      const tx = await contract.setVotingPeriod(startTs, endTs);
      await tx.wait();
      setStatus("✅ Voting schedule updated!");
      fetchCandidates();
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // ✅ Remove candidate
  const removeCandidate = async (index: number, name: string) => {
    try {
      const tx = await contract.removeCandidate(index);
      await tx.wait();
      setStatus(`✅ Removed ${name}`);
      fetchCandidates();
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // Auto-refresh candidates
  useEffect(() => {
    if (walletConnected && isAdmin) {
      fetchCandidates();
      const interval = setInterval(fetchCandidates, 50000);
      return () => clearInterval(interval);
    }
  }, [walletConnected, isAdmin]);

  // --- UI ---
  if (!walletConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
        <button
          onClick={connectWallet}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg transition-transform hover:scale-105"
        >
          <FaWallet /> Connect Wallet
        </button>
        {status && <p className="mt-4 text-center text-red-400 font-semibold">{status}</p>}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
        <p className="text-xl font-semibold text-center">You are not the admin ❌</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10">
      {/* Wallet Info */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 bg-gray-800 bg-opacity-90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-gray-700 min-w-[180px] sm:min-w-[220px]">
        <div className="flex items-center flex-1 gap-2 truncate">
          <FaWallet className="text-green-300" />
          <span className="truncate text-sm sm:text-base font-medium text-green-300">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-3 py-1 bg-red-400 hover:bg-red-300 text-red-900 hover:text-red-950 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all"
        >
          🔌
        </button>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {/* Add Candidate */}
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Candidate</h2>
        <input
          type="text"
          placeholder="Candidate Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="text"
          placeholder="Image URL"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={addCandidate}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-bold shadow-lg hover:scale-105 transition-all"
        >
          Add Candidate
        </button>
        {status && (
          <p className={`mt-4 text-center font-semibold ${status.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
            {status}
          </p>
        )}
      </div>

      {/* Voting Schedule */}
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Set Voting Schedule</h2>
        <label className="block mb-2 text-gray-300">Start Time:</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <label className="block mb-2 text-gray-300">End Time:</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          onClick={updateVotingTimes}
          className="w-full py-2 rounded-lg bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 text-white font-bold shadow-lg hover:scale-105 transition-all"
        >
          Update Schedule
        </button>
        <p className="mt-4 text-center text-gray-400 font-medium">
          Current Phase: <span className="text-indigo-400 font-semibold">{currentPhase}</span>
        </p>
      </div>

      {/* Candidates List */}
      <h2 className="text-2xl font-bold mt-8 mb-4 text-center">Candidates</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {candidates.length === 0 && <p className="text-gray-400 text-center col-span-full">No candidates yet.</p>}
        {candidates.map((c, index) => (
          <CandidateCard
            key={index}
            name={c.name}
            image={c.image}
            voteCount={c.voteCount}
            onRemove={() => removeCandidate(index, c.name)}
          />
        ))}
      </div>
    </div>
  );
}


