// Run: npx hardhat run scripts/factories/flexi/manualTldVerification.js --network baseTestnet

const tldAddress = "0x4087fb91A1fBdef05761C02714335D232a2Bf3a1";

async function main() {
  console.log("Copy the line below and paste it in your terminal to verify the TLD contract on Etherscan:");
  console.log("");
  console.log("npx hardhat verify --network " + network.name + " --constructor-args scripts/factories/verify/arguments.js " + tldAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });