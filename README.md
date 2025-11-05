# On-Chain Voting DApp

> **Please claim your free Sepolia ETH from a faucet before voting.**  
> Your transaction hash will be recorded, and each wallet can vote **only once**.  
>  
> Happy Voting!

---

## Overview

This project demonstrates a fully on-chain voting system built on the Ethereum Sepolia Testnet.  

It enables users to:

- Connect their crypto wallet (MetaMask or WalletConnect)  
- View live voting status and remaining time  
- Cast a single secure vote per wallet  
- See real-time vote distribution in an interactive chart  
- Allow admins to add or manage candidates directly through the smart contract  

Built with Next.js, Ethers.js, Solidity, and Web3Modal, this DApp works seamlessly across both desktop and mobile browsers.

---

## Features

- Wallet Integration – Connect using MetaMask or WalletConnect  
- Live Vote Tracking – Real-time updates with chart visualization  
- One-Vote-Per-User Enforcement – Prevents multiple votes from the same wallet  
- Voting Timer – Displays when voting starts and ends dynamically  
- Admin Dashboard – Add or manage candidates securely on-chain  
- Mobile Friendly – Works smoothly on mobile Chrome (WalletConnect enabled)

---

## Tech Stack

| Layer | Technology |
|:------|:------------|
| Smart Contract | Solidity |
| Blockchain | Ethereum (Sepolia Testnet) |
| Frontend | Next.js + TypeScript |
| Wallet Integration | Web3Modal + WalletConnect |
| UI Styling | TailwindCSS |
| Charts | ApexCharts |

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/voting-dapp.git
cd voting-dapp

