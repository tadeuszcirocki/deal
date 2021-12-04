//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract Deal {
    event Bought(address _deal, address _seller, address _buyer);
    event Complained(address _deal, address _seller, address _buyer);
    event DealClosed(address _deal, address _seller, address _buyer);

    address public immutable seller;
    IERC20 public immutable currency;
    uint256 public immutable price;
    string public item;

    uint256 public immutable deadline;
    uint256 public immutable penalty;
    address public immutable judge;

    bool public bought;
    bool public complained;

    address private buyer;
    uint256 private buyTime;

    constructor(
        address _seller,
        address _currency,
        uint256 _price,
        string memory _item,
        uint256 _deadline,
        uint256 _penalty,
        address _judge
    ) {
        seller = _seller;
        currency = IERC20(_currency);
        price = _price;
        item = _item;
        deadline = _deadline;
        penalty = _penalty;
        judge = _judge;
    }

    function buy() public {
        require(bought == false, "Deal: Item already bought");
        require(
            currency.balanceOf(msg.sender) >= price,
            "Deal: Insufficent funds to buy"
        );
        require(
            currency.allowance(msg.sender, address(this)) >= price,
            "Deal: You need to approve some tokens to the contract first"
        );

        buyer = msg.sender;
        buyTime = block.timestamp;
        bought = true;

        emit Bought(address(this), seller, buyer);

        currency.transferFrom(msg.sender, address(this), price);
    }

    //buyer only
    function confirm() public {
        require(msg.sender == buyer, "Deal: Only buyer can confirm");
        require(bought == true, "Deal: You need to buy the item first");

        transferAndDestroy(seller);
    }

    //buyer and seller only
    function complain() public {
        require(
            msg.sender == buyer || msg.sender == seller,
            "Deal: Only buyer or seller can complain"
        );
        require(
            bought == true,
            "Deal: Item needs to be bought in order to make a complaint"
        );
        require(
            block.timestamp >= buyTime + deadline,
            "Deal: A certain amount of time must pass in order to make a complaint"
        );

        complained = true;

        emit Complained(address(this), seller, buyer);
    }

    //judge only
    function resolve(address receiver) public {
        require(msg.sender == judge, "Deal: Only judge can resolve");
        require(complained == true, "Deal: The complaint was not brought");

        transferAndDestroy(receiver);
    }

    //seller only
    function removeDeal() public {
        require(msg.sender == seller, "Deal: Only seller can remove the deal");
        require(
            bought == false,
            "Deal: Someone bought your item, deal can't be removed"
        );

        transferAndDestroy(seller);
    }

    function transferAndDestroy(address receiver) private {
        emit DealClosed(address(this), seller, buyer);

        currency.transfer(receiver, currency.balanceOf(address(this)));
        selfdestruct(payable(receiver));
    }
}
