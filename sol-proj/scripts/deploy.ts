import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  // Deploy Voting contract
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  const deployedAddress = await voting.getAddress();
  console.log("Voting deployed to:", deployedAddress);

  // Save contract address and ABI to JSON for frontend
  const votingData = {
    address: deployedAddress,
    abi: JSON.parse(
      fs.readFileSync("./artifacts/contracts/Voting.sol/Voting.json", "utf8")
    ).abi,
  };

  if (!fs.existsSync("./lib")) {
    fs.mkdirSync("./lib");
  }

  fs.writeFileSync("./lib/Voting.json", JSON.stringify(votingData, null, 2));
  console.log("Voting contract info saved to ./lib/Voting.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



