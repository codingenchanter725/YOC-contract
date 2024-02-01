// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RestrictedAccess {
    address public owner;
    mapping(address => bool) public authorizedUsers;

    event AuthorizationChanged(address user, bool isAuthorized);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedUsers[msg.sender] = true;
    }

    function addAuthorizedUser(address user) external onlyAuthorized {
        authorizedUsers[user] = true;
        emit AuthorizationChanged(user, true);
    }

    function removeAuthorizedUser(address user) external onlyAuthorized {
        authorizedUsers[user] = false;
        emit AuthorizationChanged(user, false);
    }
}
