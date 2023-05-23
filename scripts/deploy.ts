import { ethers } from "hardhat";

async function main() {
  let token0 = "", token1 = "";
  const [owner] = await ethers.getSigners();
  const AMM = await ethers.getContractFactory("AMM", owner);
  let amm = await AMM.deploy(token0, token1);
  console.log(`amm deploy to ${amm.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
