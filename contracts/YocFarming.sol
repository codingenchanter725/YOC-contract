// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IYOC.sol";
import "./utils/RestrictedAccess.sol";

contract YOCMasterChef is RestrictedAccess, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastDepositTimestamp;
    }

    struct PoolInfo {
        uint256 accYocPerShare;
        uint256 lastRewardBlock;
        uint256 allocPoint;
        uint256 totalShare;
        bool isYocPool;
    }

    IYOC public immutable YOC;

    IERC20[] public lpToken;
    PoolInfo[] public poolInfo;

    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    address public treasury; // For receiving the fees.
    uint256 public treasuryFee;

    uint256 public totalAllocPoint;
    uint256 public constant ACC_YOC_PRECISION = 1e18;
    uint256 public constant MASTERCHEF_YOC_PER_BLOCK =
        20000 * ACC_YOC_PRECISION;

    uint256 public constant DEPOSIT_FEE = 19;
    uint256 public constant WITHDRAW_FEE = 19;
    uint256 public constant PERCENT_PRECISION = 10000;
    uint256 public constant MIN_PERIOD = 7 days;

    event AddPool(
        uint256 indexed pid,
        uint256 allocPoint,
        IERC20 indexed lpToken,
        bool isYocPool
    );
    event SetPool(uint256 indexed pid, uint256 allocPoint);
    event UpdatePool(
        uint256 indexed pid,
        uint256 lastRewardBlock,
        uint256 lpSupply,
        uint256 accYocPerShare
    );
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        uint256 yocAmount
    );
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    constructor(IYOC _YOC, address _treasury) {
        YOC = _YOC;
        treasury = _treasury;
        treasuryFee = 20;
    }

    function poolLength() public view returns (uint256 pools) {
        pools = poolInfo.length;
    }

    function setTreasury(address _treasury) external onlyAuthorized {
        treasury = _treasury;
    }

    /// @notice Add a new pool. Can only be called by the owner.
    /// @param _allocPoint Number of allocation points for the new pool.
    /// @param _lpToken Address of the LP ERC-20 token.
    /// @param _isYocPool Whether the pool is YOC pool or not.
    /// @param _withUpdate Whether call "massUpdatePools" operation.
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _isYocPool,
        bool _withUpdate
    ) external onlyAuthorized {
        require(_lpToken.balanceOf(address(this)) >= 0, "None BEP20 tokens");
        require(
            address(_lpToken) != address(YOC),
            "YOC token can't be added to farm pools"
        );

        if (_withUpdate) {
            massUpdatePools();
        }

        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        lpToken.push(_lpToken);

        poolInfo.push(
            PoolInfo({
                allocPoint: _allocPoint,
                lastRewardBlock: block.number,
                accYocPerShare: 0,
                isYocPool: _isYocPool,
                totalShare: 0
            })
        );
        emit AddPool(lpToken.length.sub(1), _allocPoint, _lpToken, _isYocPool);
    }

    /// @notice Update the given pool's YOC allocation point. Can only be called by the owner.
    /// @param _pid The id of the pool. See `poolInfo`.
    /// @param _allocPoint New number of allocation points for the pool.
    /// @param _withUpdate Whether call "massUpdatePools" operation.
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external onlyAuthorized {
        updatePool(_pid);

        if (_withUpdate) {
            massUpdatePools();
        }

        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(
            _allocPoint
        );
        poolInfo[_pid].allocPoint = _allocPoint;
        emit SetPool(_pid, _allocPoint);
    }

    /// @notice View function for checking pending YOC rewards.
    /// @param _pid The id of the pool. See `poolInfo`.
    /// @param _user Address of the user.
    function pendingYOC(
        uint256 _pid,
        address _user
    ) external view returns (uint256) {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo memory user = userInfo[_pid][_user];
        uint256 accYocPerShare = pool.accYocPerShare;
        uint256 lpSupply = pool.totalShare;

        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = block.number.sub(pool.lastRewardBlock);
            uint256 yocReward = multiplier
                .mul(MASTERCHEF_YOC_PER_BLOCK)
                .mul(pool.allocPoint)
                .div(totalAllocPoint);
            accYocPerShare = accYocPerShare.add(
                yocReward
                    .mul(ACC_YOC_PRECISION)
                    .div(lpSupply)
                    .mul(100 - treasuryFee)
                    .div(100)
            );
        }

        return
            user.amount.mul(accYocPerShare).div(ACC_YOC_PRECISION).sub(
                user.rewardDebt
            );
    }

    /// @notice Update YOC reward for all the active pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            PoolInfo memory pool = poolInfo[pid];
            if (pool.allocPoint != 0) {
                updatePool(pid);
            }
        }
    }

    /// @notice Update reward variables for the given pool.
    /// @param _pid The id of the pool. See `poolInfo`.
    /// @return pool Returns the pool that was updated.
    function updatePool(uint256 _pid) public returns (PoolInfo memory pool) {
        pool = poolInfo[_pid];
        if (block.number > pool.lastRewardBlock) {
            uint256 lpSupply = pool.totalShare;

            if (lpSupply > 0 && totalAllocPoint > 0) {
                uint256 multiplier = block.number.sub(pool.lastRewardBlock);
                uint256 yocReward = multiplier
                    .mul(MASTERCHEF_YOC_PER_BLOCK)
                    .mul(pool.allocPoint)
                    .div(totalAllocPoint);
                pool.accYocPerShare = pool.accYocPerShare.add(
                    (
                        yocReward
                            .mul(ACC_YOC_PRECISION)
                            .div(lpSupply)
                            .mul(100 - treasuryFee)
                            .div(100)
                    )
                );
            }
            pool.lastRewardBlock = block.number;
            poolInfo[_pid] = pool;
            emit UpdatePool(
                _pid,
                pool.lastRewardBlock,
                lpSupply,
                pool.accYocPerShare
            );
        }
    }

    /// @notice Deposit LP tokens to pool.
    /// @param _pid The id of the pool. See `poolInfo`.
    /// @param _amount Amount of LP tokens to deposit.
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][msg.sender];

        if (user.amount > 0) {
            settlePendingYOC(msg.sender, _pid);
        }

        if (_amount > 0) {
            uint256 before = lpToken[_pid].balanceOf(address(this));
            lpToken[_pid].safeTransferFrom(msg.sender, address(this), _amount);
            _amount = lpToken[_pid].balanceOf(address(this)).sub(before);
            // If the pool is not YOC, apply the fee to it.
            if (!pool.isYocPool) {
                uint256 _depositFee = _amount.mul(DEPOSIT_FEE).div(
                    PERCENT_PRECISION
                );
                lpToken[_pid].transfer(treasury, _depositFee);
                _amount = _amount.sub(_depositFee);
            }
            user.amount = user.amount.add(_amount);
            user.lastDepositTimestamp = block.timestamp;

            pool.totalShare = pool.totalShare.add(_amount);
        }

        user.rewardDebt = user.amount.mul(pool.accYocPerShare).div(
            ACC_YOC_PRECISION
        );
        poolInfo[_pid] = pool;

        emit Deposit(msg.sender, _pid, _amount);
    }

    /// @notice Withdraw LP tokens from pool.
    /// @param _pid The id of the pool. See `poolInfo`.
    /// @param _amount Amount of LP tokens to withdraw.
    function withdraw(uint256 _pid, uint256 _amount) public nonReentrant {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][msg.sender];

        require(user.amount >= _amount, "withdraw: Insufficient");

        uint256 yocAmount = settlePendingYOC(msg.sender, _pid);

        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            uint256 _amountWithFee = _amount;
            uint256 lockedPeriod = block.timestamp - user.lastDepositTimestamp;
            // If the user withdraw in first 7 days, apply the fee to it.
            if (pool.isYocPool && lockedPeriod < MIN_PERIOD) {
                uint256 _withdrawFee = _amount.mul(WITHDRAW_FEE).div(
                    PERCENT_PRECISION
                );
                lpToken[_pid].transfer(treasury, _withdrawFee);
                _amountWithFee = _amount.sub(_withdrawFee);
            }
            lpToken[_pid].safeTransfer(msg.sender, _amountWithFee);
        }

        user.rewardDebt = user.amount.mul(pool.accYocPerShare).div(
            ACC_YOC_PRECISION
        );
        poolInfo[_pid].totalShare = poolInfo[_pid].totalShare.sub(_amount);

        emit Withdraw(msg.sender, _pid, _amount, yocAmount);
    }

    function withdrawAll(uint256 _pid) external {
        UserInfo storage user = userInfo[_pid][msg.sender];
        withdraw(_pid, user.amount);
    }

    /// @notice Withdraw without caring about the rewards. EMERGENCY ONLY.
    /// @param _pid The id of the pool. See `poolInfo`.
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.totalShare = pool.totalShare > amount
            ? pool.totalShare.sub(amount)
            : 0;

        // Note: transfer can fail or succeed if `amount` is zero.
        lpToken[_pid].safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    /// @notice Settles, distribute the pending YOC rewards for given user.
    /// @param _user The user address for settling rewards.
    /// @param _pid The pool id.
    function settlePendingYOC(
        address _user,
        uint256 _pid
    ) internal returns (uint256) {
        UserInfo memory user = userInfo[_pid][_user];
        uint256 accYOC = user.amount.mul(poolInfo[_pid].accYocPerShare).div(
            ACC_YOC_PRECISION
        );
        uint256 pending = accYOC.sub(user.rewardDebt);
        uint256 pendingTreasury = pending.mul(treasuryFee).div(
            100 - treasuryFee
        );
        _safeTransfer(_user, pending);
        _safeTransfer(treasury, pendingTreasury);

        return pending;
    }

    /// @notice Safe Transfer YOC.
    /// @param _to The YOC receiver address.
    /// @param _amount transfer YOC amounts.
    function _safeTransfer(address _to, uint256 _amount) public {
        if (_amount > 0) {
            YOC.mint(_to, _amount);
        }
    }
}
