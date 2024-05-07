// Run: npx hardhat run ignition/modules/archive/verify/manualTldVerification.js --network baseTestnet & base

const tldAddressSitus = "0xcFD18A8eD73087C8c6ABbf6edcdB30aD2fa0FEc7";
const tldAddressBasin = "0x76AC406218413950DB2b050f7C3449AB5E24AABc";

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
