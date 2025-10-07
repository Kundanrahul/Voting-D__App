import { ethers } from "ethers";
import VotingJSON from "../../sol-proj/lib/Voting.json";
import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3Modal from "web3modal";

// ✅ Web3Modal instance setup
let web3Modal: Web3Modal;

if (typeof window !== "undefined") {
  web3Modal = new Web3Modal({
    cacheProvider: true,
    providerOptions: {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID, // required for WalletConnect
        },
      },
    },
    theme: "dark",
  });
}

// ✅ Global references
let signer: ethers.Signer | null = null;
let walletContract: ethers.Contract | null = null;
let walletAddress: string | null = null;

// ✅ Connect wallet (supports MetaMask + WalletConnect)
export async function connectWallet(): Promise<{ contract: ethers.Contract; address: string } | null> {
  if (typeof window === "undefined") return null;

  try {
    // 🔹 Prompt user for wallet selection
    const providerInstance = await web3Modal.connect();

    // 🔹 Listen for account or network changes
    providerInstance.on("accountsChanged", () => window.location.reload());
    providerInstance.on("chainChanged", () => window.location.reload());
    providerInstance.on("disconnect", disconnectWallet);

    // 🔹 Create ethers provider
    const provider = new ethers.BrowserProvider(providerInstance);

    // 🔹 Request wallet access
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    walletAddress = await signer.getAddress();

    // 🔹 Initialize contract
    walletContract = new ethers.Contract(VotingJSON.address, VotingJSON.abi, signer);

    console.log("✅ Wallet connected:", walletAddress);
    console.log("📜 Contract:", VotingJSON.address);

    return { contract: walletContract, address: walletAddress };
  } catch (err: any) {
    console.error("⚠️ Wallet connection failed:", err.message);
    return null;
  }
}

// ✅ Disconnect wallet
export function disconnectWallet() {
  if (typeof window === "undefined") return;
  try {
    if (web3Modal) {
      web3Modal.clearCachedProvider();
    }
  } catch (err) {
    console.warn("Error clearing cached provider:", err);
  }

  signer = null;
  walletContract = null;
  walletAddress = null;

  console.log("🔌 Wallet disconnected.");
}

// ✅ Get connected wallet contract
export async function getWalletContract(): Promise<{ contract: ethers.Contract; address: string } | null> {
  if (walletContract && signer && walletAddress) return { contract: walletContract, address: walletAddress };
  return await connectWallet();
}

// ✅ Read-only contract (Infura)
export async function getReadOnlyContract(): Promise<ethers.Contract | null> {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_INFURA_SEPOLIA_URL);
    return new ethers.Contract(VotingJSON.address, VotingJSON.abi, provider);
  } catch (err) {
    console.error("Error creating read-only contract:", err);
    return null;
  }
}

// ✅ Fetch candidates
export async function getCandidates(): Promise<any[]> {
  try {
    const wc = await getWalletContract();
    const contract = wc?.contract || (await getReadOnlyContract());
    if (!contract) return [];

    const total = await contract.totalCandidates();
    const candidates = [];

    for (let i = 0; i < total; i++) {
      const c = await contract.getCandidate(i);
      candidates.push({
        index: i,
        name: c[0],
        image: c[1],
        voteCount: Number(c[2]),
      });
    }
    return candidates;
  } catch (err) {
    console.error("Error fetching candidates:", err);
    return [];
  }
}

// ✅ Voter status
export async function getVoterStatus(address: string) {
  try {
    const wc = await getWalletContract();
    const contract = wc?.contract || (await getReadOnlyContract());
    if (!contract) return null;

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

// ✅ Cast a vote
export async function voteForCandidate(index: number) {
  const wc = await getWalletContract();
  if (!wc) throw new Error("⚠️ Please connect wallet first");

  try {
    const tx = await wc.contract.vote(index);
    console.log("🗳️ Voting transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Vote confirmed!");
    return true;
  } catch (err: any) {
    console.error("Vote failed:", err.message);
    throw err;
  }
}

// ✅ Add new candidate (admin)
export async function addCandidate(name: string, image: string) {
  const wc = await getWalletContract();
  if (!wc) throw new Error("⚠️ Connect wallet first");

  try {
    const tx = await wc.contract.addCandidate(name, image);
    await tx.wait();
    console.log("✅ Candidate added!");
    return true;
  } catch (err: any) {
    console.error("Error adding candidate:", err.message);
    throw err;
  }
}

// ✅ Get admin address
export async function getAdmin(): Promise<string | null> {
  try {
    const wc = await getWalletContract();
    const contract = wc?.contract || (await getReadOnlyContract());
    if (!contract) return null;

    const admin = await contract.admin();
    console.log("👑 Admin address:", admin);
    return admin;
  } catch (err) {
    console.error("Error fetching admin:", err);
    return null;
  }
}


