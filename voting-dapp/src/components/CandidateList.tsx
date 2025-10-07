"use client";

import React, { useEffect, useState } from "react";
import CandidateCard from "./CandidateCard";
import { getReadOnlyContract } from "../../lib/Voting"; // Your Voting contract helper
import { ethers } from "ethers";

interface Candidate {
  name: string;
  image: string;
  voteCount: number;
}

const CandidatesList: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votedIndex, setVotedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  // ✅ Fetch candidates & voter info
  const fetchCandidates = async () => {
    try {
      const contract: any = await getReadOnlyContract();
      if (!contract) {
        setStatus("❌ Contract not found!");
        return;
      }

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
      const accounts: string[] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        const voter = await contract.voters(accounts[0]);
        setVotedIndex(voter.voted ? (voter.voteIndex.toNumber?.() ?? Number(voter.voteIndex)) : null);
      }
    } catch (err: any) {
      console.error(err);
      setStatus("❌ " + err.message);
    }
  };

  // ✅ Vote function
  const voteForCandidate = async (index: number) => {
    try {
      if (!(window as any).ethereum) {
        setStatus("❌ Ethereum wallet not detected!");
        return;
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const contract: any = await getReadOnlyContract();
      if (!contract) {
        setStatus("❌ Contract not found!");
        return;
      }

      // Cast to any to avoid TypeScript BaseContract errors
      const contractWithSigner: any = contract.connect(signer);
      const tx = await contractWithSigner.vote(index);
      await tx.wait();

      setVotedIndex(index);
      setStatus("✅ Vote cast successfully!");
      fetchCandidates();
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

