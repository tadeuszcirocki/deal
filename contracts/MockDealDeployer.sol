//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "./DealDeployer.sol";
import "./MockDeal.sol";
import "./MockDealETH.sol";

/**
 * @title MockDealDeployer
 * WARNING: use only for testing and debugging purpose
 */
contract MockDealDeployer {
    event DealDeployed(
        address _dealAddr,
        address _seller,
        address _currency,
        uint256 _price,
        string _item
    );

    event DealDeployedETH(
        address _dealAddr,
        address _seller,
        uint256 _price,
        string _item
    );

    uint256 public deadline;
    uint256 public penalty; //value in %
    address public judge; //trusted third party choosed by us

    mapping(address => address[]) public deals; //seller => deals addresses
    mapping(address => address[]) public dealsETH;

    constructor(
        uint256 _deadline,
        uint256 _penalty,
        address _judge
    ) {
        deadline = _deadline;
        penalty = _penalty;
        judge = _judge;
    }

    function deployMockDeal(
        address _currency,
        uint256 _price,
        string memory _item
    ) external {
        //usually it's absurdly low value and it guarantees our division below won't break
        require(_price >= 100, "DealDeployer: price too low");

        require(_currency != address(0x0));
        IERC20 currency = IERC20(_currency);

        uint256 deposit = (_price * penalty) / 100;

        require(
            currency.balanceOf(msg.sender) >= deposit,
            "DealDeployer: Insufficent funds to deposit"
        );
        require(
            currency.allowance(msg.sender, address(this)) >= deposit,
            "DealDeployer: You need to approve some tokens to the contract first"
        );

        MockDeal dealContract = new MockDeal(
            msg.sender,
            _currency,
            _price,
            _item,
            deadline,
            penalty,
            judge
        );
        deals[msg.sender].push(address(dealContract));

        currency.transferFrom(msg.sender, address(dealContract), deposit);

        emit DealDeployed(
            address(dealContract),
            msg.sender,
            _currency,
            _price,
            _item
        );
    }

    function deployMockDealETH(uint256 _price, string memory _item)
        external
        payable
    {
        //it's absurdly low value and it guarantees our division below won't break
        require(_price >= 100, "DealDeployer: price too low");

        uint256 deposit = (_price * penalty) / 100;

        require(
            msg.value >= deposit,
            "DealDeployer: Insufficent funds to deposit"
        );

        MockDealETH dealContract = new MockDealETH(
            msg.sender,
            _price,
            _item,
            deadline,
            penalty,
            judge
        );
        dealsETH[msg.sender].push(address(dealContract));

        address(dealContract).call{value: deposit}("");

        emit DealDeployedETH(address(dealContract), msg.sender, _price, _item);
    }
}
