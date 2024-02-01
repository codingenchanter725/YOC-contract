// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

interface IYOCMasterChef {
    function YOC() external returns (address);

    function add(
        uint256 _allocPoint,
        address _lpToken,
        bool _isYocPool,
        bool _withUpdate
    ) external;

    function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate) external;

    function deposit(uint256 _pid, uint256 _amount) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

    function withdrawAll(uint256 _pid) external;

    function pendingYOC(
        uint256 _pid,
        address _user
    ) external view returns (uint256);

    function userInfo(
        uint256 _pid,
        address _user
    ) external view returns (uint256, uint256);

    function emergencyWithdraw(uint256 _pid) external;

    function poolLength() external returns (uint256);

    function addAuthorizedUser(address _address) external;
}
