// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "./IERC20.sol";
import "./IProjectTrade.sol";

interface IProject {
    function shareToken() external view returns (IERC20);

    function investToken() external view returns (IERC20);

    function title() external view returns (string memory);

    function description() external view returns (string memory);

    function category() external view returns (string memory);

    function projectWebsite() external view returns (string memory);

    function icon() external view returns (string memory);

    function symbolImage() external view returns (string memory);

    function shareTokenPrice() external view returns (uint256);

    function roi() external view returns (uint256);

    function startDate() external view returns (uint256);

    function endDate() external view returns (uint256);

    function ongoingPercent() external view returns (uint256);

    function depositProfitAmount() external view returns (uint256);

    function originProfitAmount() external view returns (uint256);

    function sellAmount() external view returns (uint256);

    function investTotalAmount() external view returns (uint256);

    function profitWalletAmountCheck(
        address user
    ) external view returns (bool, uint256, bool);

    function pId() external view returns (uint256);

    function multiplier() external view returns (uint256);

    function projectWallet() external view returns (address);

    function projectTrade() external view returns (IProjectTrade);

    function investEarnAmountCheck(
        address _userAddr
    ) external view returns (uint256);
}
