/**
 * Script to fetch NFT / Account data including ownership and tokenbound account details from a specified smart contract.
 * Setup:
 * 1. Ensure Node.js is installed.
 * 2. Run `npm install web3 @tokenbound/sdk fs` to install dependencies.
 * 3. Replace the placeholder values in `rpcUrl`, `contractAddress`, `chainId`, `contractABI`, and TODO as needed.
 * Usage:
 * Run this script using `node getAccountData.js` in your terminal.
 */

const Web3 = require('web3');
const fs = require('fs');
const { TokenboundClient } = require('@tokenbound/sdk');

// TODO: Replace with your personal API key from Alchemy.
const rpcUrl = "https://base-mainnet.g.alchemy.com/v2/<your_api_key_here>"; 
const web3 = new Web3(rpcUrl);

// TODO: Ensure this chain ID matches the network your contract is deployed on.
const chainId = 8453;

// TODO: Replace with your NFT contract address.
const contractAddress = '0x76AC406218413950DB2b050f7C3449AB5E24AABc';

// TODO: Update this ABI with the custom or complete ABI from the block explorer - below is for Situs / Punk TLD collections.
const contractABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "ownerOf",
        "outputs": [{"name": "", "type": "address"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "domainIdsNames",
        "outputs": [{"name": "", "type": "string"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

const contract = new web3.eth.Contract(contractABI, contractAddress);

async function fetchNFTData() {
    try {
        let totalSupply = await contract.methods.totalSupply().call();
        totalSupply = parseInt(totalSupply);
        const nftData = [];
        const accounts = await web3.eth.getAccounts();
        const tokenboundClient = new TokenboundClient({ signer: accounts[0], chainId });

        for (let i = 1; i <= totalSupply; i++) {
            try {
                let owner = await contract.methods.ownerOf(i).call();
                let code = await web3.eth.getCode(owner);
                let accountType = code === '0x' ? 'EOA' : 'Contract';
                let name = await contract.methods.domainIdsNames(i).call();

                let tbaParams = { tokenContract: contractAddress, tokenId: i.toString() };
                let retrievedAccount = await tokenboundClient.getAccount(tbaParams);

                nftData.push({
                    tokenID: i,
                    owner: owner,
                    accountType: accountType,
                    name: name,
                    TBAccount: retrievedAccount
                });
            } catch (error) {
                console.error(`Error fetching data for token ID ${i}: ${error.message}`);
                // TODO: Consider adding retry logic or alerting mechanisms if consistently failing.
            }
        }

        fs.writeFileSync('AccountDataResults.json', JSON.stringify(nftData, null, 2));
        console.log('Data has been written to AccountDataResults.json');
    } catch (error) {
        console.error(`Error fetching total supply: ${error.message}`);
        // TODO: Check network connection and RPC endpoint accessibility.
    }
}

fetchNFTData().catch(console.error);
