import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("BasinTLD", function () {
    const domainName = ".web3";
    const domainSymbol = "WEB3";
    const domainPrice = ethers.parseUnits("1", "ether");
    const domainRoyalty = 0; // royalty in bips (10 bips is 0.1%)

    // Fixture
    async function deployBasinTLDFixture() {
        const [signer, anotherUser, referrer] = await hre.ethers.getSigners();

        const BasinMetadataStore = await hre.ethers.getContractFactory("BasinMetadataStore");
        const basinMetadataStore = await BasinMetadataStore.deploy();
        const basinMetadataStoreAddress = await basinMetadataStore.getAddress();

        // deploy BasinMetadataStore a second time to test changing the metadata store
        const BasinMetadataStore2 = await hre.ethers.getContractFactory("BasinMetadataStore");
        const basinMetadataStore2 = await BasinMetadataStore2.deploy();

        const BasinForbiddenTLDs = await hre.ethers.getContractFactory("BasinForbiddenTLDs");
        const basinForbiddenTLDs = await BasinForbiddenTLDs.deploy();
        const basinForbiddenTLDsAddress = await basinForbiddenTLDs.getAddress();

        const BasinTLDFactory = await hre.ethers.getContractFactory("BasinTLDFactory");
        const basinTLDFactory = await BasinTLDFactory.deploy(domainPrice, basinForbiddenTLDsAddress, basinMetadataStoreAddress);
        const basinTLDFactoryAddress = await basinTLDFactory.getAddress();

        await basinForbiddenTLDs.addFactoryAddress(basinTLDFactoryAddress);

        const BasinTLD = await ethers.getContractFactory("BasinTLD");
        const basinTLD = await BasinTLD.deploy(
            domainName,
            domainSymbol,
            signer.address, // TLD owner
            domainPrice,
            false, // buying enabled
            domainRoyalty,
            basinTLDFactoryAddress,
            basinMetadataStoreAddress,
        );

        return { basinTLD, basinMetadataStore, basinMetadataStore2, signer, anotherUser, referrer };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { basinTLD } = await loadFixture(deployBasinTLDFixture);
            expect(await basinTLD.getAddress()).to.be.properAddress;
            expect(await basinTLD.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Owner permissions on Create TLD", function () {
        it("should create a new valid domain as owner even if buying is disabled", async function () {
            const { basinTLD, signer } = await loadFixture(deployBasinTLDFixture);
            // buying domains should be disabled
            const buyingEnabled = await basinTLD.buyingEnabled();
            expect(buyingEnabled).to.be.false;

            const newDomainName = "techie";

            // mint a new valid domain as TLD owner
            await expect(
                basinTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(basinTLD, "DomainCreated");

            // get domain name by token ID
            const firstDomainName = await basinTLD.domainIdsNames(1); // token ID 1
            expect(firstDomainName).to.equal(newDomainName);

            // get domain data by domain name
            const firstDomainData = await basinTLD.domains(newDomainName);
            expect(firstDomainData.name).to.equal(newDomainName);
            expect(firstDomainData.holder).to.equal(signer.address);
        });

        it("should fail to create a new valid domain if user is not TLD owner and buying is disabled", async function () {
            const { basinTLD, anotherUser } = await loadFixture(deployBasinTLDFixture);
            // buying domains should be disabled
            const buyingEnabled = await basinTLD.buyingEnabled();
            expect(buyingEnabled).to.be.false;

            const newDomainName = "techie";

            await expect(
                basinTLD.connect(anotherUser).mint(
                    newDomainName, // domain name (without TLD)
                    anotherUser.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWith("Buying domains disabled");
        });

        it("should fail to create a new valid domain if buying is disabled forever", async function () {
            const { basinTLD, anotherUser } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            // buying domains should be enabled
            const buyingEnabled = await basinTLD.buyingEnabled();
            expect(buyingEnabled).to.be.true;

            const newDomainName = "techie";

            await basinTLD.connect(anotherUser).mint(
                newDomainName, // domain name (without TLD)
                anotherUser.address, // domain holder
                ethers.ZeroAddress, // referrer
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            // disable buying forever
            await basinTLD.disableBuyingForever();

            // fail at minting new domains
            await expect(
                basinTLD.mint(
                    "test1domain", // domain name (without TLD)
                    anotherUser.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWith("Domain minting disabled forever");

            await expect(
                basinTLD.connect(anotherUser).mint(
                    "test2domain", // domain name (without TLD)
                    anotherUser.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWith("Domain minting disabled forever");
        });

        it("should change the price of a domain", async function () {
            const { basinTLD, anotherUser } = await loadFixture(deployBasinTLDFixture);
            const priceBefore = await basinTLD.price();
            expect(priceBefore).to.equal(domainPrice);

            const newPrice = ethers.parseUnits("2", "ether");

            await basinTLD.changePrice(newPrice);

            const priceAfter = await basinTLD.price();
            expect(priceAfter).to.equal(newPrice);

            // if user is not owner, the tx should revert
            await expect(basinTLD.connect(anotherUser).changePrice(domainPrice)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change the referral fee", async function () {
            const { basinTLD, anotherUser } = await loadFixture(deployBasinTLDFixture);
            const referralBefore = await basinTLD.referral();
            expect(referralBefore).to.equal(1000); // 10% by default

            const newReferral = 500; // 500 bips or 5%

            await basinTLD.changeReferralFee(newReferral);

            const referralAfter = await basinTLD.referral();
            expect(referralAfter).to.equal(newReferral);

            // if user is not owner, the tx should revert
            await expect(basinTLD.connect(anotherUser).changeReferralFee(200)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should prevent setting referral fee to 50% or higher", async function () {
            const { basinTLD } = await loadFixture(deployBasinTLDFixture);
            const referralBefore = await basinTLD.referral();
            expect(referralBefore).to.equal(1000); // 10% by default

            // if referral fee is set to 50%, the tx should fail
            await expect(basinTLD.changeReferralFee(5000)).to.be.revertedWith("Referral fee cannot be 50% or higher");

            // if referral fee is set to higher than 50%, the tx should fail
            await expect(basinTLD.changeReferralFee(8000)).to.be.revertedWith("Referral fee cannot be 50% or higher");

            const referralAfter = await basinTLD.referral();
            expect(referralAfter).to.equal(1000); // should remain the same as before
        });

        it("should toggle buying domains", async function () {
            const { basinTLD, anotherUser } = await loadFixture(deployBasinTLDFixture);
            const buyingEnabledBefore = await basinTLD.buyingEnabled();
            expect(buyingEnabledBefore).to.be.false;

            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const buyingEnabledAfter = await basinTLD.buyingEnabled();
            expect(buyingEnabledAfter).to.be.true;

            // if user is not owner, the tx should revert
            await expect(basinTLD.connect(anotherUser).toggleBuyingDomains()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change max length for a domain name", async function () {
            const { basinTLD, anotherUser } = await loadFixture(deployBasinTLDFixture);
            const nameMaxLengthBefore = await basinTLD.nameMaxLength();
            expect(nameMaxLengthBefore).to.equal(140);

            const newMaxLength = 180;

            await basinTLD.changeNameMaxLength(newMaxLength);

            const nameMaxLengthAfter = await basinTLD.nameMaxLength();
            expect(nameMaxLengthAfter).to.equal(newMaxLength);

            // if user is not owner, the tx should revert
            await expect(basinTLD.connect(anotherUser).changeNameMaxLength(70)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change the royalty amount", async function () {
            const { basinTLD, anotherUser } = await loadFixture(deployBasinTLDFixture);
            const royaltyBefore = await basinTLD.royalty();
            expect(royaltyBefore).to.equal(0);

            const newRoyalty = 10;

            await basinTLD.changeRoyalty(newRoyalty);

            const royaltyAfter = await basinTLD.royalty();
            expect(royaltyAfter).to.equal(10);

            // if user is not owner, the tx should revert
            await expect(basinTLD.connect(anotherUser).changeRoyalty(20)).to.be.revertedWith("Sender is not royalty fee updater");
        });

        it("should change metadata contract address and then freeze it", async function () {
            const { basinTLD, basinMetadataStore, basinMetadataStore2, anotherUser } = await loadFixture(deployBasinTLDFixture);
            const mtdAddrBefore = await basinTLD.metadataAddress();
            expect(mtdAddrBefore).to.equal(await basinMetadataStore.getAddress());

            await basinTLD.changeMetadataAddress(basinMetadataStore2.getAddress());

            const mtdAddrAfter = await basinTLD.metadataAddress();
            expect(mtdAddrAfter).to.equal(await basinMetadataStore2.getAddress());

            // if user is not owner, the tx should revert
            await expect(basinTLD.connect(anotherUser).changeMetadataAddress(basinMetadataStore.getAddress())).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            await basinTLD.freezeMetadata();

            await expect(basinTLD.changeMetadataAddress(basinMetadataStore.getAddress())).to.be.revertedWith(
                "Cannot change metadata address anymore",
            );
        });
    });
});
