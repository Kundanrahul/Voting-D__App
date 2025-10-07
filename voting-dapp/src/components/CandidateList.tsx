"use client";

import React, { useEffect, useState } from "react";
import CandidateCard from "./CandidateCard";
import { getReadOnlyContract } from "../../lib/Voting";

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
      const contract = await getReadOnlyContract();
      if (!contract) return;

      const totalBN = await contract.totalCandidates();
      const total = totalBN.toNumber?.() ?? Number(totalBN);
      const arr: Candidate[] = [];

      for (let i = 0; i < total; i++) {
        const c = await contract.getCandidate(i);
        arr.push({
          name: c[0],
          image: c[1],
          voteCount: c[2].toNumber?.() ?? Number(c[2]),
        });
      }
      setCandidates(arr);

      // Check if user already voted
      if ((window as any).ethereum) {
        const accounts: string[] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        const voter = await contract.voters(accounts[0]);
        if (voter.voted) setVotedIndex(voter.voteIndex.toNumber?.() ?? Number(voter.voteIndex));
      }
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // Vote function
  const voteForCandidate = async (index: number) => {
    try {
      if (!(window as any).ethereum) {
        setStatus("❌ Connect your wallet first!");
        return;
      }

      const provider = new (window as any).ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = await getReadOnlyContract();
      const contractWithSigner = contract.connect(signer);

      const tx = await contractWithSigner.vote(index);
      await tx.wait();

      setVotedIndex(index);
      setStatus("✅ Vote cast successfully!");
      fetchCandidates(); // Refresh votes
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
        <p
          className={`text-center font-semibold ${
            status.startsWith("✅") ? "text-green-400" : "text-red-400"
          }`}
        >
          {status}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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

