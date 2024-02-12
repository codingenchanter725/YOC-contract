// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Token.sol";
import "./interfaces/IYOCMasterChef.sol";
import "./interfaces/IProjectTrade.sol";
import "./interfaces/IYOC.sol";
import "./utils/RestrictedAccess.sol";

interface IShareToken {
    function snapshot() external;

    function getCurrentSnapshotId() external view returns (uint256);

    function balanceOfAt(
        address account,
        uint256 snapshotId
    ) external view returns (uint256);
}

// ----------------------------------------------------------------------------
// Trust contract
// ----------------------------------------------------------------------------
contract Project is RestrictedAccess {
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
    uint256 public startDate;
    uint256 public endDate;
    uint256 public ongoingPercent;

    uint256 public depositProfitAmount;
    uint256 public originProfitAmount;
    uint256 public sellAmount;
    uint256 public investTotalAmount = 0;

    uint256 public multiplier;
    address public projectWallet;
    IProjectTrade public projectTrade;
    IYOCMasterChef public masterchef;
    uint256 public pId;
    uint256 public totalRewardYocAmount;
    uint public status;

    event Participated(address, uint256, uint256, address);
    event Refund(address, uint256, uint256, address);
    event Claimed(address, uint256, address);
    event ProfitDeposited(address, uint256, address);
    event ClaimInvestEarn(address, uint256, address);

    mapping(address => mapping(uint256 => bool)) userClaimState;
    mapping(address => bool) userJoinState;
    mapping(address => bool) userClaimInvestState;

    constructor(
        string[] memory _infoST,
        uint256[] memory _infoNB,
        address[] memory _infoAD,
        uint256 _sellAmount
    ) {
        title = _infoST[0];
        description = _infoST[1];
        category = _infoST[2];
        projectWebsite = _infoST[3];
        icon = _infoST[4];
        symbolImage = _infoST[5];

        shareTokenPrice = _infoNB[0];
        roi = _infoNB[1];
        startDate = _infoNB[2];
        endDate = _infoNB[3];
        ongoingPercent = _infoNB[4];
        multiplier = _infoNB[5];

        sellAmount = _sellAmount;

        shareToken = IERC20(address(_infoAD[0]));
        investToken = IERC20(address(_infoAD[1]));
        projectWallet = address(_infoAD[2]);
        projectTrade = IProjectTrade(address(_infoAD[3]));
        masterchef = IYOCMasterChef(_infoAD[4]);
        IShareToken(address(shareToken)).snapshot();
        status = 0;
    }

    function init() public onlyOwner {
        TOKEN LPToken = new TOKEN("TEMP LP", "TLP");
        masterchef.add(multiplier, address(LPToken), false, true);
        uint256 balance = 10 * 10 ** 16; // LPToken.balanceOf(address(this));
        LPToken.approve(address(masterchef), balance);
        pId = masterchef.poolLength() - 1;
        masterchef.deposit(pId, balance);
    }

    /**
     * Update muliplier
     */
    function updateMultiplier(
        uint256 _multiplier
    ) public onlyAuthorized returns (bool) {
        // masterchef
        multiplier = _multiplier;
        return true;
    }

    function updateProjectWallet(
        address _projectWallet
    ) public onlyAuthorized returns (bool) {
        projectWallet = _projectWallet;
        return true;
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
        userJoinState[msg.sender] = true;
        // Trigger participation event.
        emit Participated(address(this), investAmount, shareAmount, msg.sender);
        uint256 currentShareTokenOfContract = shareToken.balanceOf(
            address(this)
        );
        if (
            ((sellAmount - currentShareTokenOfContract) * 100) / sellAmount >=
            ongoingPercent
        ) {
            endDate += (endDate - startDate);
        }

        if (currentShareTokenOfContract == 0) {
            status = 1;
            totalRewardYocAmount = masterchef.pendingYOC(pId, address(this));
            masterchef.withdrawAll(pId);
            masterchef.set(pId, 0, false);

            investToken.transfer(projectWallet, investTotalAmount);
        }
    }

    /**
     * @notice refund sender's USDC
     */
    function refund(uint256 shareAmount, uint256 investAmount) external {
        require(shareAmount > 0, "Sent amount is zero!");
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
        (bool claimable, uint256 claimAmount, ) = profitWalletAmountCheck(
            msg.sender
        );
        require(!claimable && claimAmount > 0, "Claim Error!");
        investToken.transfer(msg.sender, claimAmount);
        depositProfitAmount -= claimAmount;
        userClaimState[msg.sender][
            IShareToken(address(shareToken)).getCurrentSnapshotId()
        ] = true;
        emit Claimed(address(this), claimAmount, msg.sender);
    }

    /**
     * Check profit wallet
     */
    function profitWalletAmountCheck(
        address _userAddr
    ) public view returns (bool, uint256, bool) {
        bool claimable = userClaimState[_userAddr][
            IShareToken(address(shareToken)).getCurrentSnapshotId()
        ];
        uint256 amountInContract = projectTrade.getBalanceOfUserInContact(
            address(this),
            _userAddr
        );
        if (amountInContract > 0) {
            claimable = true;
        }
        uint256 claimAmount = 0;
        if (!claimable) {
            uint256 userShareAmount = IShareToken(address(shareToken))
                .balanceOfAt(
                    _userAddr,
                    IShareToken(address(shareToken)).getCurrentSnapshotId()
                );
            userShareAmount += amountInContract;
            claimAmount =
                (userShareAmount * originProfitAmount) /
                shareToken.totalSupply();
        }
        return (claimable, claimAmount, userJoinState[_userAddr]);
    }

    /**
     * deposit profit amount
     */
    function makeDepositProfit(uint256 amount) public returns (bool) {
        require(amount > 0, "sent amount is zero!");
        if (depositProfitAmount > 0) {
            investToken.transfer(msg.sender, depositProfitAmount);
        }
        investToken.transferFrom(msg.sender, address(this), amount);
        depositProfitAmount = amount;
        originProfitAmount = amount;
        IShareToken(address(shareToken)).snapshot();
        emit ProfitDeposited(address(this), amount, msg.sender);
        return true;
    }

    /**
     * Check the reward amount of the invest & earning feature
     */
    function investEarnAmountCheck(
        address _userAddr
    ) public view returns (uint256) {
        if (userClaimInvestState[_userAddr] == false) {
            uint256 userShareAmount = IShareToken(address(shareToken))
                .balanceOfAt(
                    _userAddr,
                    IShareToken(address(shareToken)).getCurrentSnapshotId()
                );
            uint256 amountInContract = projectTrade.getBalanceOfUserInContact(
                address(this),
                _userAddr
            );
            if (status == 0) {
                uint256 currentTotalReward = masterchef.pendingYOC(
                    pId,
                    address(this)
                );
                uint256 claimAmount = ((userShareAmount + amountInContract) *
                    currentTotalReward) / shareToken.totalSupply();

                return claimAmount;
            } else {
                uint256 claimAmount = ((userShareAmount + amountInContract) *
                    totalRewardYocAmount) / shareToken.totalSupply();

                return claimAmount;
            }
        } else return 0;
    }

    /**
     * Claim the profile for the invest & earn
     */
    function claimInvestEarn() external {
        require(
            status == 1,
            "You can claim the reward when the project reach out 100%"
        );
        require(
            userClaimInvestState[msg.sender] == false,
            "You have already claimed"
        );
        uint256 userShareAmount = IShareToken(address(shareToken)).balanceOfAt(
            (msg.sender),
            IShareToken(address(shareToken)).getCurrentSnapshotId()
        );
        uint256 amountInContract = projectTrade.getBalanceOfUserInContact(
            address(this),
            (msg.sender)
        );

        address YOC = masterchef.YOC();
        uint256 claimAmount = ((userShareAmount + amountInContract) *
            totalRewardYocAmount) / shareToken.totalSupply();
        userClaimInvestState[msg.sender] = true;
        IYOC(YOC).transfer(msg.sender, claimAmount);
        emit ClaimInvestEarn(address(this), claimAmount, msg.sender);
    }

    function manualMoveTrade() external onlyAuthorized {
        uint256 currentShareTokenOfContract = shareToken.balanceOf(
            address(this)
        );
        require(
            currentShareTokenOfContract > 0,
            "can't call in traded project"
        );
        shareToken.transfer(projectWallet, currentShareTokenOfContract);
        if (
            ((sellAmount - currentShareTokenOfContract) * 100) / sellAmount <
            ongoingPercent
        ) {
            endDate += (endDate - startDate);
        }
        investToken.transfer(projectWallet, investTotalAmount);
        emit Participated(
            address(this),
            0,
            currentShareTokenOfContract,
            projectWallet
        );
    }

    function getUserClaimInvestState(address _userAddr) public view returns(bool) {
        return userClaimInvestState[_userAddr];
    }
}
