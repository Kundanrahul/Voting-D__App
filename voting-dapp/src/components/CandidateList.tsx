"use client";

import React, { useEffect, useState } from "react";
import { getVotingContract } from "../../lib/Voting";
import CandidateCard from "./CandidateCard";

interface Candidate {
  name: string;
  image: string;
  voteCount: number;
}

const CandidatesList: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  // Fetch candidates from contract
  const fetchCandidates = async () => {
    try {
      const contract = await getVotingContract();
      if (!contract) return;

      const rawCandidates = await contract.getCandidates();
      const formatted = rawCandidates.map((c: any) => ({
        name: c.name,
        image: c.image,
        voteCount: c.voteCount.toNumber ? c.voteCount.toNumber() : Number(c.voteCount),
      }));
      setCandidates(formatted);
      
      // Check if user already voted
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const voter = await contract.voters(accounts[0]);
      if (voter.voted) setVotedIndex(voter.voteIndex);
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };
  // Vote fn
  const voteForCandidate = async (index: number) => {
    try {
      const contract = await getVotingContract();
      if (!contract) return;

      const tx = await contract.vote(index);
      await tx.wait();

      setVotedIndex(index);
      setStatus("✅ Vote cast successfully!");
      fetchCandidates(); // Refresh vote counts
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };
  useEffect(() => {
    fetchCandidates();
  }, []);
  return (
    <div className="space-y-6">
      {status && (
        <p className={`text-center font-semibold ${status.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
          {status}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {candidates.map((c, i) => (
          <CandidateCard
            key={i}
            name={c.name}
            image={c.image}
            voteCount={c.voteCount}
            onVote={votedIndex === null ? () => voteForCandidate(i) : undefined}
            voted={votedIndex === i}
          />
        ))}
      </div>
    </div>
  );
};

export default CandidatesList;
