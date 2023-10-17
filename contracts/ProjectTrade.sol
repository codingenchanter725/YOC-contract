// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

// ----------------------------------------------------------------------------
// ERC Token Standard #20 Interface
//
// ----------------------------------------------------------------------------
interface IERC20 {
    function decimals() external view returns (uint256);

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

contract ProjectTrade is SafeMath, Ownable {
    IERC20 public immutable YUSD;
    address public treasury;
    mapping(address => uint256) price; //  xx YUSD per 1 Ptoken

    uint256 public constant PERCENT_PRECISION = 10000; // percent precision
    uint256 public FEE = 19; // 0.19%

    struct Transaction {
        uint256 amount;
        uint256 buyPrice;
        uint256 sellPrice;
        uint256 buyOrderId;
        uint256 sellOrderId;
        uint256 timestamp;
    }

    struct Order {
        address owner;
        uint256 totalAmount; // Ptoken amount
        uint256 orderPrice;
        uint256[] transactionIds;
        uint256 remainingAmount;
        bool isCancelled;
        uint256 timestamp;
    }

    address[] public PTokens;
    mapping(address => Transaction[]) public transactions;
    mapping(address => Order[]) public buyOrders;
    mapping(address => Order[]) public sellOrders;

    event OrderCreated(
        address pToken,
        address owner,
        uint256 indexed orderId,
        uint256 amount,
        uint256 orderPrice,
        bool isBuy
    );
    event SetPrice(address pToken, uint256 price, uint256 timestamp);
    event AddProjectToken(address pToken, uint256 timestamp);
    event TradeOrder(address pToken, address owner, uint256 orderId);
    event TradeTransaction(
        address pToken,
        uint256 amount,
        uint256 tradePrice,
        uint256 transactionId,
        address buyOwner,
        address sellOwner,
        uint256 buyOrderId,
        uint256 sellOrderId,
        uint256 timestamp
    );

    constructor(address _YUSD, address _treasury) {
        YUSD = IERC20(_YUSD);
        treasury = _treasury;
    }

    function setPrice(address _pToken, uint256 _price) internal {
        price[_pToken] = _price;
        emit SetPrice(_pToken, _price, block.timestamp);
    }

    function setPriceByAdmin(
        address _pToken,
        uint256 _price
    ) external onlyOwner {
        setPrice(_pToken, _price);
    }

    function getBuyOrders(
        address _pToken
    ) public view returns (Order[] memory buyOrder) {
        buyOrder = buyOrders[_pToken];
    }

    function getSellOrders(
        address _pToken
    ) public view returns (Order[] memory sellOrder) {
        sellOrder = sellOrders[_pToken];
    }

    function getTransactions(
        address _pToken
    ) public view returns (Transaction[] memory transaction) {
        transaction = transactions[_pToken];
    }

    function buy(address _pToken, uint256 _amount, uint256 _price) external {
        require(_amount > 0, "invalid amount");
        uint256 YUSDAmount = (((_amount * _price) /
            (10 ** IERC20(_pToken).decimals())) * (PERCENT_PRECISION + FEE)) /
            PERCENT_PRECISION;
        YUSD.transferFrom(msg.sender, address(this), YUSDAmount);

        Order memory newBuyOrder = Order({
            owner: msg.sender,
            totalAmount: _amount,
            orderPrice: _price,
            transactionIds: new uint256[](0),
            remainingAmount: _amount,
            isCancelled: false,
            timestamp: block.timestamp
        });
        buyOrders[_pToken].push(
            Order(msg.sender, 0, 0, new uint256[](0), 0, false, block.timestamp)
        );

        if (buyOrders[_pToken].length == 1) {
            PTokens.push(_pToken);
            emit AddProjectToken(_pToken, block.timestamp);
        }

        // smaller order => 10, 9, 8, 7 ...
        uint256 orderId = buyOrders[_pToken].length - 1;
        if (buyOrders[_pToken].length > 1) {
            for (uint256 i = buyOrders[_pToken].length - 1; i >= 0; i--) {
                if (
                    newBuyOrder.orderPrice >= buyOrders[_pToken][i].orderPrice
                ) {
                    orderId = i + 1;
                    break;
                }
                if (i == 0) orderId = 0;
            }
        }
        for (uint256 i = buyOrders[_pToken].length - 1; i > orderId; i--) {
            buyOrders[_pToken][i] = buyOrders[_pToken][i - 1];
        }
        buyOrders[_pToken][orderId] = newBuyOrder;
        emit OrderCreated(
            _pToken,
            msg.sender,
            orderId,
            _amount,
            price[_pToken],
            true
        );

        processOrder(_pToken);
    }

    function sell(address _pToken, uint256 _amount, uint256 _price) external {
        require(_amount > 0, "invalid amount");

        IERC20(_pToken).transferFrom(msg.sender, address(this), _amount);

        Order memory newSellOrder = Order({
            owner: msg.sender,
            totalAmount: _amount,
            orderPrice: _price,
            transactionIds: new uint256[](0),
            remainingAmount: _amount,
            isCancelled: false,
            timestamp: block.timestamp
        });
        sellOrders[_pToken].push(
            Order(msg.sender, 0, 0, new uint256[](0), 0, false, block.timestamp)
        );

        if (buyOrders[_pToken].length == 1) {
            PTokens.push(_pToken);
            emit AddProjectToken(_pToken, block.timestamp);
        }

        // bigger order => 1, 2, 3, 4 ...
        uint256 orderId = sellOrders[_pToken].length - 1;
        if (sellOrders[_pToken].length > 1) {
            for (uint256 i = sellOrders[_pToken].length - 1; i >= 0; i--) {
                if (
                    newSellOrder.orderPrice >= sellOrders[_pToken][i].orderPrice
                ) {
                    orderId = i + 1;
                    break;
                }
                if (i == 0) orderId = 0;
            }
        }
        for (uint256 i = sellOrders[_pToken].length - 1; i > orderId; i--) {
            if (i == 0) continue;
            sellOrders[_pToken][i] = sellOrders[_pToken][i - 1];
        }
        sellOrders[_pToken][orderId] = newSellOrder;

        emit OrderCreated(
            _pToken,
            msg.sender,
            orderId,
            _amount,
            price[_pToken],
            false
        );
        processOrder(_pToken);
    }

    function processOrder(address _pToken) internal {
        for (uint256 iSell = 0; iSell < sellOrders[_pToken].length; iSell++) {
            if (
                sellOrders[_pToken][iSell].isCancelled == true ||
                sellOrders[_pToken][iSell].remainingAmount == 0
            ) continue;

            for (uint256 iBuy = 0; iBuy < buyOrders[_pToken].length; iBuy++) {
                if (
                    buyOrders[_pToken][iBuy].isCancelled == true ||
                    buyOrders[_pToken][iBuy].remainingAmount == 0
                ) continue;

                for (
                    uint256 jSell = iSell;
                    jSell < sellOrders[_pToken].length;
                    jSell++
                ) {
                    if (
                        sellOrders[_pToken][jSell].isCancelled == true ||
                        sellOrders[_pToken][jSell].remainingAmount == 0
                    ) continue;

                    if (
                        sellOrders[_pToken][jSell].orderPrice <=
                        buyOrders[_pToken][iBuy].orderPrice
                    ) {
                        uint256 tradeAmount = 0;
                        if (
                            sellOrders[_pToken][jSell].remainingAmount <=
                            buyOrders[_pToken][iBuy].remainingAmount
                        ) {
                            tradeAmount = sellOrders[_pToken][jSell]
                                .remainingAmount;
                        } else {
                            tradeAmount = buyOrders[_pToken][iBuy]
                                .remainingAmount;
                        }

                        setPrice(
                            _pToken,
                            sellOrders[_pToken][jSell].orderPrice
                        );

                        IERC20(_pToken).transfer(
                            buyOrders[_pToken][iBuy].owner,
                            tradeAmount
                        );
                        // calculate fee
                        uint256 paidYUSDAmount = (((tradeAmount *
                            buyOrders[_pToken][iBuy].orderPrice) /
                            (10 ** IERC20(_pToken).decimals())) *
                            (PERCENT_PRECISION - FEE)) / PERCENT_PRECISION;

                        YUSD.transfer(
                            sellOrders[_pToken][jSell].owner,
                            paidYUSDAmount
                        );
                        // require(
                        //     false,
                        //     concatStrings("ddd", uint256ToString(paidYUSDAmount))
                        // );

                        sellOrders[_pToken][jSell]
                            .remainingAmount -= tradeAmount;
                        buyOrders[_pToken][iBuy].remainingAmount -= tradeAmount;

                        Transaction memory newTransaction = Transaction({
                            amount: tradeAmount,
                            buyPrice: buyOrders[_pToken][iBuy].orderPrice,
                            sellPrice: sellOrders[_pToken][jSell].orderPrice,
                            buyOrderId: iBuy,
                            sellOrderId: jSell,
                            timestamp: block.timestamp
                        });
                        transactions[_pToken].push(newTransaction);

                        sellOrders[_pToken][jSell].transactionIds.push(
                            transactions[_pToken].length - 1
                        );
                        buyOrders[_pToken][iBuy].transactionIds.push(
                            transactions[_pToken].length - 1
                        );

                        // event for Seller
                        emit TradeOrder(
                            _pToken,
                            sellOrders[_pToken][jSell].owner,
                            jSell
                        );
                        emit TradeTransaction(
                            _pToken,
                            tradeAmount,
                            sellOrders[_pToken][jSell].orderPrice,
                            transactions[_pToken].length - 1,
                            sellOrders[_pToken][jSell].owner,
                            buyOrders[_pToken][iBuy].owner,
                            jSell,
                            iBuy,
                            block.timestamp
                        );
                        // event for Buyer
                        emit TradeOrder(
                            _pToken,
                            buyOrders[_pToken][iBuy].owner,
                            iBuy
                        );
                    } else break;
                }
            }
        }
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

    function addressToString(
        address _address
    ) public pure returns (string memory) {
        bytes memory _bytes = abi.encodePacked(_address);
        return bytesToHexString(_bytes);
    }

    function bytesToHexString(
        bytes memory _bytes
    ) public pure returns (string memory) {
        bytes memory _hexChars = "0123456789abcdef";
        bytes memory _hexString = new bytes(_bytes.length * 2);
        for (uint256 i = 0; i < _bytes.length; i++) {
            _hexString[i * 2] = _hexChars[uint8(_bytes[i] >> 4)];
            _hexString[i * 2 + 1] = _hexChars[uint8(_bytes[i] & 0x0f)];
        }
        return string(_hexString);
    }
}
