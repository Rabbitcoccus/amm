import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";
import { ContractTransaction } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { AMM, Token } from "../typechain-types/";

describe("AMM", function () {

    var token0: Token, token1: Token, amm: AMM;
    var owner: SignerWithAddress, user: SignerWithAddress;

    async function unwrap(contractInvoke: Promise<ContractTransaction>) {
        const SUCCESS = 1;
        let tx = await contractInvoke;
        let receipt = await tx.wait();
        expect(receipt.status).to.be.equal(SUCCESS);
    }

    before(async function () {
        [owner, user] = await ethers.getSigners();
        console.log("owner: " + owner.address);

        if (hre.network.name === "sepolia") {
            token0 = await ethers.getContractAt("Token", "0x4C0fCeed7769ebd1831b53Cd2F3059EC1C13e135");
            token1 = await ethers.getContractAt("Token", "0x7bb376bD0855ce3FD847C0c61e42C36044f59845");
            amm = await ethers.getContractAt("AMM", "0x28DB425eE5E93a7838DFe18629053830fE406497");
            return;
        }
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
        console.log(`amm initialized ${ethers.utils.formatEther(await amm.reserve0())} ${ethers.utils.formatEther(await amm.reserve1())}`);
    });

    it("add liquidity", async function () {
        const provide = ethers.utils.parseEther("10000");
        await unwrap(token0.transfer(user.address, provide));
        await unwrap(token0.connect(user).approve(amm.address, provide));
        await unwrap(token1.transfer(user.address, provide));
        await unwrap(token1.connect(user).approve(amm.address, provide));
        console.log(`balance before add liquidity: token0=${await token0.balanceOf(user.address)} token1=${await token1.balanceOf(user.address)}`);
        await unwrap(amm.connect(user).addLiquidity(provide, provide));
        expect(await amm.reserve0()).to.equal(provide.mul(2));
        expect(await amm.balanceOf(user.address)).to.equal(provide);
        console.log(`balance after add liquidity: token0=${await token0.balanceOf(user.address)} token1=${await token1.balanceOf(user.address)}`);
    });

    it("swap token0", async function () {
        const pay = ethers.utils.parseEther("1");
        await unwrap(token0.transfer(user.address, pay));
        await unwrap(token0.connect(user).approve(amm.address, pay));
        await unwrap(amm.connect(user).swap(token0.address, pay));
        const base = ethers.utils.parseEther("20000");
        expect(await token1.balanceOf(user.address)).to.equal(base.sub(await amm.reserve1()));
    });

    it("swap token1", async function () {
        const pay = ethers.utils.parseEther("1");
        await unwrap(token1.transfer(user.address, pay));
        await unwrap(token1.connect(user).approve(amm.address, pay));
        await unwrap(amm.connect(user).swap(token1.address, pay));
        const base = ethers.utils.parseEther("20001");
        expect(await token0.balanceOf(user.address)).to.equal(base.sub(await amm.reserve0()));
    });

    it("remove liquidity", async function () {
        let liquidity = await amm.balanceOf(user.address);
        console.log(`balance before remove liquidity: token0=${await token0.balanceOf(user.address)} token1=${await token1.balanceOf(user.address)}`);
        await unwrap(amm.connect(user).removeLiquidity(liquidity));
        console.log(`balance after remove liquidity: token0=${await token0.balanceOf(user.address)} token1=${await token1.balanceOf(user.address)}`);
    });
});
