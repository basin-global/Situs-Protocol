// npx hardhat run scripts/factories/callMethods.js --network baseTestnet

// TODO: fill in
const factoryAddress = "0x2f5cd4366c16AFC3b04A4b2327BbFf9e3955dbC1";

const domainPrice = ethers.utils.parseUnits("0.0001", "ether");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Calling methods with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const factoryInterface = new ethers.utils.Interface([
    "function tldNamesAddresses(string memory) external view returns(address)",
    "function ownerCreateTld(string memory _name, string memory _symbol, address _tldOwner, uint256 _domainPrice, bool _buyingEnabled) external returns(address)"
  ]);

  const factoryContract = new ethers.Contract(factoryAddress, factoryInterface, deployer);

  // CREATE A NEW TLD
  const tldName = ".basin";
  const tldSymbol = ".BASIN";
   
  const tx = await factoryContract.ownerCreateTld(
    tldName, // TLD name
    tldSymbol, // symbol
    deployer.address, // TLD owner
    0, //domainPrice, // domain price
    false // buying enabled
  );

  tx.wait();
  
  const tldAddr = await factoryContract.tldNamesAddresses(tldName);
  
  console.log("TLD address: ");
  console.log(tldAddr);
  
  console.log("Method calls completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });