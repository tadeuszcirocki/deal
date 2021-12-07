//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./DealETH.sol";

/**
 * @title MockDealETH
 * WARNING: use only for testing and debugging purpose
 */
contract MockDealETH is DealETH {
    constructor(
        address _seller,
        uint256 _price,
        string memory _item,
        uint256 _deadline,
        uint256 _penalty,
        address _judge
    ) DealETH(_seller, _price, _item, _deadline, _penalty, _judge) {}

    //going back in time
    function setBuyTime(uint256 daysNo) public {
        buyTime = block.timestamp - daysNo * 1 days;
    }
}
