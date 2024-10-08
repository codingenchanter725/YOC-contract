// SPDX-License-Identifier: MIT

// https://eips.ethereum.org/EIPS/eip-20

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ----------------------------------------------------------------------------
// Safe Math Library
// ----------------------------------------------------------------------------
contract SafeMath {
    function safeAdd(uint256 a, uint256 b) public pure returns (uint256 c) {
        c = a + b;
        require(c >= a);
    }

    function safeSub(uint256 a, uint256 b) public pure returns (uint256 c) {
        require(b <= a, "A is not bigger than b");
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

contract TOKEN is IERC20, SafeMath {
    // name, symbol, decimals are a part of ERC20 standard, and are OPTIONAL
    string public name;
    string public symbol;

    // Returns the number of decimals the token uses
    uint8 public decimals;

    uint256 public _totalSupply;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowed;

    /**
     * Constrctor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;

        // e.g. 6, means to divide the token amount by 1000000 to get its user representation
        decimals = 16;

        _totalSupply = 100000000000000 * (10 ** 16);

        balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    // Returns the token total supply
    function totalSupply() external view override returns (uint256) {
        return _totalSupply - balances[address(0)];
    }

    // Returns the account balance of the address provided
    function balanceOf(
        address tokenOwner
    ) external view override returns (uint256 balance) {
        return balances[tokenOwner];
    }

    // Returns the amount which spender is still allowed to withdraw from my balance
    function allowance(
        address tokenOwner,
        address spender
    ) external view override returns (uint256 remaining) {
        return allowed[tokenOwner][spender];
    }

    /*
        A spender on our behalf can handle the transfer, for example, a DEX
        A more common case than "approvals between people" is usually an approval from a person to a DApp. 
        For example: "Alice approves Uniswap to pull 100 USDT from her wallet." 
        And Uniswap is programed to take her USDT only at the moment when she's buying some other tokens against USDT.
    */
    function approve(
        address spender,
        uint256 tokens
    ) external override returns (bool success) {
        // I as a msg.sender approve spender address these many tokens to use
        allowed[msg.sender][spender] = tokens;
        emit Approval(msg.sender, spender, tokens);
        return true;
    }

    /*
        Transfer the amount of "tokens" to address "to"
        Must Fire Transfer event
        Should throw error if caller's account balance doesn't have enough tokens
        Transfer of 0 should also be treated as a normal transaction
    */
    function transfer(
        address to,
        uint256 tokens
    ) external override returns (bool success) {
        // Subtract tokens from callers balance
        balances[msg.sender] = safeSub(balances[msg.sender], tokens);

        // Add tokens to senders balance
        balances[to] = safeAdd(balances[to], tokens);

        // Emit the event, it'll be visible in logs
        emit Transfer(msg.sender, to, tokens);

        // Return true to say function worked successfully
        return true;
    }

    /*
        Transfer the amount of "tokens" from address "from" to address "to"
        Used for a withdraw workflow, allowing contracts to transfer tokens on your behalf
    */
    function transferFrom(
        address from,
        address to,
        uint256 tokens
    ) external override returns (bool success) {
        // Subtract tokens from "from" address
        balances[from] = safeSub(balances[from], tokens);

        // I, who allowed the Swap/Dex (msg.sender) to do transaction on my behalf, allow them to
        // deduct the tokens
        allowed[from][msg.sender] = safeSub(allowed[from][msg.sender], tokens);

        // Add tokens to "to" address
        balances[to] = safeAdd(balances[to], tokens);

        // Emit the event, it'll be visible in logs
        emit Transfer(from, to, tokens);

        // Return true to say function worked successfully
        return true;
    }
}
