import { ethers } from "ethers";
import VotingJSON from "../../sol-proj/lib/Voting.json";

// MetaMask-connected contract (Sepolia)

export async function getVotingContract() {
  if (typeof window === "undefined") return null;
  try {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    await provider.send("eth_requestAccounts", []); // request user accounts
    const signer = await provider.getSigner();

    const contract = new ethers.Contract(VotingJSON.address, VotingJSON.abi, signer);

    console.log("🔹 Connected contract address:", VotingJSON.address);
    console.log("🔹 Current network:", await provider.getNetwork());
    console.log("🔹 Connected wallet:", await signer.getAddress());

    return contract;
  } catch (err: any) {
    console.error("Failed to get contract:", err.message);
    return null;
  }
}
// Read-only provider (for non-MetaMask / display only)

export async function getReadOnlyContract() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL);
    const contract = new ethers.Contract(VotingJSON.address, VotingJSON.abi, provider);
    return contract;
  } catch (err) {
    console.error("Failed to get read-only contract:", err);
    return null;
  }
}

//Fetch all candidates
export async function getCandidates() {
  const contract = await getVotingContract();
  if (!contract) return [];

  try {
    const total = await contract.totalCandidates();
    const candidates = [];
    for (let i = 0; i < total; i++) {
      const c = await contract.getCandidate(i); // returns [name, image, voteCount]
      candidates.push({
        index: i,
        name: c[0],
        image: c[1],
        voteCount: Number(c[2]),
      });
    }
    console.log("Updated candidates:", candidates);
    return candidates;
  } catch (err) {
    console.error("Error fetching candidates:", err);
    return [];
  }
}
//Check if a wallet has voted
export async function getVoterStatus(address: string) {
  const contract = await getVotingContract();
  if (!contract) return null;

  try {
    const voter = await contract.voters(address);
    return {
      voted: voter.voted,
      voteIndex: Number(voter.voteIndex),
    };
  } catch (err) {
    console.error("Error fetching voter status:", err);
    return null;
  }
}
// Cast a vote
export async function voteForCandidate(index: number) {
  const contract = await getVotingContract();
  if (!contract) throw new Error("Connect MetaMask first⚠️");

  try {
    const tx = await contract.vote(index);
    console.log("🗳️ Voting tx sent:", tx.hash);
    await tx.wait();
    console.log("Vote confirmed!");
    return true;
  } catch (err: any) {
    console.error("Vote failed:", err.message);
    throw err;
  }
}
//Admin: add candidate

export async function addCandidate(name: string, image: string) {
  const contract = await getVotingContract();
  if (!contract) throw new Error("Connect MetaMask first");

  try {
    const tx = await contract.addCandidate(name, image);
    console.log("👤 Adding candidate tx:", tx.hash);
    await tx.wait();
    console.log("Candidate added!");
    return true;
  } catch (err: any) {
    console.error("Error adding candidate:", err.message);
    throw err;
  }
}

//Get admin address
export async function getAdmin() {
  const contract = await getVotingContract();
  if (!contract) return null;

  try {
    const admin = await contract.admin();
    console.log("Admin address:", admin);
    return admin;
  } catch (err) {
    console.error("Error fetching admin:", err);
    return null;
  }
}

