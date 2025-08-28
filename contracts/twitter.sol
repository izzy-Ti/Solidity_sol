// SPDX-License-Identifier: MIT


pragma solidity ^0.8.18;


contract modify{
        address public owner;
        mapping(address => uint) public balance;
        bool public paused;
    constructor(){
        owner = msg.sender;
        balance[owner] = 1000;
        paused = false;
    }
    modifier onlyOwner{
        require(msg.sender == owner, 'the user is not the owner');
        _;
    }
    modifier isPaused{
        require(paused == false, 'The system is paused');
        _;
    }
    function pause() public onlyOwner {
        paused = true;
    }
    function unpause() public onlyOwner {
        paused = false;
    }
    function transaction(address to, uint amount) public isPaused {
        require(balance[msg.sender] <= 500, 'Your balance is less than minimum');

        balance[msg.sender] -= amount;
        balance[to] += amount; 
    }
}