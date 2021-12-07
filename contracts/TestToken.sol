//SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TestToken
 * WARNING: use only for testing and debugging purpose
 */
contract TestToken is ERC20 {
    constructor() ERC20("Token", "TKN") {
        _mint(msg.sender, 100000);
    }
}
