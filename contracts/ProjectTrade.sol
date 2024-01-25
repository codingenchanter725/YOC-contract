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
        uint256 price;
        uint256 buyOrderId;
        uint256 sellOrderId;
        uint256 timestamp;
        bool isCancelled;
    }

    struct Order {
        address owner;
        uint256 totalAmount; // Ptoken amount
        uint256 orderPrice;
        uint256[] transactionIds;
        uint256 remainingAmount;
        bool isCancelled;
        bool isBuy;
        uint256 timestamp;
    }

    address[] public PTokens;
    mapping(address => Transaction[]) public transactions;
    mapping(address => Order[]) public orders;
    mapping(address => uint256[]) public buyOrders;
    mapping(address => uint256[]) public sellOrders;
    mapping(address => mapping(address => uint256))
        public balanceOfUserInContract;
    mapping(address => bool) _pause;

    event OrderCreated(
        address pToken,
        address owner,
        uint256 indexed orderId,
        uint256 amount,
        uint256 orderPrice,
        bool isBuy
    );
    event SetPrice(address pToken, uint256 price, uint256 timestamp);
    event AddNewProjectToken(address pToken, uint256 timestamp);
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
    event CancelOrder(address pToken, uint256 orderId);
    event Pause(address pToken);
    event CancelAllOrders(address pToken);
    event RemoveAllOrders(address pToken);

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

    function pause(address _pToken) public onlyOwner {
        _pause[_pToken] = true;
        emit Pause(_pToken);
    }

    function unpause(address _pToken) public onlyOwner {
        _pause[_pToken] = false;
    }

    function getBuyOrders(
        address _pToken
    ) public view returns (Order[] memory) {
        Order[] memory returnOrders = new Order[](buyOrders[_pToken].length);
        for (uint256 i = 0; i < buyOrders[_pToken].length; i++) {
            returnOrders[i] = orders[_pToken][buyOrders[_pToken][i]];
        }
        return returnOrders;
    }

    function getSellOrders(
        address _pToken
    ) public view returns (Order[] memory) {
        Order[] memory returnOrders = new Order[](sellOrders[_pToken].length);
        for (uint256 i = 0; i < sellOrders[_pToken].length; i++) {
            returnOrders[i] = orders[_pToken][sellOrders[_pToken][i]];
        }
        return returnOrders;
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

        Order memory newOrder = Order({
            owner: msg.sender,
            totalAmount: _amount,
            orderPrice: _price,
            transactionIds: new uint256[](0),
            remainingAmount: _amount,
            isCancelled: false,
            isBuy: true,
            timestamp: block.timestamp
        });
        orders[_pToken].push(newOrder);
        buyOrders[_pToken].push(0);

        if (buyOrders[_pToken].length == 1) {
            PTokens.push(_pToken);
            emit AddNewProjectToken(_pToken, block.timestamp);
        }

        // smaller order => 10, 9, 8, 7 ...
        uint256 orderId = buyOrders[_pToken].length - 1;
        if (buyOrders[_pToken].length > 1) {
            for (uint256 i = buyOrders[_pToken].length - 2; i >= 0; i--) {
                if (
                    newOrder.orderPrice <=
                    orders[_pToken][buyOrders[_pToken][i]].orderPrice
                ) {
                    orderId = i + 1;
                    break;
                }
                if (i == 0) {
                    orderId = 0;
                    break;
                }
            }
        }
        for (uint256 i = buyOrders[_pToken].length - 1; i > orderId; i--) {
            buyOrders[_pToken][i] = buyOrders[_pToken][i - 1];
        }
        buyOrders[_pToken][orderId] = orders[_pToken].length - 1;
        emit OrderCreated(
            _pToken,
            msg.sender,
            orders[_pToken].length - 1,
            _amount,
            _price,
            true
        );

        // processOrder(_pToken);
        uint256 tSellOrderId = 0;
        uint256 tBuyOrderId = orders[_pToken].length - 1;
        for (uint256 i = 0; i < sellOrders[_pToken].length; i++) {
            tSellOrderId = sellOrders[_pToken][i];
            if (
                orders[_pToken][tSellOrderId].isCancelled == true ||
                orders[_pToken][tSellOrderId].remainingAmount == 0 ||
                orders[_pToken][tBuyOrderId].remainingAmount == 0
            ) continue;

            if (
                orders[_pToken][tSellOrderId].orderPrice <=
                orders[_pToken][tBuyOrderId].orderPrice
            ) {
                processOrder(_pToken, tBuyOrderId, tSellOrderId);
            } else break;
        }
    }

    function sell(address _pToken, uint256 _amount, uint256 _price) external {
        require(_amount > 0, "invalid amount");

        IERC20(_pToken).transferFrom(msg.sender, address(this), _amount);
        balanceOfUserInContract[_pToken][msg.sender] += _amount;

        Order memory newOrder = Order({
            owner: msg.sender,
            totalAmount: _amount,
            orderPrice: _price,
            transactionIds: new uint256[](0),
            remainingAmount: _amount,
            isCancelled: false,
            isBuy: false,
            timestamp: block.timestamp
        });
        orders[_pToken].push(newOrder);
        sellOrders[_pToken].push(0);

        if (sellOrders[_pToken].length == 1) {
            PTokens.push(_pToken);
            emit AddNewProjectToken(_pToken, block.timestamp);
        }

        // bigger order => 1, 2, 3, 4 ...
        uint256 orderId = sellOrders[_pToken].length - 1;
        if (sellOrders[_pToken].length > 1) {
            for (uint256 i = sellOrders[_pToken].length - 2; i >= 0; i--) {
                if (
                    newOrder.orderPrice >=
                    orders[_pToken][sellOrders[_pToken][i]].orderPrice
                ) {
                    orderId = i + 1;
                    break;
                }
                if (i == 0) {
                    orderId = 0;
                    break;
                }
            }
        }
        for (uint256 i = sellOrders[_pToken].length - 1; i > orderId; i--) {
            if (i == 0) continue;
            sellOrders[_pToken][i] = sellOrders[_pToken][i - 1];
        }
        sellOrders[_pToken][orderId] = orders[_pToken].length - 1;

        emit OrderCreated(
            _pToken,
            msg.sender,
            orders[_pToken].length - 1,
            _amount,
            _price,
            false
        );

        // // processOrder(_pToken);
        uint256 tBuyOrderId = 0;
        uint256 tSellOrderId = orders[_pToken].length - 1;
        for (uint256 i = 0; i < buyOrders[_pToken].length; i++) {
            tBuyOrderId = buyOrders[_pToken][i];
            if (
                orders[_pToken][tBuyOrderId].isCancelled == true ||
                orders[_pToken][tBuyOrderId].remainingAmount == 0 ||
                orders[_pToken][tSellOrderId].remainingAmount == 0
            ) continue;

            if (
                orders[_pToken][tBuyOrderId].orderPrice >=
                orders[_pToken][tSellOrderId].orderPrice
            ) {
                processOrder(_pToken, tBuyOrderId, tSellOrderId);
            } else break;
        }
    }

    function processOrder(
        address _pToken,
        uint256 tBuyOrderId,
        uint256 tSellOrderId
    ) internal {
        uint256 tradeAmount = 0;
        if (
            orders[_pToken][tBuyOrderId].remainingAmount <=
            orders[_pToken][tSellOrderId].remainingAmount
        ) {
            tradeAmount = orders[_pToken][tBuyOrderId].remainingAmount;
        } else {
            tradeAmount = orders[_pToken][tSellOrderId].remainingAmount;
        }

        address sellOrderOwner = orders[_pToken][tSellOrderId].owner;
        address buyOrderOwner = orders[_pToken][tBuyOrderId].owner;

        IERC20(_pToken).transfer(buyOrderOwner, tradeAmount);
        orders[_pToken][tBuyOrderId].remainingAmount -= tradeAmount;
        orders[_pToken][tSellOrderId].remainingAmount -= tradeAmount;

        uint256 tradePrice = orders[_pToken][tSellOrderId].orderPrice;
        if (
            orders[_pToken][tBuyOrderId].timestamp <
            orders[_pToken][tSellOrderId].timestamp
        ) {
            // buyer order's priority is higher, trade price is buyer order's price, seller will get full YUSD what buyer paid
            setPrice(_pToken, tradePrice);
            // calculate fee
            uint256 paidYUSDAmount = (((tradeAmount * tradePrice) /
                (10 ** IERC20(_pToken).decimals())) *
                (PERCENT_PRECISION - FEE)) / PERCENT_PRECISION;

            YUSD.transfer(sellOrderOwner, paidYUSDAmount);
        } else {
            // seller order's priority is higher, the rest amount will be retieved to the buyer.
            setPrice(_pToken, tradePrice);
            // calculate fee
            uint256 paidYUSDAmount = (((tradeAmount * tradePrice) /
                (10 ** IERC20(_pToken).decimals())) *
                (PERCENT_PRECISION - FEE)) / PERCENT_PRECISION;

            YUSD.transfer(sellOrderOwner, paidYUSDAmount);

            if (tradePrice < orders[_pToken][tBuyOrderId].orderPrice) {
                uint256 retrievedYUSDAmount = (((tradeAmount *
                    (orders[_pToken][tBuyOrderId].orderPrice - tradePrice)) /
                    (10 ** IERC20(_pToken).decimals())) *
                    (PERCENT_PRECISION + FEE)) / PERCENT_PRECISION;
                YUSD.transfer(buyOrderOwner, retrievedYUSDAmount);
            }
        }

        // require(false, concatStrings("ddd", uint256ToString(paidYUSDAmount)));

        Transaction memory newTransaction = Transaction({
            amount: tradeAmount,
            price: tradePrice,
            buyOrderId: tBuyOrderId,
            sellOrderId: tSellOrderId,
            isCancelled: false,
            timestamp: block.timestamp
        });
        transactions[_pToken].push(newTransaction);
        uint256 transactionId = transactions[_pToken].length - 1;

        orders[_pToken][tBuyOrderId].transactionIds.push(transactionId);
        orders[_pToken][tSellOrderId].transactionIds.push(transactionId);

        // event for Seller
        emit TradeOrder(_pToken, sellOrderOwner, tSellOrderId);
        balanceOfUserInContract[_pToken][sellOrderOwner] -= tradeAmount;
        // event for Buyer
        emit TradeOrder(_pToken, buyOrderOwner, tBuyOrderId);

        emit TradeTransaction(
            _pToken,
            tradeAmount,
            tradePrice,
            transactionId,
            buyOrderOwner,
            sellOrderOwner,
            tBuyOrderId,
            tSellOrderId,
            block.timestamp
        );
    }

    function processOrderdd(address _pToken) internal {
        for (uint256 iSell = 0; iSell < sellOrders[_pToken].length; iSell++) {
            if (
                orders[_pToken][sellOrders[_pToken][iSell]].isCancelled ==
                true ||
                orders[_pToken][sellOrders[_pToken][iSell]].remainingAmount == 0
            ) continue;

            for (uint256 iBuy = 0; iBuy < buyOrders[_pToken].length; iBuy++) {
                if (
                    orders[_pToken][buyOrders[_pToken][iBuy]].isCancelled ==
                    true ||
                    orders[_pToken][buyOrders[_pToken][iBuy]].remainingAmount ==
                    0
                ) continue;

                for (
                    uint256 jSell = iSell;
                    jSell < sellOrders[_pToken].length;
                    jSell++
                ) {
                    if (
                        orders[_pToken][sellOrders[_pToken][jSell]]
                            .isCancelled ==
                        true ||
                        orders[_pToken][sellOrders[_pToken][jSell]]
                            .remainingAmount ==
                        0 ||
                        orders[_pToken][buyOrders[_pToken][iBuy]]
                            .remainingAmount ==
                        0
                    ) continue;

                    if (
                        orders[_pToken][sellOrders[_pToken][jSell]]
                            .orderPrice <=
                        orders[_pToken][buyOrders[_pToken][iBuy]].orderPrice
                    ) {
                        uint256 tradeAmount = 0;
                        if (
                            orders[_pToken][sellOrders[_pToken][jSell]]
                                .remainingAmount <=
                            orders[_pToken][buyOrders[_pToken][iBuy]]
                                .remainingAmount
                        ) {
                            tradeAmount = orders[_pToken][
                                sellOrders[_pToken][jSell]
                            ].remainingAmount;
                        } else {
                            tradeAmount = orders[_pToken][
                                buyOrders[_pToken][iBuy]
                            ].remainingAmount;
                        }

                        IERC20(_pToken).transfer(
                            orders[_pToken][buyOrders[_pToken][iBuy]].owner,
                            tradeAmount
                        );
                        orders[_pToken][sellOrders[_pToken][jSell]]
                            .remainingAmount -= tradeAmount;
                        orders[_pToken][buyOrders[_pToken][iBuy]]
                            .remainingAmount -= tradeAmount;

                        if (
                            orders[_pToken][buyOrders[_pToken][iBuy]]
                                .timestamp <
                            orders[_pToken][sellOrders[_pToken][jSell]]
                                .timestamp
                        ) {
                            // buyer order's priority is higher, trade price is buyer order's price, seller will get full YUSD what buyer paid
                            setPrice(
                                _pToken,
                                orders[_pToken][buyOrders[_pToken][iBuy]]
                                    .orderPrice
                            );
                            // calculate fee
                            uint256 paidYUSDAmount = (((tradeAmount *
                                orders[_pToken][buyOrders[_pToken][iBuy]]
                                    .orderPrice) /
                                (10 ** IERC20(_pToken).decimals())) *
                                (PERCENT_PRECISION - FEE)) / PERCENT_PRECISION;

                            YUSD.transfer(
                                orders[_pToken][sellOrders[_pToken][jSell]]
                                    .owner,
                                paidYUSDAmount
                            );
                        } else {
                            // seller order's priority is higher, the rest amount will be retieved to the buyer.
                            setPrice(
                                _pToken,
                                orders[_pToken][sellOrders[_pToken][jSell]]
                                    .orderPrice
                            );
                            // calculate fee
                            uint256 paidYUSDAmount = (((tradeAmount *
                                orders[_pToken][sellOrders[_pToken][jSell]]
                                    .orderPrice) /
                                (10 ** IERC20(_pToken).decimals())) *
                                (PERCENT_PRECISION - FEE)) / PERCENT_PRECISION;

                            YUSD.transfer(
                                orders[_pToken][sellOrders[_pToken][jSell]]
                                    .owner,
                                paidYUSDAmount
                            );

                            if (
                                orders[_pToken][sellOrders[_pToken][jSell]]
                                    .orderPrice <
                                orders[_pToken][buyOrders[_pToken][iBuy]]
                                    .orderPrice
                            ) {
                                uint256 retrievedYUSDAmount = (((tradeAmount *
                                    (orders[_pToken][buyOrders[_pToken][iBuy]]
                                        .orderPrice -
                                        orders[_pToken][
                                            sellOrders[_pToken][jSell]
                                        ].orderPrice)) /
                                    (10 ** IERC20(_pToken).decimals())) *
                                    (PERCENT_PRECISION + FEE)) /
                                    PERCENT_PRECISION;

                                YUSD.transfer(
                                    orders[_pToken][buyOrders[_pToken][iBuy]]
                                        .owner,
                                    retrievedYUSDAmount
                                );
                            }
                        }

                        // require(
                        //     false,
                        //     concatStrings("ddd", uint256ToString(paidYUSDAmount))
                        // );

                        Transaction memory newTransaction = Transaction({
                            amount: tradeAmount,
                            price: price[_pToken],
                            buyOrderId: buyOrders[_pToken][iBuy],
                            sellOrderId: sellOrders[_pToken][jSell],
                            isCancelled: false,
                            timestamp: block.timestamp
                        });
                        transactions[_pToken].push(newTransaction);

                        orders[_pToken][sellOrders[_pToken][jSell]]
                            .transactionIds
                            .push(transactions[_pToken].length - 1);
                        orders[_pToken][buyOrders[_pToken][iBuy]]
                            .transactionIds
                            .push(transactions[_pToken].length - 1);

                        // event for Seller
                        emit TradeOrder(
                            _pToken,
                            orders[_pToken][sellOrders[_pToken][jSell]].owner,
                            sellOrders[_pToken][jSell]
                        );
                        balanceOfUserInContract[_pToken][
                            orders[_pToken][sellOrders[_pToken][jSell]].owner
                        ] -= tradeAmount;
                        // event for Buyer
                        emit TradeOrder(
                            _pToken,
                            orders[_pToken][buyOrders[_pToken][iBuy]].owner,
                            buyOrders[_pToken][iBuy]
                        );

                        emit TradeTransaction(
                            _pToken,
                            tradeAmount,
                            price[_pToken],
                            transactions[_pToken].length - 1,
                            orders[_pToken][buyOrders[_pToken][iBuy]].owner,
                            orders[_pToken][sellOrders[_pToken][jSell]].owner,
                            buyOrders[_pToken][iBuy],
                            sellOrders[_pToken][jSell],
                            block.timestamp
                        );
                    } else break;
                }
            }
        }

        // filterOrders(_pToken);
    }

    function filterOrders(address _pToken) internal {
        uint256 buyFilteredCount = 0;
        for (uint256 iBuy = 0; iBuy < buyOrders[_pToken].length; iBuy++) {
            if (orders[_pToken][buyOrders[_pToken][iBuy]].remainingAmount > 0) {
                buyFilteredCount++;
            }
        }
        uint256 buyCurrentIndex = 0;
        uint256[] memory updateBuyOrders = new uint256[](buyFilteredCount);
        for (uint256 iBuy = 0; iBuy < buyOrders[_pToken].length; iBuy++) {
            if (orders[_pToken][buyOrders[_pToken][iBuy]].remainingAmount > 0) {
                updateBuyOrders[buyCurrentIndex] = buyOrders[_pToken][iBuy];
            }
        }
        buyOrders[_pToken] = updateBuyOrders;

        uint256 sellFilteredCount = 0;
        for (uint256 iSell = 0; iSell < sellOrders[_pToken].length; iSell++) {
            if (
                orders[_pToken][sellOrders[_pToken][iSell]].remainingAmount > 0
            ) {
                sellFilteredCount++;
            }
        }
        uint256 sellCurrentIndex = 0;
        uint256[] memory updateSellOrders = new uint256[](sellFilteredCount);
        for (uint256 iSell = 0; iSell < sellOrders[_pToken].length; iSell++) {
            if (
                orders[_pToken][sellOrders[_pToken][iSell]].remainingAmount > 0
            ) {
                updateSellOrders[sellCurrentIndex] = sellOrders[_pToken][iSell];
            }
        }
        sellOrders[_pToken] = updateSellOrders;
    }

    function cancelOrder(address _pToken, uint256 _orderId) public {
        require(
            orders[_pToken][_orderId].owner == msg.sender ||
                msg.sender == owner(),
            "You are not owner of the order"
        );
        orders[_pToken][_orderId].isCancelled = true;
        if (orders[_pToken][_orderId].remainingAmount > 0) {
            if (orders[_pToken][_orderId].isBuy == true) {
                uint256 YUSDAmountWithFee = (((orders[_pToken][_orderId]
                    .remainingAmount * orders[_pToken][_orderId].orderPrice) /
                    (10 ** IERC20(_pToken).decimals())) *
                    (PERCENT_PRECISION + FEE)) / PERCENT_PRECISION;
                IERC20(YUSD).transfer(
                    orders[_pToken][_orderId].owner,
                    YUSDAmountWithFee
                );
            } else {
                IERC20(_pToken).transfer(
                    orders[_pToken][_orderId].owner,
                    orders[_pToken][_orderId].remainingAmount
                );
            }
        }
        emit CancelOrder(_pToken, _orderId);
    }

    function getBalanceOfUserInContact(
        address _pToken,
        address _user
    ) public view returns (uint256) {
        return balanceOfUserInContract[_pToken][_user];
    }

    function cancelOrders(address _pToken) external {
        for (uint256 i = 0; i < orders[_pToken].length; i++) {
            if (orders[_pToken][i].isCancelled == false) {
                cancelOrder(_pToken, i);
            }
        }
        emit CancelAllOrders(_pToken);
    }

    function removeOrders(address _pToken) external {
        for (uint256 i = 0; i < orders[_pToken].length; i++) {
            removeOrder(_pToken, i);
        }
        delete orders[_pToken];
        delete buyOrders[_pToken];
        delete sellOrders[_pToken];
        emit RemoveAllOrders(_pToken);
    }

    function removeOrder(address _pToken, uint256 _orderId) internal {
        require(
            orders[_pToken][_orderId].owner == msg.sender ||
                msg.sender == owner(),
            "You are not owner of the order"
        );
        if (orders[_pToken][_orderId].remainingAmount > 0) {
            if (orders[_pToken][_orderId].isCancelled) return;
            if (orders[_pToken][_orderId].isBuy == true) {
                uint256 YUSDAmountWithFee = (((orders[_pToken][_orderId]
                    .remainingAmount * orders[_pToken][_orderId].orderPrice) /
                    (10 ** IERC20(_pToken).decimals())) *
                    (PERCENT_PRECISION + FEE)) / PERCENT_PRECISION;
                IERC20(YUSD).transfer(
                    orders[_pToken][_orderId].owner,
                    YUSDAmountWithFee
                );
            } else {
                IERC20(_pToken).transfer(
                    orders[_pToken][_orderId].owner,
                    orders[_pToken][_orderId].remainingAmount
                );
            }
        }
    }
}
