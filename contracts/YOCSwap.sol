// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IYOCSwap.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";

contract YOCSwap is Ownable, IYOCSwap {
    using SafeERC20 for IERC20;

    address private nativeToken;
    IUniswapV2Router02 public routerV2;
    
    constructor (
        address routerAddress_
    ) {
        routerV2 = IUniswapV2Router02(routerAddress_);
    }

    function getWETH() external view returns (address) {
        return routerV2.WETH();
    }

    function getExpectAmountOut(
        uint256 amountIn_,
        address[] calldata path_
    ) external view returns (uint256) {
        uint256[] memory amounts = routerV2.getAmountsOut(amountIn_, path_);
        return amounts[1];
    }

    function getExpectAmountIn(
        uint256 amountOut_,
        address[] calldata path_
    ) external view returns (uint256) {
        uint256[] memory amounts = routerV2.getAmountsIn(amountOut_, path_);
        return amounts[1];
    }

    function swapTokenToETH(
        uint256 amount_,
        address tokenAddr_
    ) external {
        address sender = msg.sender;
        require (sender != address(0), "zero address");
        require (tokenAddr_ != address(0), "zero token address");
        require (amount_ > 0, "invalid token amount");

        IERC20 token = IERC20(tokenAddr_);
        token.safeTransferFrom(sender, address(this), amount_);

        address[] memory path = new address[](2);
        path[0] = tokenAddr_;
        path[1] = routerV2.WETH();

        token.safeApprove(address(routerV2),  amount_);
        routerV2.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amount_, 
            0, 
            path, 
            sender, 
            block.timestamp
        );
    }

    function swapTokenToToken(
        uint256 amountIn_,
        address[] calldata path_
    ) external {
        address sender = msg.sender;
        require (sender != address(0), "zero address");
        require (path_[0] != address(0) && path_[1] != address(0), "zero token address");
        require (amountIn_ > 0, "invalid token amount");

        IERC20 token = IERC20(path_[0]);
        token.safeTransferFrom(sender, address(this), amountIn_);
        token.safeApprove(address(routerV2), amountIn_);

        routerV2.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountIn_, 
            0, 
            path_, 
            sender, 
            block.timestamp
        );
    }

    function swapETHToToken(
        address tokenOut_
    ) external payable {
        uint256 amountIn = msg.value;
        address sender = msg.sender;

        require (sender != address(0), "zero address");
        require (tokenOut_ != address(0), "zero token address");
        require (amountIn > 0, "invalid token amount");

        address[] memory path = new address[](2);
        path[0] = routerV2.WETH();
        path[1] = tokenOut_;

        routerV2.swapExactETHForTokensSupportingFeeOnTransferTokens{ value: amountIn }(
            0, 
            path, 
            sender, 
            block.timestamp
        );
    }

    function expectLiquidityAmount(
        address tokenA_,
        address tokenB_,
        uint256 amountA_
    ) external view returns (uint256) {
        return _calcLiquidTokenBAmount(tokenA_, tokenB_, amountA_);
    }

    function addLiquidity(
        address tokenA_,
        address tokenB_,
        uint256 amountADesired_,
        uint256 amountBDesired_,
        address recipient_
    ) external {
        address sender = msg.sender;
        require (recipient_ != address(0), "recipient is zero address");
        require (sender != address(0), "caller is zero address");
        require (tokenA_ != address(0) && tokenB_ != address(0), "invalide token pair");
        require (amountADesired_ > 0 && amountBDesired_ > 0, "invalide token pair amount");

        IERC20 tokenA = IERC20(tokenA_);
        IERC20 tokenB = IERC20(tokenB_);

        uint256 desiredBAmount = _calcLiquidTokenBAmount(tokenA_, tokenB_, amountADesired_);
        require (amountBDesired_ >= desiredBAmount, "insufficient B amount");

        tokenA.safeTransferFrom(sender, address(this), amountADesired_);
        tokenB.safeTransferFrom(sender, address(this), amountBDesired_);

        tokenA.safeApprove(address(routerV2), amountADesired_);
        tokenB.safeApprove(address(routerV2), amountBDesired_);

        routerV2.addLiquidity(
            tokenA_, 
            tokenB_, 
            amountADesired_, 
            amountBDesired_, 
            0, 
            0, 
            recipient_, 
            block.timestamp
        );
    }

    receive() external payable {}

    function _calcLiquidTokenBAmount(
        address tokenA_,
        address tokenB_,
        uint256 amountA_
    ) internal view returns (uint256) {
        address tokenPair = IUniswapV2Factory(routerV2.factory()).getPair(tokenA_, tokenB_);
        if (tokenPair == address(0)) {
            return 0;
        }

        uint256 tokenABalance = IERC20(tokenA_).balanceOf(tokenPair);
        uint256 tokenBBalance = IERC20(tokenB_).balanceOf(tokenPair);

        return tokenBBalance * amountA_ / tokenABalance;
    }
    
}