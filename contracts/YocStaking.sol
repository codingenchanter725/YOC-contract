// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IYOCMasterChef {
    function deposit(uint256 _pid, uint256 _amount) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

    function pendingYOC(
        uint256 _pid,
        address _user
    ) external view returns (uint256);

    function userInfo(
        uint256 _pid,
        address _user
    ) external view returns (uint256, uint256);

    function emergencyWithdraw(uint256 _pid) external;
}

contract YocStaking is Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 shares; // number of shares for a user.
        uint256 lastDepositedTime; // keep track of deposited time for potential penalty.
        uint256 yocAtLastUserAction; // keep track of YOC deposited at the last user action.
        uint256 lastUserActionTime; // keep track of the last user action time.
    }

    IERC20 public immutable token; // YOC token.

    IYOCMasterChef public immutable masterchef;

    mapping(address => UserInfo) public userInfo;

    bool private isYocToken = true;

    uint256 public totalShares;
    address public admin;
    address public treasury;
    uint256 public yocPoolPID;

    uint256 public constant MAX_WITHDRAW_FEE = 50; // 5%
    uint256 public constant MAX_WITHDRAW_FEE_PERIOD = 1 weeks; // 1 week
    uint256 public constant PRECISION_FACTOR = 1e12; // precision factor.
    uint256 public constant PRECISION_FACTOR_SHARE = 1e28; // precision factor for share.
    uint256 public constant MIN_DEPOSIT_AMOUNT = 0.00001 ether;
    uint256 public constant MIN_WITHDRAW_AMOUNT = 0.00001 ether;
    uint256 public constant PERCENT_PRECISION = 10000; // percent precision

    uint256 public depositFee = 19; // 0.19%
    uint256 public withdrawFee = 19; // 0.19%
    uint256 public withdrawFeePeriod = 7 days; // 7 days

    event Deposit(
        address indexed sender,
        uint256 amount,
        uint256 shares,
        uint256 lastDepositedTime
    );
    event Withdraw(address indexed sender, uint256 amount, uint256 shares);
    event Harvest(address indexed sender, uint256 amount);
    event Pause();
    event Unpause();
    event Init();
    event NewAdmin(address admin);
    event NewTreasury(address treasury);
    event NewWithdrawFee(uint256 withdrawFee);
    event NewWithdrawFeePeriod(uint256 withdrawFeePeriod);

    /**
     * @notice Constructor
     * @param _token: YOC token contract
     * @param _masterchef: MasterChefV2 contract
     * @param _admin: address of the admin
     * @param _treasury: address of the treasury (collects fees)
     * @param _pid: YOC pool ID in MasterChefV2
     */
    constructor(
        IERC20 _token,
        IYOCMasterChef _masterchef,
        address _admin,
        address _treasury,
        uint256 _pid,
        bool _isYocToken
    ) {
        token = _token;
        masterchef = _masterchef;
        admin = _admin;
        treasury = _treasury;
        yocPoolPID = _pid;
        isYocToken = _isYocToken;
    }

    /**
     * @notice Deposits a dummy token to `MASTER_CHEF` MCV2.
     * It will transfer all the `dummyToken` in the tx sender address.
     * @param dummyToken The address of the token to be deposited into MCV2.
     */
    function init(IERC20 dummyToken) external onlyOwner {
        uint256 balance = dummyToken.balanceOf(msg.sender);
        require(balance != 0, "Balance must exceed 0");
        dummyToken.safeTransferFrom(msg.sender, address(this), balance);
        dummyToken.approve(address(masterchef), balance);
        masterchef.deposit(yocPoolPID, balance);
        emit Init();
    }

    /**
     * @notice Checks if the msg.sender is the admin address.
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "admin: wut?");
        _;
    }

    /*
     * @notice View function to see pending reward on frontend.
     * @param _user: user address
     * @return Pending reward for a given user
     */
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo memory user = userInfo[_user];
        uint256 pendingYocReward = calculateTotalPendingYOCRewards();
        return (pendingYocReward * user.shares) / totalShares;
    }

    /**
     * @notice Update user share When need to unlock or charges a fee.
     * @param _user: User address
     */
    function updateUserShare(address _user) internal {
        UserInfo storage user = userInfo[_user];
        if (user.shares > 0) {
            uint256 totalAmount = (user.shares * balanceOf()) / totalShares;
            totalShares -= user.shares;
            user.shares = 0;
            // Recalculate the user's share.
            uint256 pool = balanceOf();
            uint256 newShares;
            if (totalShares != 0) {
                newShares = (totalAmount * totalShares) / (pool - totalAmount);
            } else {
                newShares = totalAmount;
            }
            user.shares = newShares;
            totalShares += newShares;
        }
    }

    /**
     * @notice Deposit funds into the YOC Pool.
     * @dev Only possible when contract not paused.
     * @param _amount: number of tokens to deposit (in YOC)
     */
    function deposit(uint256 _amount) external whenNotPaused {
        require(_amount > 0, "Nothing to deposit");
        depositOperation(_amount, msg.sender);
    }

    /**
     * @notice The operation of deposite.
     * @param _amount: number of tokens to deposit (in YOC)
     * @param _user: User address
     */
    function depositOperation(uint256 _amount, address _user) internal {
        UserInfo storage user = userInfo[_user];
        if (user.shares == 0 || _amount > 0) {
            require(
                _amount > MIN_DEPOSIT_AMOUNT,
                "Deposit amount must be greater than MIN_DEPOSIT_AMOUNT"
            );
        }
        // Harvest tokens from Masterchef.
        harvest();

        // Handle stock funds.
        if (totalShares == 0) {
            uint256 stockAmount = balanceOf();
            token.safeTransfer(treasury, stockAmount);
        }
        // Update user share.
        updateUserShare(_user);

        uint256 currentShares;
        uint256 currentAmount;
        uint256 pool = balanceOf();
        if (_amount > 0) {
            token.safeTransferFrom(_user, address(this), _amount);
            currentAmount = _amount;
            if (!isYocToken) {
                uint256 depositFeeAmount = (currentAmount * depositFee) /
                    PERCENT_PRECISION;
                currentAmount -= depositFeeAmount;
                token.safeTransfer(treasury, depositFeeAmount);
            }
        }

        if (totalShares != 0) {
            currentShares = (currentAmount * totalShares) / pool;
        } else {
            currentShares = currentAmount;
        }

        user.shares += currentShares;

        if (_amount > 0) {
            user.lastDepositedTime = block.timestamp;
        }
        totalShares += currentShares;

        user.yocAtLastUserAction = (user.shares * balanceOf()) / totalShares;
        user.lastUserActionTime = block.timestamp;

        emit Deposit(_user, _amount, currentShares, block.timestamp);
    }

    /**
     * @notice Withdraw funds from the YOC Pool.
     * @param _amount: Number of amount to withdraw
     */
    function withdrawByAmount(uint256 _amount) public whenNotPaused {
        require(
            _amount > MIN_WITHDRAW_AMOUNT,
            "Withdraw amount must be greater than MIN_WITHDRAW_AMOUNT"
        );
        withdrawOperation(0, _amount);
    }

    /**
     * @notice Withdraw funds from the YOC Pool.
     * @param _shares: Number of shares to withdraw
     */
    function withdraw(uint256 _shares) public whenNotPaused {
        require(_shares > 0, "Nothing to withdraw");
        withdrawOperation(_shares, 0);
    }

    /**
     * @notice The operation of withdraw.
     * @param _shares: Number of shares to withdraw
     * @param _amount: Number of amount to withdraw
     */
    function withdrawOperation(uint256 _shares, uint256 _amount) internal {
        UserInfo storage user = userInfo[msg.sender];
        require(_shares <= user.shares, "Withdraw amount exceeds balance");

        // Calculate the percent of withdraw shares, the shares will be updated.
        uint256 currentShare = _shares;
        uint256 sharesPercent = (_shares * PRECISION_FACTOR_SHARE) /
            user.shares;

        // Harvest token from MasterchefV2.
        harvest();

        // Update user share.
        updateUserShare(msg.sender);

        if (_shares == 0 && _amount > 0) {
            uint256 pool = balanceOf();
            currentShare = (_amount * totalShares) / pool; // Calculate equivalent shares
            if (currentShare > user.shares) {
                currentShare = user.shares;
            }
        } else {
            currentShare =
                (sharesPercent * user.shares) /
                PRECISION_FACTOR_SHARE;
        }
        uint256 currentAmount = (balanceOf() * currentShare) / totalShares;
        user.shares -= currentShare;
        totalShares -= currentShare;

        // Calculate withdraw fee
        if (
            block.timestamp < user.lastDepositedTime + withdrawFeePeriod &&
            isYocToken
        ) {
            uint256 feeRate = withdrawFee;
            uint256 currentWithdrawFee = (currentAmount * feeRate) /
                PERCENT_PRECISION;
            token.safeTransfer(treasury, currentWithdrawFee);
            currentAmount -= currentWithdrawFee;
        }

        token.safeTransfer(msg.sender, currentAmount);

        if (user.shares > 0) {
            user.yocAtLastUserAction =
                (user.shares * balanceOf()) /
                totalShares;
        } else {
            user.yocAtLastUserAction = 0;
        }

        user.lastUserActionTime = block.timestamp;

        emit Withdraw(msg.sender, currentAmount, currentShare);
    }

    /**
     * @notice Withdraw all funds for a user
     */
    function withdrawAll() external {
        withdraw(userInfo[msg.sender].shares);
    }

    /**
     * @notice Harvest pending YOC tokens from MasterChef
     */
    function harvest() internal {
        uint256 pendingYOC = masterchef.pendingYOC(yocPoolPID, address(this));
        if (pendingYOC > 0) {
            uint256 balBefore = balanceOf();
            masterchef.withdraw(yocPoolPID, 0);
            uint256 balAfter = balanceOf();
            emit Harvest(msg.sender, (balAfter - balBefore));
        }
    }

    /**
     * @notice Set admin address
     * @dev Only callable by the contract owner.
     */
    function setAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Cannot be zero address");
        admin = _admin;
        emit NewAdmin(admin);
    }

    /**
     * @notice Set treasury address
     * @dev Only callable by the contract owner.
     */
    function setTreasury(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "Cannot be zero address");
        treasury = _treasury;
        emit NewTreasury(treasury);
    }

    /**
     * @notice Set withdraw fee
     * @dev Only callable by the contract admin.
     */
    function setWithdrawFee(uint256 _withdrawFee) external onlyAdmin {
        require(
            _withdrawFee <= MAX_WITHDRAW_FEE,
            "withdrawFee cannot be more than MAX_WITHDRAW_FEE"
        );
        withdrawFee = _withdrawFee;
        emit NewWithdrawFee(withdrawFee);
    }

    /**
     * @notice Set withdraw fee period
     * @dev Only callable by the contract admin.
     */
    function setWithdrawFeePeriod(
        uint256 _withdrawFeePeriod
    ) external onlyAdmin {
        require(
            _withdrawFeePeriod <= MAX_WITHDRAW_FEE_PERIOD,
            "withdrawFeePeriod cannot be more than MAX_WITHDRAW_FEE_PERIOD"
        );
        withdrawFeePeriod = _withdrawFeePeriod;
        emit NewWithdrawFeePeriod(withdrawFeePeriod);
    }

    /**
     * @notice Withdraw unexpected tokens sent to the YOC Pool
     */
    function inCaseTokensGetStuck(address _token) external onlyAdmin {
        require(
            _token != address(token),
            "Token cannot be same as deposit token"
        );

        uint256 amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Trigger stopped state
     * @dev Only possible when contract not paused.
     */
    function pause() external onlyAdmin whenNotPaused {
        _pause();
        emit Pause();
    }

    /**
     * @notice Return to normal state
     * @dev Only possible when contract is paused.
     */
    function unpause() external onlyAdmin whenPaused {
        _unpause();
        emit Unpause();
    }

    /**
     * @notice Calculates the total pending rewards that can be harvested
     * @return Returns total pending YOC rewards
     */
    function calculateTotalPendingYOCRewards() public view returns (uint256) {
        uint256 amount = masterchef.pendingYOC(yocPoolPID, address(this));
        return amount;
    }

    function getPricePerFullShare() external view returns (uint256) {
        return
            totalShares == 0
                ? 1e18
                : (((balanceOf() + calculateTotalPendingYOCRewards()) *
                    (1e18)) / totalShares);
    }

    /**
     * @notice Calculates the total underlying tokens
     * @dev It includes tokens held by the contract and the boost debt amount.
     */
    function balanceOf() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
