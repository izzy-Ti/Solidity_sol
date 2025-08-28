// SPDX-License-Identifier: MIT


pragma solidity ^0.8.18;


    contract twitter{

    uint public TweetMaxLength = 200;

        struct tweet{
            uint id;
            address author;
            string content;
            uint timeStamp;
            uint likes;
        }
    function changeTweetLength (uint newTweetLength) public {
        TweetMaxLength = newTweetLength;
    }
    address public owner;
    constructor(){
        owner = msg.sender;
    }

    modifier onlyOwner{
        require(owner == msg.sender, 'The sender is not the owner');
        _;
    }

    mapping(address => tweet[]) public tweets;
    function createtweets (string memory _tweet) public onlyOwner {

        require(bytes(_tweet).length <= 200, 'The tweet is so long');
        tweet memory newTweet = tweet({
            id: tweets[msg.sender].length,
            author: msg.sender,
            content: _tweet,
            timeStamp: block.timestamp,
            likes: 0
        });
        tweets[msg.sender].push(newTweet);
    }
    function likeTweet(address author, uint id) public {
        require(tweets[author][id].id == id, 'The tweet doesnt exist');
        tweets[author][id].likes ++ ;
    }
    function UnlikeTweet(address author, uint id) public {
        tweets[author][id].likes-- ;
    }
    function gettweet(address _owner, uint _i) public view returns( tweet memory){
        return tweets[_owner][_i];
    }
    function getAlltweets(address _owner) public view returns( tweet[] memory){
        return tweets[_owner];
    }
}
