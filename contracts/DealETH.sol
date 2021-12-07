//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

/**
 * @title DealETH
 */
contract DealETH {
    event Bought(address _deal, address _seller, address _buyer);
    event Complained(address _deal, address _seller, address _buyer);
    event DealClosed(address _deal, address _seller, address _buyer);

    address public immutable seller;
    uint256 public immutable price;
    string public item;

    uint256 public immutable deadline;
    uint256 public immutable penalty;
    address public immutable judge;

    bool public bought;
    bool public complained;

    address private buyer;
    uint256 internal buyTime;

    constructor(
        address _seller,
        uint256 _price,
        string memory _item,
        uint256 _deadline,
        uint256 _penalty,
        address _judge
    ) {
        //after deployment of the DealDeployer insert its address here
        //require(
        //    msg.sender == 0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44,
        //    "DealETH: DealETH can be deployed only through DealDeployer.deployDealETH()"
        //);
        seller = _seller;
        price = _price;
        item = _item;
        deadline = _deadline;
        penalty = _penalty;
        judge = _judge;
    }

    function buy() public payable {
        require(bought == false, "DealETH: Item already bought");
        require(msg.value >= price, "DealETH: Insufficent funds to buy");

        buyer = msg.sender;
        buyTime = block.timestamp;
        bought = true;

        emit Bought(address(this), seller, buyer);
    }

    //buyer only
    function confirm() public {
        require(msg.sender == buyer, "DealETH: Only buyer can confirm");
        require(bought == true, "DealETH: You need to buy the item first");

        transferAndDestroy(seller);
    }

    //buyer and seller only
    function complain() public {
        require(
            msg.sender == buyer || msg.sender == seller,
            "DealETH: Only buyer or seller can complain"
        );
        require(
            bought == true,
            "DealETH: Item needs to be bought in order to make a complaint"
        );
        require(
            block.timestamp >= buyTime + deadline,
            "DealETH: A certain amount of time must pass in order to make a complaint"
        );

        complained = true;

        emit Complained(address(this), seller, buyer);
    }

    //judge only
    function resolve(address receiver) public {
        require(msg.sender == judge, "DealETH: Only judge can resolve");
        require(complained == true, "DealETH: The complaint was not brought");

        transferAndDestroy(receiver);
    }

    //seller only
    function removeDeal() public {
        require(
            msg.sender == seller,
            "DealETH: Only seller can remove the deal"
        );
        require(
            bought == false,
            "DealETH: Someone bought your item, deal can't be removed"
        );

        transferAndDestroy(seller);
    }

    function transferAndDestroy(address receiver) private {
        emit DealClosed(address(this), seller, buyer);

        selfdestruct(payable(receiver));
    }

    receive() external payable {}
}
