// Run: npx hardhat run ignition/modules/archive/verify/manualTldVerification.js --network baseTestnet

const tldAddressSitus = "0xe44E9E2395B471624002E1473cd68FEaEc75BA8e";
const tldAddressBasin = "0x6698E22E15fe5f1AADCE26281e8eDB9b05a9C5B5";

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