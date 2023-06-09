// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20 {
    function decimals() external view returns (uint8);
    function sellAmount() external view returns (uint256);
    function balanceOf(address user) external view returns (uint256);
    function name() external view returns (string memory);
    function allowance(
        address tokenOwner,
        address spender
    ) external view returns (uint256 remaining);
}
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
    function apr() external view returns (uint256);
    function startDate() external view returns (uint256);
    function endDate() external view returns (uint256);
    function ongoingPercent() external view returns (uint256);
    function depositProfitAmount() external view returns (uint256);
    function originProfitAmount() external view returns (uint256);
    function sellAmount() external view returns (uint256);
    function investTotalAmount() external view returns (uint256);
    function profitWalletAmountCheck(address user) external view returns(bool, uint256, bool);
}



contract ProjectDetail {

    struct Detail {
        address shareToken;
        uint256 shareTokenDecimals;
        uint256 shareTokenSellAmount;
        uint256 shareTokenBalance;
        uint256 shareTokenBalanceTemp;
        uint256 shareTokenAllowance;
        
        address investToken;
        uint256 investTokenDecimals;
        uint256 investTokenBalance;
        uint256 investTokenAllowance;

        string title;
        string description;
        string category;
        string projectWebsite;
        string icon;
        string symbolImage;

        uint256 shareTokenPrice;
        uint256 roi;
        uint256 apr;
        uint256 startDate;  
        uint256 endDate;
        uint256 ongoingPercent;

        uint256 depositProfitAmount;
        uint256 originProfitAmount;
        uint256 sellAmount;
        uint256 investTotalAmount;

        bool claimable;
        uint256 claimableAmount;
        bool joinState;
    }

    struct TokenDetail {
        string tokenName;
        address owner;
        uint256 ownedBalance;
    }

    constructor () {}

    function getProjectDetails(
        IProject project_,
        address user_
    ) external view returns (Detail memory) {
        IERC20 shareToken = project_.shareToken();
        IERC20 investToken = project_.investToken();

        uint256 shareTokenBalance = 0;
        uint256 investTokenBalance = 0;
        uint256 claimableAmount = 0;
        uint256 shareTokenAllowance = 0;
        uint256 investTokenAllowance = 0;
        bool joinState = false;
        bool claimable = false;
        if (user_ != address(0)) {
            shareTokenBalance = shareToken.balanceOf(user_);
            investTokenBalance = investToken.balanceOf(user_);
            (claimable, claimableAmount, joinState) = project_.profitWalletAmountCheck(user_);
            shareTokenAllowance = shareToken.allowance(address(user_), address(project_));
            investTokenAllowance = investToken.allowance(address(user_), address(project_));
        }

        uint256 shareTokenBalanceOfProject = shareToken.balanceOf(address(project_));

        Detail memory returnVal = Detail({
            shareToken: address(shareToken),
            shareTokenDecimals: shareToken.decimals(),
            shareTokenSellAmount: shareToken.sellAmount(),
            shareTokenBalanceTemp: shareTokenBalanceOfProject,
            shareTokenBalance: shareTokenBalance,
            shareTokenAllowance: shareTokenAllowance,
            investToken: address(investToken),
            investTokenDecimals: investToken.decimals(),
            investTokenBalance: investTokenBalance,
            investTokenAllowance: investTokenAllowance,
            title: project_.title(),
            description: project_.description(),
            category: project_.category(),
            projectWebsite: project_.projectWebsite(),
            icon: project_.icon(),
            symbolImage: project_.symbolImage(),
            shareTokenPrice: project_.shareTokenPrice(),
            roi: project_.roi(),
            apr: project_.apr(),
            startDate: project_.startDate(),
            endDate: project_.endDate(),
            ongoingPercent: project_.ongoingPercent(),
            depositProfitAmount: project_.depositProfitAmount(),
            originProfitAmount: project_.originProfitAmount(),
            sellAmount: project_.sellAmount(),
            investTotalAmount: project_.investTotalAmount(),
            claimable: claimable,
            claimableAmount: claimableAmount,
            joinState: joinState
        });

        return returnVal;
    }

    function getTokenInfo(
        address tokenAddr_,
        address[] memory users_
    ) external view returns (TokenDetail[] memory) {
        uint256 length = users_.length;
        require (tokenAddr_ != address(0), "invalid token address");
        require (length > 0, "no users");

        TokenDetail[] memory infos = new TokenDetail[](length);
        IERC20 token = IERC20(tokenAddr_);
        for (uint256 i = 0; i < length; i ++) {
            infos[i] = TokenDetail({
                tokenName: token.name(),
                owner: users_[i],
                ownedBalance: token.balanceOf(users_[i])
            });
        }

        return infos;
    }

}