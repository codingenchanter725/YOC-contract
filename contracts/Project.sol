// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IShareToken {
    function snapshot() external;
    function getCurrentSnapshotId() external view returns(uint256);
    function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
}

// ----------------------------------------------------------------------------
// Trust contract
// ----------------------------------------------------------------------------
contract Project {

    IERC20 public shareToken;
    IERC20 public investToken;

// **************************
    // Project Info
    string public title;
    string public description;
    string public category;
    string public projectWebsite;
    string public icon;
    string public symbolImage;

    uint256 public shareTokenPrice;
    uint256 public roi;
    uint256 public apr;
    uint256 public startDate;  
    uint256 public endDate;
    uint256 public ongoingPercent;

    uint256 public depositProfitAmount;
    uint256 public originProfitAmount;
    uint256 public sellAmount;
    uint256 public investTotalAmount = 0;

    event Participated(address, uint256, uint256, address);
    event Refund(address, uint256, uint256, address);
    event Claimed(address, uint256, address);
    event ProfitDeposited(address, uint256, address);

    mapping(address => mapping(uint256 => bool)) userClaimState;

    constructor(string[] memory _infoST, uint256[] memory _infoNB, address[] memory _infoAD, uint256 _sellAmount) {
        title = _infoST[0];
        description = _infoST[1];
        category = _infoST[2];
        projectWebsite = _infoST[3];
        icon = _infoST[4];
        symbolImage = _infoST[5];

        shareTokenPrice = _infoNB[0];
        roi = _infoNB[1];
        apr = _infoNB[2];
        startDate = _infoNB[3];
        endDate = _infoNB[4];
        ongoingPercent = _infoNB[5];

        sellAmount = _sellAmount;

        shareToken = IERC20(address(_infoAD[0]));
        investToken = IERC20(address(_infoAD[1]));
        IShareToken(address(shareToken)).snapshot();
    }

    /**
     * @notice Invests sender's USDC to become a Trustee and receive tokens when ICO finishes.
     */
     function participate(uint256 investAmount, uint256 shareAmount) external {
        require(investAmount > 0, "Sent amount is zero!");
        require(startDate < block.timestamp * 1000, "It hasn't started yet!");
        require(endDate > block.timestamp * 1000, "Time is up!");
        investToken.transferFrom(msg.sender, address(this), investAmount);
        shareToken.transfer(msg.sender, shareAmount);
        investTotalAmount += investAmount;
        // Trigger participation event.
        emit Participated(address(this), investAmount, shareAmount, msg.sender);
     }

    /**
     * @notice refund sender's USDC
     */
    function refund(uint256 shareAmount, uint256 investAmount) external {
        require(shareAmount > 0 , "Sent amount is zero!");
        shareToken.transferFrom(msg.sender, address(this), shareAmount);
        investToken.transfer(msg.sender, investAmount);
        investTotalAmount -= investAmount;
        // Trigger refund event
        emit Refund(address(this), investAmount, shareAmount, msg.sender);
    }

    /**
     * @notice reward sender's USDC
     */
    function claim() public {
        (bool claimable, uint256 claimAmount) = profitWalletAmountCheck(msg.sender);
        require(!claimable && claimAmount > 0 , "Claim Error!");
        investToken.transfer(msg.sender, claimAmount);
        depositProfitAmount -= claimAmount;
        userClaimState[msg.sender][IShareToken(address(shareToken)).getCurrentSnapshotId()] = true;
        emit Claimed(address(this), claimAmount, msg.sender);
    }

    /**
     * Check profit wallet
     */
    function profitWalletAmountCheck(address _userAddr) public view returns(bool, uint256) {
        bool claimable = userClaimState[_userAddr][IShareToken(address(shareToken)).getCurrentSnapshotId()];
        uint256 claimAmount = 0;
        if(!claimable) {
            uint256 userShareAmount = IShareToken(address(shareToken)).balanceOfAt(_userAddr, IShareToken(address(shareToken)).getCurrentSnapshotId());
            claimAmount = (userShareAmount * originProfitAmount)/shareToken.totalSupply();
        }
        return (claimable, claimAmount);
    }

    /**
     * deposit profit amount
     */
    function makeDepositProfit(uint256 amount) public returns(bool) {
        require(amount > 0, "sent amount is zero!");
        if(depositProfitAmount > 0) {
            investToken.transfer(msg.sender, depositProfitAmount);
        }
        investToken.transferFrom(msg.sender, address(this), amount);
        depositProfitAmount = amount;
        originProfitAmount = amount;
        IShareToken(address(shareToken)).snapshot();
        emit ProfitDeposited(address(this), amount, msg.sender);
        return true;
    }


}