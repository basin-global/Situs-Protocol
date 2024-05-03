# Situs Protocol

The Situs Protocol supports funding for place-based regeneration, conservation, and restoration, emphasizing a deep 'sense of place' and placemaking. It offers customizable 'member accounts'—like alex.tokyo, alex.ganges, and alex.nyc—that allow individuals to connect with specific locations. These community-owned and governed accounts are utilized by local organizations for memberships and include features for voting and other benefits. Additionally, each account can handle transactions with any Ethereum-based asset, supporting local initiatives. The protocol aims to deepen connections to places and bridge the gap between mere physical space and meaningful place.

# Situs Protocol Core Contracts

Contracts to create a top-level domain (TLD) such as `.basin`

```mermaid
sequenceDiagram
    participant deployer as Deployer
    participant basinMetadataStore as SitusMetadataStore
    participant basinForbiddenTLDs as SitusForbiddenTLDs
    participant basinResolverNonUpgradable as SitusResolverNonUpgradable
    participant basinTLDFactory as SitusTLDFactory
    participant basinMetadata3 as SitusMetadata3
    participant basinTLD as SitusTLD

    deployer ->>+ basinMetadataStore: Instantiate
    deployer ->>+ basinForbiddenTLDs: Instantiate
    deployer ->>+ basinResolverNonUpgradable: Instantiate
    deployer ->>+ basinTLDFactory: Instantiate (with SitusForbiddenTLDs and SitusMetadataStore)
    basinForbiddenTLDs ->>+ basinTLDFactory: addFactoryAddress
    basinResolverNonUpgradable ->>+ basinTLDFactory: addFactoryAddress
    deployer ->>+ basinTLDFactory: ownerCreateTld (non-custom metadata)
    deployer ->>+ basinMetadata3: Instantiate
    deployer ->>+ basinTLD: Instantiate (with SitusTLDFactory and BasinMetadata3)
```

## SitusTLDFactory
```mermaid
sequenceDiagram
    participant O as TLD Owner
    participant A as Admin
    participant F as SitusTLDFactory
    participant S as SitusTLD
    participant T as ForbiddenTLDs

    Note over A, F: Admin Operations
    A->>+F: changePrice(newPrice)
    A->>+F: changeRoyalty(newRoyalty)
    A->>+F: changeMetadataAddress(newAddress)
    A->>+F: ownerCreateTld(_name, _symbol, _tldOwner, _domainPrice, _buyingEnabled)
    A->>F: toggleBuyingTlds()
    Note over O, T: TLD Creation by TLD Owner
    O->>+F: createTld(_name, _symbol, _tldOwner, _domainPrice, _buyingEnabled)
    F->>F: Verify buying is enabled
    F->>F: Check payment
    F->>F: _createTld (internal function call)
    F->>F: Validate TLD name
    F->>+T: Check if TLD is forbidden
    F->>S: Create new TLD
    F->>T: Add new TLD to forbidden list
```

## SitusTLD
```mermaid
sequenceDiagram
    participant U as User
    participant O as TLD Owner
    participant T as SitusTLD
    participant M as SitusMetadataStore
    Note over O, M: TLD Operations by TLD Owner
    O->>M: Change Metadata Description
    O->>T: Toggle Buying
    O->>T: Change Max Length for Domain Name    
    O->>T: Change Domain Price
    O->>T: Change Referral Fee
    O->>T: Freeze Metadata
    O->>T: Change Royalty Amount
    Note over U, T: Domain Creation by User
    U->>T: Mint Domain
    U->>T: Edit Domain Data
    U->>T: Edit Default Domain
    U->>T: Transfer Domain
    U->>T: Burn Domain
```
If buying is disabled, owner, but not users can mint.

## Set up .env

```bash
cp .env.sample .env
```
add `PRIVATE_KEY` (default) or `MNEMONIC`. *Never* share your `PRIMARY_KEY` or `MNEMONIC` with anyone (or check into a repo).

add `BASESCAN_API_KEY`

## Install Dependencies

```bash
npm install
```

## Compile Typechain Artifacts

```bash
npm run build
```

## Run Tests

```bash
npm run test
```

## Lint both Solidity and Typescript Files

```bash
npm run lint
```

## Format both Solidity and Typescript Files

```bash
npm run fmt
```

## Deploy Contracts to Hardhat

Deploy to in-process instance of Hardhat Network, results will be lost.
```bash
npm run protocol:deployandverify hardhat
```

## Deploy Contracts to Local node
Start local network
```bash
npx hardhat node
```

Start a new terminal and execute:
```bash
npm run protocol:deployandverify localhost
```

Execute:
```bash
npm run customtld:deployandverify localhost
```

## Deploy Contracts to Base Testnet

Make sure .env has `PRIMARY_KEY` (or `MNEMONIC`) and `BASESCAN_API_KEY` values filled in.

If `ignition/deployments/chain-84532` does not exist, run this command.

Update parameters under `SitusProtocolModule` in `ignition/parameters.json`.

Start a new terminal and execute:
```bash
npm run protocol:deployandverify baseTestnet
```

## Clear Existing Deployment with Reset and Redeploy

If `ignition/deployments/chain-84532` does exist, run this command.

Update parameters under `SitusProtocolModule` in `ignition/parameters.json`.

Start a new terminal and execute:
```bash
npm run protocol:resetdeployandverify baseTestnet
```

## Verify Factory-generated Contracts on Base Testnet

Verify SitusTLD and BasinTLD separately since they were created by the factory using the following steps:

Update `tldAddressSitus` and `tldAddressBasin` using the values in `deployed_addresses.json` for the network in `ignition/modules/archive/verify/manualTldVerification.js`.

Update `factoryAddress` and `metadataAddress` using the values in `deployed_addresses.json` for the network in `ignition/modules/archive/verify/argumentsSitus.js` and `ignition/modules/archive/verify/argumentsBasin.js`

```bash
npx hardhat run ignition/modules/archive/verify/manualTldVerification.js --network baseTestnet
```

## Owner Create TLD for Base Testnet

update custom TLD parameters under `SitusTLD` in `ignition/parameters.json`.

Execute:
```bash
npm run customtld:deployandverify baseTestnet
```

## Add Base Sepolia to Metamask

- Name	Sepolia
- Network Name	Base Sepolia
- RPC Endpoint	https://sepolia.base.org
- Chain ID	84532
- Currency Symbol	ETH
- Block Explorer	https://sepolia-explorer.base.org

## TODO
- Reference module in tests
- Deploy to Base Mainnet
- Point Frontend to Base Mainnet

## References

- Adapted from the Flexi contracts in [punk-contracts repo](https://github.com/punk-domains-2/punk-contracts) by @tempe-techie and @johnson86tw and offered under same [LICENSE](https://github.com/basin-global/SitusProtocolContracts/blob/main/LICENSE)

---
---
# Original README below

# Punk Domains core contracts

Punk Domains allow anyone to either create a top-level domain (TLD) such as `.wagmi` or a normal domain such as `techie.wagmi`. In addition, users can add some other data to their domain:

- description
- redirect URL (useful together with the Punk Domains browser extension)
- profile picture (an address and token ID of an NFT)

### Verify TLD contracts

Verifying TLD contracts generated through the factory is a bit tricky, but there is a way around the issue. See `scripts/temp/deployTld.js` for instructions.

#### Manually verify TLD contract on Etherscan

1. Flatten the code (`npx hardhat flatten <path-to-contract>.sol >> <flat-contract-name>.sol`).
2. Delete all instances of SPDX Licences except one.
3. Go to Etherscan and select single file verification.
4. Turn on optimizations.
5. Select 0.8.4 for compiler (do not delete other pragma solidity lines in the file, even if they are for a different Solidity version).
6. Generate the ABI-encoded constructor arguments using this online tool: https://abi.hashex.org/. Make sure you generate all arguments 
needed in the TLD **constructor**, including the Factory address.
7. Submit for verification and hope for the best :)

## Audit tools

### Flatten the contracts

Most audit tools will require you to flatten the contracts. This means that all contracts that are defined under the imports will actually be imported into one .sol file, so all code is in one place.

First create a new folder called flattened:

```bash
mkdir flattened
```

To flatten a contract, run this command:

```bash
npx hardhat flatten <path-to-contract> >> flattened/<flat-contract-name>.sol
```

You may also need to give all contracts in the flattened file the same Solidity version. And you may need to delete all SPDX lines except the very first one.

### Mythril

Use Docker:

```bash
sudo docker pull mythril/myth
```

Go to the `flattened` folder and run this command:

```bash
sudo docker run -v $(pwd):/tmp mythril/myth -v4 analyze /tmp/<flat-contract-name>.sol --max-depth 10
```

Or, if you don't use Docker, use this command alone:

```bash
myth -v4 analyze flattened/PunkForbiddenTlds.sol --max-depth 10
```

Flags:

- `v4`: verbose
- `o`: output
- `a`: address onchain
- `l`: automatically retrieve dependencies
- `max-depth`: maximum recursion depth

Docs: https://mythril-classic.readthedocs.io/en/master/security-analysis.html 

### Slither

Install Slither:

```bash
pip3 install slither-analyzer --user
```

Run it in the `flattened` folder:

```bash
slither .
```

Docs: https://github.com/crytic/slither

## Debugging

### Error: ENOENT: no such file or directory

Run `npx hardhat clean` and then `npx hardhat compile`.
