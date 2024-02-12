// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "./interfaces/IProject.sol";

contract ProjectDetail {
    struct ShareTokenDetails {
        address tokenAddress;
        uint256 decimals;
        string symbol;
        uint256 totalSupply;
        uint256 sellAmount;
        uint256 allowance;
        uint256 balance;
        uint256 remainingBalanceOfProject;
    }

    struct InvestTokenDetails {
        address tokenAddress;
        uint256 decimals;
        string symbol;
        uint256 balance;
        uint256 allowance;
        uint256 balanceInTradeOrder;
    }

    struct ProjectDetails {
        string title;
        string description;
        string category;
        string projectWebsite;
        string icon;
        string symbolImage;
        uint256 shareTokenPrice;
        uint256 roi;
        uint256 startDate;
        uint256 endDate;
        uint256 ongoingPercent;
        uint256 pId;
        uint256 multiplier;
        address projectWallet;
        uint256 investTotalAmount;
        bool tradePaused;
    }

    struct ProfitDetails {
        bool claimable;
        uint256 claimableAmount;
        bool joinState;
        bool investEarnClaimable;
        uint256 investEarnAmount;
    }

    struct Detail {
        ShareTokenDetails shareToken;
        InvestTokenDetails investToken;
        ProjectDetails project;
        ProfitDetails profit;
    }

    struct TokenDetail {
        string tokenName;
        address owner;
        uint256 ownedBalance;
    }

    constructor() {}

    function getProjectDetails(
        IProject project_,
        address user_
    ) external view returns (Detail memory) {
        IERC20 ShareToken = project_.shareToken();
        IERC20 InvestToken = project_.investToken();
        IProjectTrade ProjectTrade = project_.projectTrade();

        Detail memory detail;

        detail.shareToken.tokenAddress = address(ShareToken);
        detail.shareToken.decimals = ShareToken.decimals();
        detail.shareToken.symbol = ShareToken.symbol();
        detail.shareToken.totalSupply = ShareToken.totalSupply();
        detail.shareToken.sellAmount = project_.sellAmount();
        detail.shareToken.remainingBalanceOfProject = ShareToken.balanceOf(
            address(project_)
        );

        detail.investToken.tokenAddress = address(InvestToken);
        detail.investToken.decimals = InvestToken.decimals();
        detail.investToken.symbol = InvestToken.symbol();

        detail.project.title = project_.title();
        detail.project.description = project_.description();
        detail.project.category = project_.category();
        detail.project.projectWebsite = project_.projectWebsite();
        detail.project.icon = project_.icon();
        detail.project.symbolImage = project_.symbolImage();
        detail.project.shareTokenPrice = project_.shareTokenPrice();
        detail.project.roi = project_.roi();
        detail.project.startDate = project_.startDate();
        detail.project.endDate = project_.endDate();
        detail.project.ongoingPercent = project_.ongoingPercent();
        detail.project.pId = project_.pId();
        detail.project.multiplier = project_.multiplier();
        detail.project.projectWallet = project_.projectWallet();
        detail.project.investTotalAmount = project_.investTotalAmount();
        detail.project.tradePaused = ProjectTrade.paused(address(ShareToken));

        if (user_ != address(0)) {
            detail.shareToken.balance = ShareToken.balanceOf(user_);
            detail.shareToken.allowance = ShareToken.allowance(
                address(user_),
                address(project_)
            );

            detail.investToken.balance = InvestToken.balanceOf(user_);
            detail.investToken.allowance = InvestToken.allowance(
                address(user_),
                address(project_)
            );
            detail.investToken.balanceInTradeOrder = ProjectTrade
                .getBalanceOfUserInContact(address(project_), address(user_));

            bool joinState = false;
            uint256 claimableAmount = 0;
            bool claimable = false;
            (claimable, claimableAmount, joinState) = project_
                .profitWalletAmountCheck(user_);
            detail.profit.claimable = claimable;
            detail.profit.claimableAmount = claimableAmount;
            detail.profit.joinState = joinState;
            detail.profit.investEarnClaimable = project_.getUserClaimInvestState(
                address(user_)
            );
            detail.profit.investEarnAmount = project_.investEarnAmountCheck(
                address(user_)
            );
        }

        return detail;
    }

    function getTokenInfo(
        address tokenAddr_,
        address[] memory users_
    ) external view returns (TokenDetail[] memory) {
        uint256 length = users_.length;
        require(tokenAddr_ != address(0), "invalid token address");
        require(length > 0, "no users");

        TokenDetail[] memory infos = new TokenDetail[](length);
        IERC20 token = IERC20(tokenAddr_);
        for (uint256 i = 0; i < length; i++) {
            infos[i] = TokenDetail({
                tokenName: token.name(),
                owner: users_[i],
                ownedBalance: token.balanceOf(users_[i])
            });
        }

        return infos;
    }
}
