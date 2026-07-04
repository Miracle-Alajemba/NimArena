import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NimArena with account:", deployer.address);

  // Deploy Mock tokens if address variables are not specified
  let usdtAddress = process.env.USDT_ADDRESS;
  if (!usdtAddress) {
    console.log("No USDT_ADDRESS env defined. Deploying MockUSDT...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDT = await MockERC20.deploy("Mock USDT", "USDT", 6);
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();
    console.log("Mock USDT deployed to:", usdtAddress);
  }

  let nimAddress = process.env.NIM_ADDRESS;
  if (!nimAddress) {
    console.log("No NIM_ADDRESS env defined. Deploying MockNIM...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockNIM = await MockERC20.deploy("Mock NIM", "NIM", 18);
    await mockNIM.waitForDeployment();
    nimAddress = await mockNIM.getAddress();
    console.log("Mock NIM deployed to:", nimAddress);
  }

  const PLATFORM_FEE_ADDRESS = process.env.PLATFORM_FEE_ADDRESS || deployer.address;
  const BACKEND_SIGNER = process.env.BACKEND_SIGNER_ADDRESS || deployer.address;

  console.log("USDT Address:", usdtAddress);
  console.log("NIM Address:", nimAddress);
  console.log("Platform fee address:", PLATFORM_FEE_ADDRESS);
  console.log("Backend signer:", BACKEND_SIGNER);

  const NimArena = await ethers.getContractFactory("NimArena");
  const arena = await NimArena.deploy(
    usdtAddress,
    nimAddress,
    PLATFORM_FEE_ADDRESS,
    BACKEND_SIGNER
  );

  await arena.waitForDeployment();
  const address = await arena.getAddress();
  console.log("NimArena deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
