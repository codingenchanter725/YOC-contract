// SPDX-License-Identifier: MIT

// https://eips.ethereum.org/EIPS/eip-20

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IYocswapRouter02.sol";
import "./interfaces/IWETH.sol";

// ----------------------------------------------------------------------------
// ERC Token Standard #20 Interface
//
// ----------------------------------------------------------------------------
interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(
        address tokenOwner
    ) external view returns (uint256 balance);

    function allowance(
        address tokenOwner,
        address spender
    ) external view returns (uint256 remaining);

    function transfer(
        address to,
        uint256 tokens
    ) external returns (bool success);

    function approve(
        address spender,
        uint256 tokens
    ) external returns (bool success);

    function transferFrom(
        address from,
        address to,
        uint256 tokens
    ) external returns (bool success);

    event Transfer(address indexed from, address indexed to, uint256 tokens);
    event Approval(
        address indexed tokenOwner,
        address indexed spender,
        uint256 tokens
    );
}

// ----------------------------------------------------------------------------
// Safe Math Library
// ----------------------------------------------------------------------------
contract SafeMath {
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256 c) {
        c = a + b;
        require(c >= a);
    }

    function safeSub(uint256 a, uint256 b) public pure returns (uint256 c) {
        require(b <= a);
        c = a - b;
    }

    function safeMul(uint256 a, uint256 b) public pure returns (uint256 c) {
        c = a * b;
        require(a == 0 || c / a == b);
    }

    function safeDiv(uint256 a, uint256 b) public pure returns (uint256 c) {
        require(b > 0);
        c = a / b;
    }
}

contract YUSD is IERC20, SafeMath, Ownable {
    // name, symbol, decimals are a part of ERC20 standard, and are OPTIONAL
    string public constant name = "YUSD";
    string public constant symbol = "YUSD";
    uint8 public decimals = 6;
    uint256 public _totalSupply = 0;
    uint256 public _burnSupply = 0;
    bool public autoFunction1Action = false;

    address public admin;
    address public immutable WETH;
    address public immutable YOC;
    AggregatorV3Interface internal ETHFeed;
    IYocswapRouter02 internal YocSwapRouter;

    uint256 public lastMintTime;
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    event Mint(address user, uint256 YUSDAmount, uint256 PaidAmount);
    event Burn(
        address user,
        uint256 YUSDAmount,
        uint256 ETHAmount,
        uint256 YOCAmount
    );
    event Function1(uint256 transferETHAmount, uint256 transferYOCAmount, bool);
    event Function2(bool isETHtoYOC, uint256 transferredAmount);
    event SetAutoFunction1Action(bool state);

    modifier onlyAdmin() {
        require(admin == msg.sender, "You are not an administrator");
        _;
    }

    /**
     * Constrctor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    constructor(
        address _WETH,
        address _YOC,
        address _YocSwapRouter,
        address _admin,
        address _aggregator
    ) {
        WETH = _WETH;
        YOC = _YOC;
        admin = _admin;
        ETHFeed = AggregatorV3Interface(_aggregator);
        YocSwapRouter = IYocswapRouter02(_YocSwapRouter);
    }

    function setAdmin(address _admin) public onlyOwner {
        admin = _admin;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply - _burnSupply;
    }

    function balanceOf(
        address account
    ) public view virtual override returns (uint256) {
        return balances[account];
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual override returns (uint256) {
        return allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) public virtual override returns (bool) {
        require(spender != address(0), "ERC20: approve to the zero address");

        allowances[_msgSender()][spender] += amount;
        emit Approval(_msgSender(), spender, amount);
        return true;
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public virtual override returns (bool success) {
        require(recipient != address(0), "ERC20: transfer to the zero address");

        balances[msg.sender] = safeSub(balances[msg.sender], amount);
        balances[recipient] = safeAdd(balances[recipient], amount);

        emit Transfer(msg.sender, recipient, amount);

        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool success) {
        // I, who allowed the Swap/Dex (msg.sender) to do transaction on my behalf, allow them to
        // deduct the amount
        allowances[sender][msg.sender] = safeSub(
            allowances[sender][msg.sender],
            amount
        );

        // Subtract amount from "sender" address
        balances[sender] = safeSub(balances[sender], amount);
        // Add amount to "to" address
        balances[recipient] = safeAdd(balances[recipient], amount);

        // Emit the event, it'll be visible in logs
        emit Transfer(sender, recipient, amount);

        return true;
    }

    /// @notice return the balance by ETH(decimal:18) for _amount YUSD
    /// @param _amount the amount that user wants to mint.
    function getETHAmountForMint(
        uint256 _amount
    ) public view returns (uint256) {
        return (_amount * 10 ** 6 * 10 ** 18) / uint256(getETHPrice());
    }

    /// @notice return the ETH price by USD(decimal:6)
    function getETHPrice() public view returns (uint256) {
        (, int256 USD, , , ) = ETHFeed.latestRoundData(); // return price that the decimal is 8, USD decimal is 6 so `divide 100`
        return uint256(USD / 100);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += (amount * 10 ** decimals);
        unchecked {
            balances[account] += (amount * 10 ** decimals);
        }
        emit Transfer(address(0), account, amount * 10 ** decimals);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _burnSupply += (amount * 10 ** decimals);
        unchecked {
            balances[account] -= (amount * 10 ** decimals);
        }
        emit Transfer(account, address(0), amount * 10 ** decimals);
    }

    function mint(uint256 _amount) public payable returns (bool success) {
        uint256 requiredETHAmount = _amount * 10 ** 6 * 10 ** 18 / getETHPrice();
        require(msg.value >= requiredETHAmount, "Insufficient payment");
        // uint256 beforeETHBalance = address(this).balance;
        // uint256 beforeYOCBalance = IERC20(YOC).balanceOf(address(this));

        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = YOC;
        YocSwapRouter.swapExactETHForTokens{value: (msg.value * 25) / 100}(
            0,
            path,
            address(this),
            block.timestamp + 3600
        );

        // uint256 exactETHAmount = beforeETHBalance - address(this).balance;
        // uint256 exactYOCAmount = IERC20(YOC).balanceOf(address(this)) -
        //     beforeYOCBalance;

        _mint(msg.sender, _amount);
        emit Mint(msg.sender, _amount, requiredETHAmount);
        return true;
    }

    function burn(uint256 _amount) public returns (bool success) {
        require(
            balanceOf(msg.sender) >= _amount * 10 ** decimals,
            "Insufficient YUSD"
        );

        uint256 USDprice = price();
        if (USDprice > 10 ** 6) USDprice = 10 ** 6;
        uint256 totalETHBalance = ((_amount * USDprice) * (10 ** 18)) /
            getETHPrice();
        address[] memory WETH_YOCpath = new address[](2);
        WETH_YOCpath[0] = WETH;
        WETH_YOCpath[1] = YOC;
        uint256[] memory amounts = YocSwapRouter.getAmountsOut(
            (totalETHBalance * 25) / 100,
            WETH_YOCpath
        );

        IERC20(YOC).transfer(msg.sender, amounts[1]);
        payable(msg.sender).transfer((totalETHBalance * 75) / 100);
        _burn(msg.sender, _amount);
        emit Burn(
            msg.sender,
            _amount,
            (totalETHBalance * 75) / 100,
            amounts[1]
        );
        return true;
    }

    /// @notice return the YUSD price by USD(decimal:6)
    function price() public view returns (uint256) {
        // USD
        uint256 YOCBalance = IERC20(YOC).balanceOf(address(this));
        address[] memory YOC_WETHpath = new address[](2);
        YOC_WETHpath[0] = YOC;
        YOC_WETHpath[1] = WETH;
        uint256[] memory amounts = YocSwapRouter.getAmountsOut(
            YOCBalance,
            YOC_WETHpath
        );
        uint256 totalETHUSDBalance = ((address(this).balance + amounts[1]) *
            getETHPrice()) / 10 ** 18;
        return totalETHUSDBalance / (totalSupply() / 10 ** decimals);
    }

    /// @notice return the percentage of ETH(decimal:2)
    function rate() public view returns (uint256) {
        uint256 YOCBalance = IERC20(YOC).balanceOf(address(this));
        address[] memory YOC_WETHpath = new address[](2);
        YOC_WETHpath[0] = YOC;
        YOC_WETHpath[1] = WETH;
        uint256[] memory amounts = YocSwapRouter.getAmountsOut(
            YOCBalance,
            YOC_WETHpath
        );
        uint256 totalETHBalance = address(this).balance + amounts[1];
        return (100 * address(this).balance) / totalETHBalance;
    }

    function function1() public onlyAdmin returns (bool success) {
        uint256 YOCBalance = IERC20(YOC).balanceOf(address(this));
        address[] memory YOC_WETHpath = new address[](2);
        YOC_WETHpath[0] = YOC;
        YOC_WETHpath[1] = WETH;
        uint256[] memory amounts1 = YocSwapRouter.getAmountsOut(
            YOCBalance,
            YOC_WETHpath
        );
        uint256 totalBalanceByETH = address(this).balance + amounts1[1];
        uint256 finalTotalETHBalance = (totalBalanceByETH * 70) / 100;
        uint256 finalETHBalance = (finalTotalETHBalance * 75) / 100;

        address[] memory WETH_YOCpath = new address[](2);
        WETH_YOCpath[0] = WETH;
        WETH_YOCpath[1] = YOC;
        uint256[] memory amounts2 = YocSwapRouter.getAmountsOut(
            (finalTotalETHBalance * 25) / 100,
            WETH_YOCpath
        );
        uint256 finalYOCBalance = amounts2[1];

        // if admin wants to withdraw YOC,ETH and finalbalances are bigger than current balances, can't withdraw them
        if (finalYOCBalance < YOCBalance) {
            // can withdraw YOC
            IERC20(YOC).transfer(admin, YOCBalance - finalYOCBalance);
            uint256 ETHBalance = address(this).balance;
            if (ETHBalance > finalETHBalance) {
                // can withdraw ETH
                payable(admin).transfer(ETHBalance - finalETHBalance);
                // YOC, ETH withdraw successfully
                emit Function1(
                    ETHBalance - finalETHBalance,
                    YOCBalance - finalYOCBalance,
                    true
                );
            } else {
                // YOC, not ETH withdraw successfully
                emit Function1(0, YOCBalance - finalYOCBalance, false);
            }
        } else {
            // can withdraw ETH
            uint256 ETHBalance = address(this).balance;
            if (ETHBalance > finalETHBalance) {
                // not YOC, ETH withdraw successfully
                payable(admin).transfer(ETHBalance - finalETHBalance);
                emit Function1(ETHBalance - finalETHBalance, 0, false);
            } else {
                // not YOC, not ETH withdraw successfully
                emit Function1(0, 0, false);
            }
        }

        return true;
    }

    function getReblancedDetailByFunction2()
        public view
        onlyAdmin
        returns (bool isETHtoYOC, uint256 transferredAmount)
    {
        uint256 YOCBalance = IERC20(YOC).balanceOf(address(this));
        address[] memory YOC_WETHpath = new address[](2);
        YOC_WETHpath[0] = YOC;
        YOC_WETHpath[1] = WETH;
        uint256[] memory amounts1 = YocSwapRouter.getAmountsOut(
            YOCBalance,
            YOC_WETHpath
        );
        uint256 totalBalanceByETH = address(this).balance + amounts1[1];
        uint256 finalETHBalance = (totalBalanceByETH * 75) / 100;

        if (finalETHBalance < address(this).balance) {
            // 75% < ETH, ETH > YOC : ETH->YOC
            isETHtoYOC = true;
            transferredAmount = address(this).balance - finalETHBalance;
        } else {
            // 75% > ETH => 25% < YOC -> YOC->ETH
            uint256[] memory amounts2 = YocSwapRouter.getAmountsIn(
                finalETHBalance - address(this).balance,
                YOC_WETHpath
            );
            isETHtoYOC = false;
            transferredAmount = amounts2[0];
        }
    }

    function function2() public onlyAdmin returns (bool success) {
        (
            bool isETHtoYOC,
            uint256 transferredAmount
        ) = getReblancedDetailByFunction2();

        if (isETHtoYOC) {
            // 75% < ETH, ETH > YOC : ETH->YOC
            address[] memory WETH_YOCpath = new address[](2);
            WETH_YOCpath[0] = WETH;
            WETH_YOCpath[1] = YOC;
            YocSwapRouter.swapExactETHForTokens{value: (transferredAmount)}(
                0,
                WETH_YOCpath,
                address(this),
                block.timestamp + 3600
            );
        } else {
            // 75% > ETH => 25% < YOC -> YOC->ETH
            address[] memory YOC_WETHpath = new address[](2);
            YOC_WETHpath[0] = YOC;
            YOC_WETHpath[1] = WETH;

            // IERC20(YOC).approve(address(YocSwapRouter), YOCBalance);
            // YocSwapRouter.swapTokensForExactETH(
            //     transferredAmount,
            //     YOCBalance,
            //     YOC_WETHpath,
            //     address(this),
            //     block.timestamp + 36000
            // );
            
            IERC20(YOC).approve(address(YocSwapRouter), transferredAmount);
            // require(IERC20(YOC).balanceOf(address(this)) >= transferredAmount, "insuficient amount");
            // require(false, concatStrings("bbbb:", uint256ToString(IERC20(YOC).balanceOf(address(this)))));
            // require(false, concatStrings("aaa:", uint256ToString(transferredAmount)));
            // require(false, concatStrings("bbbb:", uint256ToString((address(msg.sender).balance))));
            YocSwapRouter.swapExactTokensForETH(
                transferredAmount,
                0,
                YOC_WETHpath,
                address(this),
                block.timestamp + 3600
            );
        }
        emit Function2(isETHtoYOC, transferredAmount);
        return true;
    }

    function setAutoFunction1Action(
        bool state
    ) public onlyAdmin returns (bool) {
        autoFunction1Action = state;
        emit SetAutoFunction1Action(state);
        return true;
    }

    function uint256ToString(
        uint256 value
    ) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function concatStrings(
        string memory a,
        string memory b
    ) public pure returns (string memory) {
        bytes memory ba = bytes(a);
        bytes memory bb = bytes(b);
        bytes memory result = new bytes(ba.length + bb.length);
        for (uint i = 0; i < ba.length; i++) {
            result[i] = ba[i];
        }
        for (uint i = 0; i < bb.length; i++) {
            result[ba.length + i] = bb[i];
        }
        return string(result);
    }

    receive() external payable {
    }
}
