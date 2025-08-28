// SPDX-License-Identifier: MIT


pragma solidity ^0.8.18;



contract userReg{
    event userRegistration(address indexed user, string username);
    struct User{
        string username;
        address user;
        uint age;
    }
    mapping(address => User) public Users;

    function userRegister(string memory _username, uint _age) public {
        User storage newUser = Users[msg.sender];
        newUser.username = _username;
        newUser.age = _age;
        newUser.user = msg.sender;


        emit userRegistration(msg.sender, _username);

    }
}