// Web3 and Contract Variables
let web3;
let contract;
let userAccount;
let contractOwner;
let appConfig;

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const disconnectWalletBtn = document.getElementById('disconnectWallet');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const tweetContent = document.getElementById('tweetContent');
const charCount = document.getElementById('charCount');
const postTweetBtn = document.getElementById('postTweet');
const ownerSection = document.getElementById('ownerSection');
const maxLengthInput = document.getElementById('maxLength');
const updateLengthBtn = document.getElementById('updateLength');
const userAddressInput = document.getElementById('userAddress');
const loadTweetsBtn = document.getElementById('loadTweets');
const loadAllTweetsBtn = document.getElementById('loadAllTweets');
const tweetsContainer = document.getElementById('tweetsContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const statusMessage = document.getElementById('statusMessage');

// Initialize the application
async function init() {
    try {
        // Load app configuration
        const response = await fetch('app.json');
        appConfig = await response.json();
        
        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined') {
            web3 = new Web3(window.ethereum);
            setupEventListeners();
            
            // Check if already connected
            const accounts = await web3.eth.getAccounts();
            if (accounts.length > 0) {
                await connectWallet();
            }
        } else {
            showStatus('Please install MetaMask to use this application!', 'error');
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showStatus('Failed to initialize application', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    connectWalletBtn.addEventListener('click', connectWallet);
    disconnectWalletBtn.addEventListener('click', disconnectWallet);
    tweetContent.addEventListener('input', updateCharCount);
    postTweetBtn.addEventListener('click', createTweet);
    updateLengthBtn.addEventListener('click', updateTweetLength);
    loadTweetsBtn.addEventListener('click', loadUserTweets);
    loadAllTweetsBtn.addEventListener('click', loadMyTweets);
    
    // Listen for account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
    }
}

// Connect wallet function
async function connectWallet() {
    try {
        showLoading(true);
        
        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        
        userAccount = accounts[0];
        
        // Initialize contract
        contract = new web3.eth.Contract(appConfig.contractABI, appConfig.contractAddress);
        
        // Get contract owner
        contractOwner = await contract.methods.owner().call();
        
        // Update UI
        updateWalletUI();
        
        // Check if user is owner
        if (userAccount.toLowerCase() === contractOwner.toLowerCase()) {
            ownerSection.classList.remove('hidden');
            await loadCurrentTweetLength();
        }
        
        showStatus('Wallet connected successfully!', 'success');
        
    } catch (error) {
        console.error('Connection error:', error);
        showStatus('Failed to connect wallet', 'error');
    } finally {
        showLoading(false);
    }
}

// Disconnect wallet
function disconnectWallet() {
    userAccount = null;
    contract = null;
    contractOwner = null;
    
    connectWalletBtn.classList.remove('hidden');
    walletInfo.classList.add('hidden');
    ownerSection.classList.add('hidden');
    postTweetBtn.disabled = true;
    
    showStatus('Wallet disconnected', 'info');
}

// Update wallet UI
function updateWalletUI() {
    if (userAccount) {
        connectWalletBtn.classList.add('hidden');
        walletInfo.classList.remove('hidden');
        walletAddress.textContent = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;
        postTweetBtn.disabled = false;
    }
}

// Handle account changes
async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else if (accounts[0] !== userAccount) {
        await connectWallet();
    }
}

// Handle chain changes
function handleChainChanged(chainId) {
    window.location.reload();
}

// Update character count
function updateCharCount() {
    const length = tweetContent.value.length;
    charCount.textContent = `${length}/200`;
    
    if (length > 200) {
        charCount.style.color = '#e74c3c';
        postTweetBtn.disabled = true;
    } else if (length === 0) {
        charCount.style.color = '#657786';
        postTweetBtn.disabled = true;
    } else {
        charCount.style.color = '#657786';
        postTweetBtn.disabled = false;
    }
}

// Create tweet
async function createTweet() {
    if (!contract || !userAccount) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    const content = tweetContent.value.trim();
    if (!content) {
        showStatus('Tweet content cannot be empty', 'error');
        return;
    }
    
    if (content.length > 200) {
        showStatus('Tweet is too long', 'error');
        return;
    }
    
    // Check if user is the owner
    if (userAccount.toLowerCase() !== contractOwner.toLowerCase()) {
        showStatus('Only the contract owner can create tweets', 'error');
        return;
    }
    
    try {
        showLoading(true);
        console.log('Creating tweet with content:', content);
        console.log('User account:', userAccount);
        console.log('Contract owner:', contractOwner);
        
        // First try to estimate gas
        let gasEstimate;
        try {
            gasEstimate = await contract.methods.createtweets(content).estimateGas({
                from: userAccount
            });
            console.log('Gas estimate:', gasEstimate);
        } catch (gasError) {
            console.error('Gas estimation failed:', gasError);
            throw new Error('Gas estimation failed: ' + gasError.message);
        }
        
        // Send the transaction
        const gasPrice = await web3.eth.getGasPrice();
        const tx = await contract.methods.createtweets(content).send({
            from: userAccount,
            gas: Math.floor(Number(gasEstimate) * 1.5), // Increased gas buffer
            gasPrice: gasPrice
        });
        
        console.log('Transaction successful:', tx);
        showStatus('Tweet posted successfully!', 'success');
        tweetContent.value = '';
        updateCharCount();
        
        // Reload tweets
        await loadMyTweets();
        
    } catch (error) {
        console.error('Tweet creation error:', error);
        
        // More detailed error handling
        if (error.message.includes('revert')) {
            if (error.message.includes('The sender is not the owner')) {
                showStatus('Only the contract owner can create tweets', 'error');
            } else if (error.message.includes('The tweet is so long')) {
                showStatus('Tweet exceeds maximum length', 'error');
            } else {
                showStatus('Transaction reverted: ' + error.message, 'error');
            }
        } else if (error.code === 4001) {
            showStatus('Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showStatus('Insufficient funds for gas', 'error');
        } else {
            showStatus('Failed to post tweet: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Load current tweet length (owner only)
async function loadCurrentTweetLength() {
    try {
        const currentLength = await contract.methods.TweetMaxLength().call();
        maxLengthInput.value = currentLength;
    } catch (error) {
        console.error('Error loading tweet length:', error);
    }
}

// Update tweet length (owner only)
async function updateTweetLength() {
    if (!contract || !userAccount) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    const newLength = parseInt(maxLengthInput.value);
    if (newLength < 1 || newLength > 500) {
        showStatus('Tweet length must be between 1 and 500 characters', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const gasEstimate = await contract.methods.changeTweetLength(newLength).estimateGas({
            from: userAccount
        });
        
        const gasPrice = await web3.eth.getGasPrice();
        await contract.methods.changeTweetLength(newLength).send({
            from: userAccount,
            gas: Math.floor(Number(gasEstimate) * 1.2),
            gasPrice: gasPrice
        });
        
        showStatus(`Tweet length updated to ${newLength} characters`, 'success');
        
    } catch (error) {
        console.error('Update length error:', error);
        showStatus('Failed to update tweet length', 'error');
    } finally {
        showLoading(false);
    }
}

// Load user tweets
async function loadUserTweets() {
    const address = userAddressInput.value.trim();
    if (!address) {
        showStatus('Please enter a user address', 'error');
        return;
    }
    
    if (!web3.utils.isAddress(address)) {
        showStatus('Invalid Ethereum address', 'error');
        return;
    }
    
    await loadTweets(address);
}

// Load my tweets
async function loadMyTweets() {
    if (!userAccount) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    await loadTweets(userAccount);
}

// Load tweets for a specific address
async function loadTweets(address) {
    if (!contract) {
        showStatus('Contract not initialized', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const tweets = await contract.methods.getAlltweets(address).call();
        displayTweets(tweets, address);
        
    } catch (error) {
        console.error('Error loading tweets:', error);
        showStatus('Failed to load tweets', 'error');
        tweetsContainer.innerHTML = '<p>No tweets found or error loading tweets.</p>';
    } finally {
        showLoading(false);
    }
}

// Display tweets
function displayTweets(tweets, authorAddress) {
    if (!tweets || tweets.length === 0) {
        tweetsContainer.innerHTML = '<p>No tweets found for this address.</p>';
        return;
    }
    
    // Sort tweets by timestamp (newest first)
    const sortedTweets = [...tweets].sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp));
    
    tweetsContainer.innerHTML = sortedTweets.map(tweet => `
        <div class="tweet">
            <div class="tweet-header">
                <span class="tweet-author">${authorAddress.slice(0, 6)}...${authorAddress.slice(-4)}</span>
                <span class="tweet-id">ID: ${tweet.id}</span>
                <span class="tweet-time">${formatTimestamp(tweet.timeStamp)}</span>
            </div>
            <div class="tweet-content">${escapeHtml(tweet.content)}</div>
            <div class="tweet-actions">
                <button class="like-btn" onclick="likeTweet('${authorAddress}', ${tweet.id})">
                    ❤️ ${tweet.likes}
                </button>
                <button class="like-btn" onclick="unlikeTweet('${authorAddress}', ${tweet.id})">
                    💔 Unlike
                </button>
            </div>
        </div>
    `).join('');
}

// Like tweet
async function likeTweet(author, tweetId) {
    if (!contract || !userAccount) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        showLoading(true);
        console.log('Liking tweet - Author:', author, 'ID:', tweetId);
        console.log('User account:', userAccount);
        
        // First check if tweet exists by trying to get it
        try {
            const tweet = await contract.methods.gettweet(author, tweetId).call();
            console.log('Tweet found:', tweet);
        } catch (tweetError) {
            console.error('Tweet not found:', tweetError);
            showStatus('Tweet does not exist', 'error');
            return;
        }
        
        // Estimate gas
        let gasEstimate;
        try {
            gasEstimate = await contract.methods.likeTweet(author, tweetId).estimateGas({
                from: userAccount
            });
            console.log('Gas estimate for like:', gasEstimate);
        } catch (gasError) {
            console.error('Gas estimation failed for like:', gasError);
            throw new Error('Gas estimation failed: ' + gasError.message);
        }
        
        // Send transaction
        const gasPrice = await web3.eth.getGasPrice();
        const tx = await contract.methods.likeTweet(author, tweetId).send({
            from: userAccount,
            gas: Math.floor(Number(gasEstimate) * 1.5),
            gasPrice: gasPrice
        });
        
        console.log('Like transaction successful:', tx);
        showStatus('Tweet liked!', 'success');
        
        // Reload tweets to show updated like count
        await loadTweets(author);
        
    } catch (error) {
        console.error('Like error:', error);
        
        if (error.message.includes('revert')) {
            if (error.message.includes('The tweet doesnt exist')) {
                showStatus('Tweet does not exist', 'error');
            } else {
                showStatus('Transaction reverted: ' + error.message, 'error');
            }
        } else if (error.code === 4001) {
            showStatus('Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showStatus('Insufficient funds for gas', 'error');
        } else {
            showStatus('Failed to like tweet: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Unlike tweet
async function unlikeTweet(author, tweetId) {
    if (!contract || !userAccount) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        showLoading(true);
        console.log('Unliking tweet - Author:', author, 'ID:', tweetId);
        
        // Check if tweet exists and has likes
        try {
            const tweet = await contract.methods.gettweet(author, tweetId).call();
            console.log('Tweet found for unlike:', tweet);
            if (parseInt(tweet.likes) === 0) {
                showStatus('Tweet has no likes to remove', 'error');
                return;
            }
        } catch (tweetError) {
            console.error('Tweet not found for unlike:', tweetError);
            showStatus('Tweet does not exist', 'error');
            return;
        }
        
        // Estimate gas
        let gasEstimate;
        try {
            gasEstimate = await contract.methods.UnlikeTweet(author, tweetId).estimateGas({
                from: userAccount
            });
            console.log('Gas estimate for unlike:', gasEstimate);
        } catch (gasError) {
            console.error('Gas estimation failed for unlike:', gasError);
            throw new Error('Gas estimation failed: ' + gasError.message);
        }
        
        // Send transaction
        const gasPrice = await web3.eth.getGasPrice();
        const tx = await contract.methods.UnlikeTweet(author, tweetId).send({
            from: userAccount,
            gas: Math.floor(Number(gasEstimate) * 1.5),
            gasPrice: gasPrice
        });
        
        console.log('Unlike transaction successful:', tx);
        showStatus('Tweet unliked!', 'success');
        
        // Reload tweets to show updated like count
        await loadTweets(author);
        
    } catch (error) {
        console.error('Unlike error:', error);
        
        if (error.message.includes('revert')) {
            if (error.message.includes('The tweet doesnt exist')) {
                showStatus('Tweet does not exist', 'error');
            } else if (error.message.includes('The tweet doesnt have likes')) {
                showStatus('Tweet has no likes to remove', 'error');
            } else {
                showStatus('Transaction reverted: ' + error.message, 'error');
            }
        } else if (error.code === 4001) {
            showStatus('Transaction rejected by user', 'error');
        } else if (error.message.includes('insufficient funds')) {
            showStatus('Insufficient funds for gas', 'error');
        } else {
            showStatus('Failed to unlike tweet: ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

// Utility functions
function formatTimestamp(timestamp) {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', init);

// Make functions globally available for onclick handlers
window.likeTweet = likeTweet;
window.unlikeTweet = unlikeTweet;
