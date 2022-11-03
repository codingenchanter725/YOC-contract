// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";

contract TokenTemplate is ERC20, ERC20Snapshot {

    uint8 private _decimals;
    uint256 public sellAmount;

    constructor(string memory _name, string memory _symbol, uint256 _total, uint8 _decimal, uint256 _sellAmount, address treasury) ERC20(_name, _symbol) {
        _decimals = _decimal;
        sellAmount = _sellAmount;
        _mint(address(this), _total);
        _transfer(address(this), msg.sender, _sellAmount);
        _transfer(address(this), treasury, balanceOf(address(this)));
    }

    function snapshot() external {
        _snapshot();
    }

    function getCurrentSnapshotId() external view returns(uint256){
        uint256 currentId = _getCurrentSnapshotId();
       return currentId;
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Snapshot)
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}