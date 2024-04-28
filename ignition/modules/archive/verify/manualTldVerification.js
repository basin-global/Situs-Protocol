// Run: npx hardhat run ignition/modules/archive/verify/manualTldVerification.js --network baseTestnet

const tldAddressSitus = "0x07dA57BE8D458F323B449b336530E2107B735A0b";
const tldAddressBasin = "0x608EdA40bE224d85D79c2b7d274dC4bb75be5eFA";

async function main() {
  console.log("Copy the two lines below and paste it in your terminal to verify the TLD contracts on Etherscan:");
  console.log("");
  console.log("npx hardhat verify --network " + network.name + " --constructor-args ignition/modules/archive/verify/argumentsSitus.js " + tldAddressSitus);
  console.log("");
  console.log("npx hardhat verify --network " + network.name + " --constructor-args ignition/modules/archive/verify/argumentsBasin.js " + tldAddressBasin);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });