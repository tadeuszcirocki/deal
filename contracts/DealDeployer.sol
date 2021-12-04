//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./Deal.sol";

contract DealDeployer is Ownable{

    event DealDeployed(address _dealAddr, address _seller, address _currency, uint _price, string _item);

    uint public deadline;
    uint public penalty;    //value in %
    address public judge;   //trusted third party choosed by us 
    
    constructor() {
    }

    function setDeadline(uint _deadline) public onlyOwner{
        //guarantee that we won't set some crazy deadlines
        require(_deadline >= 1 weeks && _deadline <= 4 weeks, "DealDeployer: Deadline value out of range");
        deadline = _deadline;
    }

    function setPenalty(uint _penalty) public onlyOwner{
        //guarantee that we won't set some crazy penalties
        require(_penalty >= 1 && _penalty <= 10, "DealDeployer: Penalty value out of range");
        penalty = _penalty;
    }

    function setJudge(address _judge) public onlyOwner{
        require(_judge != address(0x0));
        judge = _judge;
    }

    function deployDeal(address _currency, uint _price, string memory _item) public returns (address){
        //usually it's absurdly low value and it guarantees our division below won't break
        require(_price >= 100, "DealDeployer: price too low");

        require(_currency != address(0x0));
        IERC20 currency = IERC20(_currency);

        uint deposit = _price * penalty / 100;

        require(currency.balanceOf(msg.sender) >= deposit,
            "DealDeployer: Insufficent funds to deposit");
        require(currency.allowance(msg.sender, address(this)) >= deposit,
            "DealDeployer: You need to approve some tokens to the contract first");
        
        Deal dealContract = new Deal(msg.sender, _currency, _price, _item, deadline, penalty, judge);
        currency.transferFrom(msg.sender, address(dealContract), deposit);

        emit DealDeployed(address(dealContract), msg.sender, _currency, _price, _item);

        return address(dealContract);
    }
}


//deployDealToken i deployDealEth payable?