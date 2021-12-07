//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./Deal.sol";

/**
 * @title MockDeal
 * WARNING: use only for testing and debugging purpose
 */
contract MockDeal is Deal {
    constructor(
        address _seller,
        address _currency,
        uint256 _price,
        string memory _item,
        uint256 _deadline,
        uint256 _penalty,
        address _judge
    ) Deal(_seller, _currency, _price, _item, _deadline, _penalty, _judge) {}

    //going back in time
    function setBuyTime(uint256 daysNo) public {
        buyTime = block.timestamp - daysNo * 1 days;
    }
}
