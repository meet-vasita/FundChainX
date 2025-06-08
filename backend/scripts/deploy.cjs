const hre = require("hardhat");

async function main() {
  const FundChainX = await hre.ethers.getContractFactory("FundChainX");
  const fundChainX = await FundChainX.deploy();

  await fundChainX.waitForDeployment();

  console.log("FundChainX deployed to:", await fundChainX.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});