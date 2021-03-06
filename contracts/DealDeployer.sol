//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Deal.sol";
import "./DealETH.sol";

/**
 * @title DealDeployer
 */
contract DealDeployer is Ownable {
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

    mapping(address => address[]) public deals; //seller => deals addresses
    mapping(address => address[]) public dealsETH;

    uint256 public deadline;
    uint256 public penalty; //value in %
    address public judge; //trusted third party choosed by us

    constructor(
        uint256 _deadline,
        uint256 _penalty,
        address _judge
    ) {
        deadline = _deadline;
        penalty = _penalty;
        judge = _judge;
    }

    function setDeadline(uint256 _deadline) external onlyOwner {
        //guarantee that we won't set some crazy deadlines in the future
        require(
            _deadline >= 1 weeks && _deadline <= 4 weeks,
            "DealDeployer: Deadline value out of range"
        );
        deadline = _deadline;
    }

    function setPenalty(uint256 _penalty) external onlyOwner {
        //guarantee that we won't set some crazy penalties in the future
        require(
            _penalty >= 1 && _penalty <= 10,
            "DealDeployer: Penalty value out of range"
        );
        penalty = _penalty;
    }

    function setJudge(address _judge) external onlyOwner {
        require(_judge != address(0x0));
        judge = _judge;
    }

    function deployDeal(
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

        Deal dealContract = new Deal(
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

    function deployDealETH(uint256 _price, string memory _item)
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

        DealETH dealContract = new DealETH(
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
