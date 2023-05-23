import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTransaction } from "ethers";
import { AMM, Token } from "../typechain-types/contracts";

describe("AMM", function () {

    var token0: Token, token1: Token, amm: AMM;

    async function unwrap(contractInvoke: Promise<ContractTransaction>) {
        const SUCCESS = 1;
        let tx = await contractInvoke;
        let receipt = await tx.wait();
        expect(receipt.status).to.be.equal(SUCCESS);
    }

    before(async function () {
        const [owner] = await ethers.getSigners();
        console.log("owner: " + owner.address);

        // prepare token0 and token1
        const TOKEN = await ethers.getContractFactory("Token", owner);
        token0 = await TOKEN.deploy("token0", "t0", ethers.utils.parseEther("1000000"));
        token1 = await TOKEN.deploy("token1", "t1", ethers.utils.parseEther("1000000"));
        console.log(`token0 deploy to ${token0.address}\ntoken1 deploy to ${token1.address}`);
        console.log(`owner balance: token0: ${ethers.utils.formatEther(await token0.balanceOf(owner.address))} token1: ${ethers.utils.formatEther(await token1.balanceOf(owner.address))}\n`);

        // prepare amm contract
        const AMM = await ethers.getContractFactory("AMM", owner);
        amm = await AMM.deploy(token0.address, token1.address);
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
        console.log(`amm initialized ${await amm.reserve0()} ${await amm.reserve1()}`);
    });

    it("deposit token0", async function () {
        const amount = ethers.utils.parseEther("10000");
        await unwrap(token0.approve(amm.address, amount));
        await unwrap(amm.deposit(token0.address, amount));
        expect(await amm.reserve0()).to.equal(ethers.utils.parseEther("20000"));
    });

    it("deposit token1", async function () {
        const amount = ethers.utils.parseEther("10000");
        await unwrap(token1.approve(amm.address, amount));
        await unwrap(amm.deposit(token1.address, amount));
        expect(await amm.reserve1()).to.equal(ethers.utils.parseEther("20000"));
    });

    it("withdraw token0", async function () {
        const amount = ethers.utils.parseEther("10000");
        await unwrap(amm.withdraw(token0.address, amount));
        expect(await amm.reserve0()).to.equal(ethers.utils.parseEther("10000"));
    });

    it("withdraw token1", async function () {
        const amount = ethers.utils.parseEther("10000");
        await unwrap(amm.withdraw(token1.address, amount));
        expect(await amm.reserve1()).to.equal(ethers.utils.parseEther("10000"));
    });

    it("swap token0", async function () {
        const [_, user] = await ethers.getSigners();
        const pay = ethers.utils.parseEther("1");
        await unwrap(token0.transfer(user.address, pay));
        await unwrap(token0.connect(user).approve(amm.address, pay));
        await unwrap(amm.connect(user).swap(token0.address, pay));
        const base = ethers.utils.parseEther("10000");
        expect(await token1.balanceOf(user.address)).to.equal(base.sub(await amm.reserve1()));
    });

    it("swap token1", async function () {
        const [_, user] = await ethers.getSigners();
        const pay = ethers.utils.parseEther("1");
        await unwrap(token1.transfer(user.address, pay));
        await unwrap(token1.connect(user).approve(amm.address, pay));
        await unwrap(amm.connect(user).swap(token1.address, pay));
        const base = ethers.utils.parseEther("10001");
        expect(await token0.balanceOf(user.address)).to.equal(base.sub(await amm.reserve0()));
    });
});
