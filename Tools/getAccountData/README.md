# NFT and Tokenbound Account Data Retrieval Script

This repository contains a Node.js script that fetches NFT data, including ownership and Tokenbound account details, from a specified Ethereum smart contract. It also includes an example of the output data structure.

## Description

The script `getAccountData.js` connects to an Ethereum blockchain via a Web3 provider and retrieves data from a specified smart contract. It checks each token from the contract to determine ownership details, whether the owner is an EOA (Externally Owned Account) or a smart contract, and retrieves the associated Tokenbound Account.

## Getting Started

### Dependencies

- Node.js (v12.x or higher recommended)
- npm (Node Package Manager)
  
### Installing

1. Clone this repository to your local machine.
2. Navigate to the repository directory in your terminal.
3. Install the required npm packages:

   ```bash
   npm install web3 @tokenbound/sdk

## Configuration
Before running the script, update the following placeholders in the getAccountData.js file:

- `rpcUrl`: Your Alchemy or other blockchain service providers API URL.
- `chainId`: The chain ID of the Ethereum network your contract is deployed on.
- `contractAddress`: The address of your NFT contract.
- `contractABI`: The ABI of your NFT contract. Ensure it includes all necessary functions.

NOTE: this version does not have handling for burned tokens (non-existing) but that can easily be added to script if you encounter an error

## Usage
To run the script, use the following command in your terminal:

```bash
node getAccountData.js
```

The script will output the data to AccountDataResults.json, which will contain an array of objects with details about each token.

### Example of Output Data
An example output file AccountDataResultsExample.json is included in the repository. It shows the format of the data produced by the script, including token IDs, owner addresses, account types (EOA or Contract), token names, and Tokenbound Accounts.

# Contributing
Contributions are welcome. If you have suggestions for improving the script or encounter any issues, please open an issue or submit a pull request.

# LICENSE

GNU General Public License v3.0
