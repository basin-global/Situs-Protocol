// Run tests:
// npx hardhat test test/partners/basin/metadata.test.js

const { expect } = require("chai");

function calculateGasCosts(testName, receipt) {
  console.log(testName + " gasUsed: " + receipt.gasUsed);

  // coin prices in USD
  const eth = 1000;
  
  const gasCostEthereum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("20", "gwei")) * Number(receipt.gasUsed)), "ether");
  const gasCostArbitrum = ethers.utils.formatUnits(String(Number(ethers.utils.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

  console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum)*eth));
  console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum)*eth));
}

describe(".basin metadata", function () {
  let tldContract;
  const tldName = ".basin";
  const tldSymbol = ".BASIN";
  const tldPrice = 1;
  const tldRoyalty = 0;

  const paymentTokenDecimals = 18; // ETH (18 decimals)

  let signer;
  let user1;
  let user2;
  let owner;
  let pool;
  let developer;

  beforeEach(async function () {
    [signer, user1, user2, owner, pool, developer] = await ethers.getSigners();

    //----
    const PunkForbiddenTlds = await ethers.getContractFactory("PunkForbiddenTlds");
    const forbTldsContract = await PunkForbiddenTlds.deploy();

    const FlexiPunkMetadata = await ethers.getContractFactory("BasinMetadata3");
    const flexiMetadataContract = await FlexiPunkMetadata.deploy();

    const PunkTLDFactory = await ethers.getContractFactory("FlexiPunkTLDFactory");
    const priceToCreateTld = ethers.utils.parseUnits("100", "ether");
    const factoryContract = await PunkTLDFactory.deploy(priceToCreateTld, forbTldsContract.address, flexiMetadataContract.address);

    await forbTldsContract.addFactoryAddress(factoryContract.address);

    const PunkTLD = await ethers.getContractFactory("FlexiPunkTLD");
    tldContract = await PunkTLD.deploy(
      tldName,
      tldSymbol,
      signer.address, // TLD owner
      tldPrice,
      true,
      tldRoyalty,
      factoryContract.address,
      flexiMetadataContract.address
    );

    // transfer TLD ownership to owner
    await tldContract.transferOwnership(owner.address);
  });

  it("should confirm TLD name & symbol", async function () {
    const _tldName = await tldContract.name();
    expect(_tldName).to.equal(tldName);
    const _tldSymbol = await tldContract.symbol();
    expect(_tldSymbol).to.equal(tldSymbol);
  });

  it("should mint two 5+ char domains", async function () {

    // how many domains user1 has before minting
    const balanceDomainBefore = await tldContract.balanceOf(user1.address);
    expect(balanceDomainBefore).to.equal(0);

    // Mint a domain
    const tx = await tldContract.connect(user1).mint(
      "user1", // domain name (without TLD)
      user1.address, // domain holder
      ethers.constants.AddressZero, // no referrer in this case
      {
        value: ethers.utils.parseEther(String(tldPrice)) // pay for the domain
      }
    );

    const receipt = await tx.wait();

    calculateGasCosts("Mint", receipt);

    // get metadata
    const metadata1 = await tldContract.tokenURI(1);
  
    const mdJson1 = Buffer.from(metadata1.substring(29), "base64");
    const mdResult1 = JSON.parse(mdJson1);

    expect(mdResult1.name).to.equal("user1.basin");
    console.log(mdResult1);

    const balanceDomainAfter = await tldContract.balanceOf(user1.address);
    expect(balanceDomainAfter).to.equal(1);

    const domainHolder = await tldContract.getDomainHolder("user1");
    expect(domainHolder).to.equal(user1.address);

  });

});
