import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ContractTransactionReceipt } from "ethers";
import hre from "hardhat";
import { ethers, ignition } from "hardhat";
import SitusProtocolModule from "../ignition/modules/SitusProtocol";

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
    const tldPrice = ethers.parseUnits("1", "ether");
    const domainName = ".web3";
    const domainSymbol = "WEB3";
    // domain price must be zero when using Minter
    const domainPrice = ethers.parseUnits("0", "ether");

    const price1 = ethers.parseUnits("1", "ether");
    const price2 = ethers.parseUnits("0.1", "ether");
    const price3 = ethers.parseUnits("0.03", "ether");
    const price4 = ethers.parseUnits("0.008", "ether");
    const price5 = ethers.parseUnits("0.0002", "ether");

    // Fixture
    async function deploySitusTLDMinterFixture() {
        const [tldOwner, user, referrer] = await hre.ethers.getSigners();

        const {
            situsMetadataStore,
            situsTLDContract: situsTLD,
            situsTLDMinter,
        } = await ignition.deploy(SitusProtocolModule, {
            parameters: {
                SitusTLDFactoryModule: {
                    tldPrice: tldPrice,
                },
                SitusDefaultTLDModule: {
                    situsTldName: domainName,
                    situsTldSymbol: domainSymbol,
                    situsDomainPrice: domainPrice,
                    situsPrice1: price1,
                    situsPrice2: price2,
                    situsPrice3: price3,
                    situsPrice4: price4,
                    situsPrice5: price5,
                    basinTldName: ".basin",
                    basinTldSymbol: ".BASIN",
                },
            },
        });

        return { situsTLDMinter, situsTLD, situsMetadataStore, tldOwner, user, referrer };
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
            await situsTLDMinter.connect(tldOwner).togglePaused();

            const newDomainName = "first";

            // get referrer's balance BEFORE
            const balanceReferrerBefore = await hre.ethers.provider.getBalance(referrer.address);

            const totalSupplyBefore = await situsTLD.totalSupply();
            expect(totalSupplyBefore).to.equal(0);

            const tx = await situsTLDMinter.connect(user).mint(
                newDomainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: price5,
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
            await situsTLDMinter.connect(user).mint(
                "second", // domain name (without TLD)
                referrer.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: price5, // pay for the domain
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
                    value: price1, // pay  for the domain
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
                situsTLDMinter.connect(user).mint(
                    // this approach is better for getting gasUsed value from receipt
                    "", // empty domain name (without TLD)
                    user.address, // domain owner
                    referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                    {
                        value: price1, // pay  for the domain
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLD, "Empty");

            // fail at minting didn't send enough money for a one character domain
            await expect(
                situsTLDMinter.connect(user).mint(
                    // this approach is better for getting gasUsed value from receipt
                    "x", // empty domain name (without TLD)
                    user.address, // domain owner
                    referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                    {
                        value: price2, // pay  for the domain
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLD, "ValueBelowPrice");

            // mint using the TLD contract directly without minter
            await expect(
                situsTLD.connect(user).mint(
                    "third", // domain name (without TLD)
                    referrer.address, // domain owner
                    ethers.ZeroAddress, // no referrer in this case
                    {
                        value: 0, // pay for the domain
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLD, "BuyingDisabled");

            // tldOwner mint directly without minter
            await situsTLD.connect(tldOwner).mint(
                "fourth", // domain name (without TLD)
                referrer.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: 0, // pay for the domain
                },
            );

            const totalSupplyAfterThird = await situsTLD.totalSupply();
            expect(totalSupplyAfterThird).to.equal(4);
        });
    });
});
