// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract BNBPriceContract {
    AggregatorV3Interface internal priceFeed;

    constructor(address _priceFeedAddress) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    function getBNBPrice() external view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }
}