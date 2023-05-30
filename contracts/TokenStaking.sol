// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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

contract TokenStaking is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastDepositTimestamp;
    }

    IERC20 public immutable token; // Pool token.
    IERC20 public immutable YOC;

    IYOCMasterChef public immutable masterchef;

    mapping(address => UserInfo) public userInfo;

    uint256 public totalShares;
    uint256 public accYocPerShare;
    address public treasury;
    uint256 public yocPoolPID;

    uint256 public constant PERCENT_PRECISION = 1000; // percent precision
    uint256 public constant ACC_YOC_PRECISION = 1e18;

    uint256 public DEPOSIT_FEE = 25; // 2.5%

    event Deposit(
        address indexed sender,
        uint256 amount,
        uint256 lastDepositedTime
    );
    event Withdraw(address indexed sender, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event Harvest(address indexed sender, uint256 amount);
    event Pause();
    event Unpause();
    event Init();
    event NewTreasury(address treasury);

    /**
     * @notice Constructor
     * @param _token: YOC token contract
     * @param _YOC: address of the YOC token
     * @param _masterchef: MasterChefV2 contract
     * @param _treasury: address of the treasury (collects fees)
     * @param _pid: YOC pool ID in MasterChefV2
     */
    constructor(
        IERC20 _token,
        IERC20 _YOC,
        IYOCMasterChef _masterchef,
        address _treasury,
        uint256 _pid
    ) {
        token = _token;
        YOC = _YOC;
        masterchef = _masterchef;
        treasury = _treasury;
        yocPoolPID = _pid;
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

    /*
     * @notice View function to see pending reward on frontend.
     * @param _user: user address
     * @return Pending reward for a given user
     */
    function pendingReward(address _user) external view returns (uint256) {
        UserInfo memory user = userInfo[_user];
        uint256 pendingYocReward = calculateTotalPendingYOCRewards();
        uint256 _accYocPerShare = accYocPerShare.add(
            pendingYocReward.mul(ACC_YOC_PRECISION).div(totalShares)
        );

        return
            user.amount.mul(_accYocPerShare).div(ACC_YOC_PRECISION).sub(
                user.rewardDebt
            );
    }

    /// @notice Update reward variables for the given pool.
    function updatePool() public {
        uint256 pendingYOC = balanceOf();
        if (totalShares > 0) {
            accYocPerShare = accYocPerShare.add(
                (pendingYOC.mul(ACC_YOC_PRECISION).div(totalShares))
            );
        }
    }

    /// @notice Deposit token to pool.
    /// @param _amount Amount of tokens to deposit.
    function deposit(uint256 _amount) external nonReentrant {
        harvest();

        if (totalShares == 0) {
            _safeTransfer(treasury, balanceOf());
        }

        updatePool();

        UserInfo storage user = userInfo[msg.sender];

        if (user.amount > 0) {
            settlePendingYOC(msg.sender);
        }

        if (_amount > 0) {
            uint256 before = token.balanceOf(address(this));
            token.safeTransferFrom(msg.sender, address(this), _amount);
            _amount = token.balanceOf(address(this)).sub(before);

            // If the pool is not YOC, apply the fee to it.
            uint256 _depositFee = _amount.mul(DEPOSIT_FEE).div(
                PERCENT_PRECISION
            );
            token.transfer(treasury, _depositFee);
            _amount = _amount.sub(_depositFee);

            user.amount = user.amount.add(_amount);
            user.lastDepositTimestamp = block.timestamp;

            totalShares = totalShares.add(_amount);
        }

        user.rewardDebt = user.amount.mul(accYocPerShare).div(
            ACC_YOC_PRECISION
        );

        emit Deposit(msg.sender, _amount, user.lastDepositTimestamp);
    }

    /// @notice Withdraw LP tokens from pool.
    /// @param _amount Amount of LP tokens to withdraw.
    function withdraw(uint256 _amount) external nonReentrant {
        harvest();
        updatePool();

        UserInfo storage user = userInfo[msg.sender];

        require(user.amount >= _amount, "withdraw: Insufficient");

        settlePendingYOC(msg.sender);

        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            token.safeTransfer(msg.sender, _amount);
        }

        user.rewardDebt = user.amount.mul(accYocPerShare).div(
            ACC_YOC_PRECISION
        );
        totalShares = totalShares.sub(_amount);

        emit Withdraw(msg.sender, _amount);
    }

    /// @notice Withdraw without caring about the rewards. EMERGENCY ONLY.
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        totalShares = totalShares > amount ? totalShares.sub(amount) : 0;

        // Note: transfer can fail or succeed if `amount` is zero.
        token.safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    /// @notice Settles, distribute the pending YOC rewards for given user.
    /// @param _user The user address for settling rewards.
    function settlePendingYOC(address _user) internal {
        UserInfo memory user = userInfo[_user];
        uint256 accYOC = user.amount.mul(accYocPerShare).div(ACC_YOC_PRECISION);
        uint256 pending = accYOC.sub(user.rewardDebt);

        _safeTransfer(_user, pending);
    }

    /// @notice Safe Transfer YOC.
    /// @param _to The YOC receiver address.
    /// @param _amount transfer YOC amounts.
    function _safeTransfer(address _to, uint256 _amount) internal {
        if (_amount > 0) {
            uint256 balance = YOC.balanceOf(address(this));
            if (balance < _amount) {
                _amount = balance;
            }
            YOC.transfer(_to, _amount);
        }
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
     * @notice Set treasury address
     * @dev Only callable by the contract owner.
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Cannot be zero address");
        treasury = _treasury;
        emit NewTreasury(treasury);
    }

    /**
     * @notice Withdraw unexpected tokens sent to the YOC Pool
     */
    function inCaseTokensGetStuck(address _token) external onlyOwner {
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
    function pause() external onlyOwner whenNotPaused {
        _pause();
        emit Pause();
    }

    /**
     * @notice Return to normal state
     * @dev Only possible when contract is paused.
     */
    function unpause() external onlyOwner whenPaused {
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

    /**
     * @notice Calculates the total underlying tokens
     * @dev It includes tokens held by the contract and the boost debt amount.
     */
    function balanceOf() public view returns (uint256) {
        return YOC.balanceOf(address(this));
    }
}
