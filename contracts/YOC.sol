// SPDX-License-Identifier: MIT

// https://eips.ethereum.org/EIPS/eip-20

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

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

contract YOC is IERC20, SafeMath, Ownable {
    // name, symbol, decimals are a part of ERC20 standard, and are OPTIONAL
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public _totalSupply;

    uint256 public constant MINT_INTERVAL = 1; // minting interval in seconds
    uint256 public constant MINT_AMOUNT_PER = 100;
    uint256 public lastMintTime;
    mapping(address => bool) public isAddressForTransferToThere;

    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    /**
     * Constrctor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        lastMintTime = block.timestamp;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
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

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply += amount;
        unchecked {
            balances[account] += amount;
        }

        emit Transfer(address(0), account, amount);
    }

    function setAddressForTransferToThere(
        address _address,
        bool value
    ) external onlyOwner returns (bool success) {
        isAddressForTransferToThere[_address] = value;
        return true;
    }

    function mint() public returns (bool success) {
        uint256 timeElapsed = block.timestamp - lastMintTime;
        uint256 tokensToMint = (timeElapsed / MINT_INTERVAL) * MINT_AMOUNT_PER;
        if (tokensToMint > 0) {
            _mint(address(this), tokensToMint * 10 ** decimals);
            lastMintTime += (timeElapsed / MINT_INTERVAL) * MINT_INTERVAL;
        }
        return success;
    }

    function mintAndTransferToThere(
        address recipient,
        uint256 amount
    ) external returns (bool success) {
        require(
            isAddressForTransferToThere[msg.sender] == true, "This fuction is able to call by the MasterChef"
        );

        mint();

        allowances[address(this)][msg.sender] = amount;

        transferFrom(address(this), recipient, amount);

        emit Transfer(address(this), recipient, amount);

        return true;
    }
}
