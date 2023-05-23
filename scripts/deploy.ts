import { ethers } from "hardhat";

async function main() {
    const [owner] = await ethers.getSigners();
    console.log("owner: " + owner.address);

    // prepare token0 and token1
    const TOKEN = await ethers.getContractFactory("Token", owner);
    let token0 = await TOKEN.deploy("token0", "t0", ethers.utils.parseEther("1000000"));
    let token1 = await TOKEN.deploy("token1", "t1", ethers.utils.parseEther("1000000"));
    console.log(`token0 deploy to ${token0.address}\ntoken1 deploy to ${token1.address}`);
    console.log(`owner balance: token0: ${ethers.utils.formatEther(await token0.balanceOf(owner.address))} token1: ${ethers.utils.formatEther(await token1.balanceOf(owner.address))}\n`);

    // prepare amm contract
    const AMM = await ethers.getContractFactory("AMM", owner);
    let amm = await AMM.deploy(token0.address, token1.address);
    console.log(`amm deploy to ${amm.address}`);

    // initialize amm contract
    let initialDeposit = ethers.utils.parseEther("10000");
    let tx = await token0.approve(amm.address, initialDeposit);
    await tx.wait();
    tx = await token1.approve(amm.address, initialDeposit);
    await tx.wait();
    console.log(ethers.utils.formatEther(await token0.allowance(owner.address, amm.address)));
    console.log(ethers.utils.formatEther(await token1.allowance(owner.address, amm.address)));
    tx = await amm.initialize(initialDeposit, initialDeposit);
    await tx.wait();
    console.log(`amm initialized ${ethers.utils.formatEther(await amm.reserve0())} ${ethers.utils.formatEther(await amm.reserve1())}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
