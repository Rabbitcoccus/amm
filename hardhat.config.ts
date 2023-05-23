import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.18",
  networks: {
    "sepolia": {
      url: "https://rpc.sepolia.org",
      chainId: 0xaa36a7,
      accounts: ["", ""]
    }
  }
};

export default config;
