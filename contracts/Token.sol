// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./utils/ERC20.sol";

contract Token is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint initialSupply
    ) ERC20(name, symbol) {
        _mint(_msgSender(), initialSupply);
    }
}
