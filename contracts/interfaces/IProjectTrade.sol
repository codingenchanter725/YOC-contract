// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IProjectTrade {
    function getBalanceOfUserInContact(
        address _pToken,
        address _user
    ) external view returns (uint256);

    function paused(address _pToken) external view returns (bool);
}
