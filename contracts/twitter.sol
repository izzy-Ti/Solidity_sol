// SPDX-License-Identifier: MIT


pragma solidity ^0.8.18;


contract twitter{
    struct tweet{
        address author;
        string content;
        uint timeStamp;
        uint likes;
    }

    mapping(address => tweet[]) public tweets;
    function createtweets (string memory _tweet) public {

        require(bytes(_tweet).length <= 200, 'The tweet is so long');
        tweet memory newTweet = tweet({
            author: msg.sender,
            content: _tweet,
            timeStamp: block.timestamp,
            likes: 0
        });
        tweets[msg.sender].push(newTweet);
    }

    function gettweet(address _owner, uint _i) public view returns( tweet memory){
        return tweets[_owner][_i];
    }
    function getAlltweets(address _owner) public view returns( tweet[] memory){
        return tweets[_owner];
    }
}