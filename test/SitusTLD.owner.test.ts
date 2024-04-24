import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("SitusTLD", function () {
    const domainName = ".web3";
    const domainSymbol = "WEB3";
    const domainPrice = ethers.parseUnits("1", "ether");
    const domainRoyalty = 0; // royalty in bips (10 bips is 0.1%)

    // Fixture
    async function deploySitusTLDFixture() {
        const [signer, anotherUser, referrer] = await hre.ethers.getSigners();

        const SitusMetadataStore = await hre.ethers.getContractFactory("SitusMetadataStore");
        const situsMetadataStore = await SitusMetadataStore.deploy();
        const situsMetadataStoreAddress = await situsMetadataStore.getAddress();

        // deploy SitusMetadataStore a second time to test changing the metadata store
        const SitusMetadataStore2 = await hre.ethers.getContractFactory("SitusMetadataStore");
        const situsMetadataStore2 = await SitusMetadataStore2.deploy();

        const SitusForbiddenTLDs = await hre.ethers.getContractFactory("SitusForbiddenTLDs");
        const situsForbiddenTLDs = await SitusForbiddenTLDs.deploy();
        const situsForbiddenTLDsAddress = await situsForbiddenTLDs.getAddress();

        const SitusTLDFactory = await hre.ethers.getContractFactory("SitusTLDFactory");
        const situsTLDFactory = await SitusTLDFactory.deploy(domainPrice, situsForbiddenTLDsAddress, situsMetadataStoreAddress);
        const situsTLDFactoryAddress = await situsTLDFactory.getAddress();

        await situsForbiddenTLDs.addFactoryAddress(situsTLDFactoryAddress);

        const SitusTLD = await ethers.getContractFactory("SitusTLD");
        const situsTLD = await SitusTLD.deploy(
            domainName,
            domainSymbol,
            signer.address, // TLD owner
            domainPrice,
            false, // buying enabled
            domainRoyalty,
            situsTLDFactoryAddress,
            situsMetadataStoreAddress,
        );

        return { situsTLD, situsMetadataStore, situsMetadataStore2, signer, anotherUser, referrer };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsTLD } = await loadFixture(deploySitusTLDFixture);
            expect(await situsTLD.getAddress()).to.be.properAddress;
            expect(await situsTLD.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Owner permissions on Create TLD", function () {
        it("should create a new valid domain as owner even if buying is disabled", async function () {
            const { situsTLD, signer } = await loadFixture(deploySitusTLDFixture);
            // buying domains should be disabled
            const buyingEnabled = await situsTLD.buyingEnabled();
            expect(buyingEnabled).to.be.false;

            const newDomainName = "techie";

            // mint a new valid domain as TLD owner
            await expect(
                situsTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(situsTLD, "DomainCreated");

            // get domain name by token ID
            const firstDomainName = await situsTLD.domainIdsNames(1); // token ID 1
            expect(firstDomainName).to.equal(newDomainName);

            // get domain data by domain name
            const firstDomainData = await situsTLD.domains(newDomainName);
            expect(firstDomainData.name).to.equal(newDomainName);
            expect(firstDomainData.holder).to.equal(signer.address);
        });

        it("should fail to create a new valid domain if user is not TLD owner and buying is disabled", async function () {
            const { situsTLD, anotherUser } = await loadFixture(deploySitusTLDFixture);
            // buying domains should be disabled
            const buyingEnabled = await situsTLD.buyingEnabled();
            expect(buyingEnabled).to.be.false;

            const newDomainName = "techie";

            await expect(
                situsTLD.connect(anotherUser).mint(
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
            const { situsTLD, anotherUser } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            // buying domains should be enabled
            const buyingEnabled = await situsTLD.buyingEnabled();
            expect(buyingEnabled).to.be.true;

            const newDomainName = "techie";

            await situsTLD.connect(anotherUser).mint(
                newDomainName, // domain name (without TLD)
                anotherUser.address, // domain holder
                ethers.ZeroAddress, // referrer
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            // disable buying forever
            await situsTLD.disableBuyingForever();

            // fail at minting new domains
            await expect(
                situsTLD.mint(
                    "test1domain", // domain name (without TLD)
                    anotherUser.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWith("Domain minting disabled forever");

            await expect(
                situsTLD.connect(anotherUser).mint(
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
            const { situsTLD, anotherUser } = await loadFixture(deploySitusTLDFixture);
            const priceBefore = await situsTLD.price();
            expect(priceBefore).to.equal(domainPrice);

            const newPrice = ethers.parseUnits("2", "ether");

            await situsTLD.changePrice(newPrice);

            const priceAfter = await situsTLD.price();
            expect(priceAfter).to.equal(newPrice);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(anotherUser).changePrice(domainPrice)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change the referral fee", async function () {
            const { situsTLD, anotherUser } = await loadFixture(deploySitusTLDFixture);
            const referralBefore = await situsTLD.referral();
            expect(referralBefore).to.equal(1000); // 10% by default

            const newReferral = 500; // 500 bips or 5%

            await situsTLD.changeReferralFee(newReferral);

            const referralAfter = await situsTLD.referral();
            expect(referralAfter).to.equal(newReferral);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(anotherUser).changeReferralFee(200)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should prevent setting referral fee to 50% or higher", async function () {
            const { situsTLD } = await loadFixture(deploySitusTLDFixture);
            const referralBefore = await situsTLD.referral();
            expect(referralBefore).to.equal(1000); // 10% by default

            // if referral fee is set to 50%, the tx should fail
            await expect(situsTLD.changeReferralFee(5000)).to.be.revertedWith("Referral fee cannot be 50% or higher");

            // if referral fee is set to higher than 50%, the tx should fail
            await expect(situsTLD.changeReferralFee(8000)).to.be.revertedWith("Referral fee cannot be 50% or higher");

            const referralAfter = await situsTLD.referral();
            expect(referralAfter).to.equal(1000); // should remain the same as before
        });

        it("should toggle buying domains", async function () {
            const { situsTLD, anotherUser } = await loadFixture(deploySitusTLDFixture);
            const buyingEnabledBefore = await situsTLD.buyingEnabled();
            expect(buyingEnabledBefore).to.be.false;

            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const buyingEnabledAfter = await situsTLD.buyingEnabled();
            expect(buyingEnabledAfter).to.be.true;

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(anotherUser).toggleBuyingDomains()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change max length for a domain name", async function () {
            const { situsTLD, anotherUser } = await loadFixture(deploySitusTLDFixture);
            const nameMaxLengthBefore = await situsTLD.nameMaxLength();
            expect(nameMaxLengthBefore).to.equal(140);

            const newMaxLength = 180;

            await situsTLD.changeNameMaxLength(newMaxLength);

            const nameMaxLengthAfter = await situsTLD.nameMaxLength();
            expect(nameMaxLengthAfter).to.equal(newMaxLength);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(anotherUser).changeNameMaxLength(70)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change the royalty amount", async function () {
            const { situsTLD, anotherUser } = await loadFixture(deploySitusTLDFixture);
            const royaltyBefore = await situsTLD.royalty();
            expect(royaltyBefore).to.equal(0);

            const newRoyalty = 10;

            await situsTLD.changeRoyalty(newRoyalty);

            const royaltyAfter = await situsTLD.royalty();
            expect(royaltyAfter).to.equal(10);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(anotherUser).changeRoyalty(20)).to.be.revertedWith("Sender is not royalty fee updater");
        });

        it("should change metadata contract address and then freeze it", async function () {
            const { situsTLD, situsMetadataStore, situsMetadataStore2, anotherUser } = await loadFixture(deploySitusTLDFixture);
            const mtdAddrBefore = await situsTLD.metadataAddress();
            expect(mtdAddrBefore).to.equal(await situsMetadataStore.getAddress());

            await situsTLD.changeMetadataAddress(situsMetadataStore2.getAddress());

            const mtdAddrAfter = await situsTLD.metadataAddress();
            expect(mtdAddrAfter).to.equal(await situsMetadataStore2.getAddress());

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(anotherUser).changeMetadataAddress(situsMetadataStore.getAddress())).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            await situsTLD.freezeMetadata();

            await expect(situsTLD.changeMetadataAddress(situsMetadataStore.getAddress())).to.be.revertedWith(
                "Cannot change metadata address anymore",
            );
        });
    });
});
