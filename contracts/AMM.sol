// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./utils/IERC20.sol";
import "./utils/Math.sol";
import "./utils/Ownable.sol";
import "./utils/ReentrancyGuard.sol";

contract AMM is ReentrancyGuard, Ownable {
    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint public reserve0;
    uint public reserve1;

    uint public totalSupply;
    mapping(address => uint) public balanceOf;

    bool private initialized;

    constructor(address _token0, address _token1) Ownable() ReentrancyGuard() {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        initialized = false;
    }

    function initialize(uint amount1, uint amount2) external onlyOwner {
        require(initialized == false, "already initialized");
        token0.transferFrom(_msgSender(), address(this), amount1);
        token1.transferFrom(_msgSender(), address(this), amount2);
        reserve0 = amount1;
        reserve1 = amount2;
        initialized = true;
    }

    function deposit(address tokenIn, uint amount) external onlyOwner {
        require(
            tokenIn == address(token0) || tokenIn == address(token1),
            "invalid token"
        );
        bool isToken0 = tokenIn == address(token0);
        IERC20 token = isToken0 ? token0 : token1;
        require(
            amount > 0 && amount <= token.balanceOf(_msgSender()),
            "invalid amount"
        );
        isToken0 ? reserve0 += amount : reserve1 += amount;
        IERC20(token).transferFrom(_msgSender(), address(this), amount);
    }

    function withdraw(address tokenIn, uint amount) external onlyOwner {
        require(
            tokenIn == address(token0) || tokenIn == address(token1),
            "invalid token"
        );

        bool isToken0 = tokenIn == address(token0);
        (IERC20 token, uint reserve) = isToken0
            ? (token0, reserve0)
            : (token1, reserve1);
        require(amount < reserve && amount > 0, "invalid amount");

        isToken0 ? reserve0 -= amount : reserve1 -= amount;
        IERC20(token).transfer(_msgSender(), amount);
    }

    function _balanceOf(address _from) private view returns (uint256) {
        return balanceOf[_from];
    }

    function _mint(address _to, uint _amount) private {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
    }

    function _burn(address _from, uint _amount) private {
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
    }

    function _update() private {
        reserve0 = token0.balanceOf(address(this));
        reserve1 = token1.balanceOf(address(this));
    }

    function swap(
        address _tokenIn,
        uint _amountIn
    ) external nonReentrant returns (uint amountOut) {
        require(
            _tokenIn == address(token0) || _tokenIn == address(token1),
            "invalid token"
        );
        require(_amountIn > 0, "amount in = 0");

        bool isToken0 = _tokenIn == address(token0);
        (
            IERC20 tokenIn,
            IERC20 tokenOut,
            uint reserveIn,
            uint reserveOut
        ) = isToken0
                ? (token0, token1, reserve0, reserve1)
                : (token1, token0, reserve1, reserve0);

        tokenIn.transferFrom(_msgSender(), address(this), _amountIn);

        uint amountInWithoutFee = (_amountIn * 997) / 1000;
        amountOut =
            (reserveOut * amountInWithoutFee) /
            (reserveIn + amountInWithoutFee);
        tokenOut.transfer(_msgSender(), amountOut);
        _update();
    }

    function addLiquidity(
        uint _amount0,
        uint _amount1
    ) external nonReentrant returns (uint liquidity) {
        require(_amount0 > 0 && _amount1 > 0, "invalid amount");
        require(reserve0 * _amount1 == reserve1 * _amount0, "x / y != dx / dy");

        token0.transferFrom(_msgSender(), address(this), _amount0);
        token1.transferFrom(_msgSender(), address(this), _amount1);

        if (totalSupply == 0) {
            liquidity = Math.sqrt(_amount0 * _amount1);
        } else {
            liquidity = Math.min(
                (_amount0 * totalSupply) / reserve0,
                (_amount1 * totalSupply) / reserve1
            );
        }
        require(liquidity > 0, "liquidity = 0");
        _mint(_msgSender(), liquidity);

        _update();
    }

    function removeLiquidity(
        uint _liquidity
    ) external nonReentrant returns (uint amount0, uint amount1) {
        require(
            _balanceOf(_msgSender()) >= _liquidity,
            "insufficient liquidity"
        );
        uint bal0 = token0.balanceOf(address(this));
        uint bal1 = token1.balanceOf(address(this));

        amount0 = (_liquidity * bal0) / totalSupply;
        amount1 = (_liquidity * bal1) / totalSupply;
        require(amount0 > 0 && amount1 > 0, "amount0 or amount1 = 0");

        _burn(_msgSender(), _liquidity);

        token0.transfer(_msgSender(), amount0);
        token1.transfer(_msgSender(), amount1);

        _update();
    }
}
