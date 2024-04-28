import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ContractTransactionReceipt } from "ethers";
import hre from "hardhat";
import { ethers } from "hardhat";

function calculateGasCosts(testName: string, receipt: ContractTransactionReceipt | null) {
    if (!receipt) {
        return;
    }
    console.log(testName + " gasUsed: " + receipt.gasUsed);

    // coin prices in USD
    const matic = 0.5;
    const eth = 1000;

    const gasCostMatic = ethers.formatUnits(String(Number(ethers.parseUnits("35", "gwei")) * Number(receipt.gasUsed)), "ether");
    const gasCostEthereum = ethers.formatUnits(String(Number(ethers.parseUnits("21", "gwei")) * Number(receipt.gasUsed)), "ether");
    const gasCostArbitrum = ethers.formatUnits(String(Number(ethers.parseUnits("1.25", "gwei")) * Number(receipt.gasUsed)), "ether");

    console.log(testName + " gas cost (Ethereum): $" + String(Number(gasCostEthereum) * eth));
    console.log(testName + " gas cost (Arbitrum): $" + String(Number(gasCostArbitrum) * eth));
    console.log(testName + " gas cost (Polygon): $" + String(Number(gasCostMatic) * matic));
}

describe("SitusTLDMinter", function () {
    const domainName = ".web3";
    const domainSymbol = "WEB3";
    // domain price must be zero when using Minter
    const domainPrice = ethers.parseUnits("0", "ether");
    const domainRoyalty = 10; // royalty in bips (10 bips is 0.1%)

    const price1char = ethers.parseUnits("1", "ether");
    const price2char = ethers.parseUnits("0.1", "ether");
    const price3char = ethers.parseUnits("0.03", "ether");
    const price4char = ethers.parseUnits("0.008", "ether");
    const price5char = ethers.parseUnits("0.0002", "ether");

    // Fixture
    async function deploySitusTLDMinterFixture() {
        const [admin, tldOwner, user, referrer] = await hre.ethers.getSigners();

        const SitusMetadataStore = await hre.ethers.getContractFactory("SitusMetadataStore");
        const situsMetadataStore = await SitusMetadataStore.deploy();
        const situsMetadataStoreAddress = await situsMetadataStore.getAddress();

        const SitusForbiddenTLDs = await hre.ethers.getContractFactory("SitusForbiddenTLDs");
        const situsForbiddenTLDs = await SitusForbiddenTLDs.deploy();
        const situsForbiddenTLDsAddress = await situsForbiddenTLDs.getAddress();

        const SitusTLDFactory = await hre.ethers.getContractFactory("SitusTLDFactory");
        const situsTLDMinterFactory = await SitusTLDFactory.deploy(domainPrice, situsForbiddenTLDsAddress, situsMetadataStoreAddress);
        const situsTLDMinterFactoryAddress = await situsTLDMinterFactory.getAddress();

        await situsForbiddenTLDs.addFactoryAddress(situsTLDMinterFactoryAddress);

        const SitusTLD = await ethers.getContractFactory("SitusTLD");
        const situsTLD = await SitusTLD.deploy(
            domainName,
            domainSymbol,
            tldOwner.address, // TLD owner
            domainPrice,
            false, // buying enabled
            domainRoyalty,
            situsTLDMinterFactoryAddress,
            situsMetadataStoreAddress,
        );
        const situsTLDAddress = await situsTLD.getAddress();

        const SitusTLDMinter = await ethers.getContractFactory("SitusTLDMinter");
        const situsTLDMinter = await SitusTLDMinter.connect(tldOwner).deploy(
            situsTLDAddress,
            price1char,
            price2char,
            price3char,
            price4char,
            price5char,
        );

        await situsTLD.connect(tldOwner).changeMinter(situsTLDMinter);

        return { situsTLDMinter, situsTLD, situsMetadataStore, admin, tldOwner, user, referrer };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsTLDMinter } = await loadFixture(deploySitusTLDMinterFixture);
            expect(await situsTLDMinter.getAddress()).to.be.properAddress;
            expect(await situsTLDMinter.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Create TLD Minter", function () {
        it("should create a new valid domain", async function () {
            const { situsTLDMinter, situsTLD, tldOwner, user, referrer } = await loadFixture(deploySitusTLDMinterFixture);
            await situsTLD.connect(tldOwner).toggleBuyingDomains(); // enable buying domains
            await situsTLDMinter.connect(tldOwner).togglePaused();

            const newDomainName = "techie";

            // get referrer's balance BEFORE
            const balanceReferrerBefore = await hre.ethers.provider.getBalance(referrer.address);

            const totalSupplyBefore = await situsTLD.totalSupply();
            expect(totalSupplyBefore).to.equal(0);

            const tx = await situsTLDMinter.mint(
                newDomainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: price5char,
                },
            );

            const receipt = await tx.wait();

            calculateGasCosts("Mint", receipt);

            const totalSupplyAfter = await situsTLD.totalSupply();
            expect(totalSupplyAfter).to.equal(1);

            // get referrer's balance AFTER
            const balanceReferrerAfter = await hre.ethers.provider.getBalance(referrer.address);

            expect(BigInt(balanceReferrerAfter) - BigInt(balanceReferrerBefore)).to.equal(BigInt("20000000000000"));

            // const tx = await situsTLDMinter.ownerFreeMint(
            //     newDomainName, // domain name (without TLD)
            //     tldOwner.address, // domain owner
            // );

            // get domain name by token ID
            const firstDomainName = await situsTLD.domainIdsNames(1);
            expect(firstDomainName).to.equal(newDomainName);

            // get domain data by domain name
            const firstDomainData = await situsTLD.domains(newDomainName);
            expect(firstDomainData.name).to.equal(newDomainName);
            expect(firstDomainData.holder).to.equal(tldOwner.address);
            expect(firstDomainData.tokenId).to.equal(1);

            // mint another domain
            await situsTLDMinter.mint(
                "second", // domain name (without TLD)
                referrer.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: price5char, // pay  for the domain
                },
            );

            // check total supply of tokens
            const totalSupplyAfterSecond = await situsTLD.totalSupply();
            expect(totalSupplyAfterSecond).to.equal(2);

            // get domain data by domain name
            const secondDomainData = await situsTLD.domains("second");
            expect(secondDomainData.name).to.equal("second");
            expect(secondDomainData.holder).to.equal(referrer.address);
            expect(secondDomainData.tokenId).to.equal(2);

            // mint a 1-letter domain
            await situsTLDMinter.connect(user).mint(
                "a", // domain name (without TLD)
                user.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: price1char, // pay  for the domain
                },
            );

            // check total supply of tokens
            const totalSupplyAfterA = await situsTLD.totalSupply();
            expect(totalSupplyAfterA).to.equal(3);

            // get domain data by domain name
            const aDomainData = await situsTLD.domains("a");
            expect(aDomainData.name).to.equal("a");
            expect(aDomainData.holder).to.equal(user.address);
            expect(aDomainData.tokenId).to.equal(3);

            // fail at minting an empty domain
            await expect(
                situsTLDMinter.mint(
                    // this approach is better for getting gasUsed value from receipt
                    "", // empty domain name (without TLD)
                    user.address, // domain owner
                    referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                    {
                        value: price1char, // pay  for the domain
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLD, "Empty");
        });
    });
});
