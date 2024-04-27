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
        const [admin, tldOwner, user, referrer] = await hre.ethers.getSigners();

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
            tldOwner.address, // TLD owner
            domainPrice,
            false, // buying enabled
            domainRoyalty,
            situsTLDFactoryAddress,
            situsMetadataStoreAddress,
        );

        return { situsTLD, situsMetadataStore, situsMetadataStore2, admin, tldOwner, user, referrer };
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
            const { situsTLD, tldOwner } = await loadFixture(deploySitusTLDFixture);
            // buying domains should be disabled
            const buyingEnabled = await situsTLD.buyingEnabled();
            expect(buyingEnabled).to.be.false;

            const newDomainName = "techie";

            // mint a new valid domain as TLD owner
            await expect(
                situsTLD.connect(tldOwner).mint(
                    newDomainName, // domain name (without TLD)
                    tldOwner.address, // domain holder
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
            expect(firstDomainData.holder).to.equal(tldOwner.address);
        });

        it("should fail to create a new valid domain if user is not TLD owner and buying is disabled", async function () {
            const { situsTLD, user } = await loadFixture(deploySitusTLDFixture);
            // buying domains should be disabled
            const buyingEnabled = await situsTLD.buyingEnabled();
            expect(buyingEnabled).to.be.false;

            const newDomainName = "techie";

            await expect(
                situsTLD.connect(user).mint(
                    newDomainName, // domain name (without TLD)
                    user.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLD, "BuyingDisabled");
        });

        it("should fail to create a new valid domain if buying is disabled forever", async function () {
            const { situsTLD, tldOwner, user } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.connect(tldOwner).toggleBuyingDomains(); // enable buying domains

            // buying domains should be enabled
            const buyingEnabled = await situsTLD.buyingEnabled();
            expect(buyingEnabled).to.be.true;

            const newDomainName = "techie";

            await situsTLD.connect(user).mint(
                newDomainName, // domain name (without TLD)
                user.address, // domain holder
                ethers.ZeroAddress, // referrer
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            // disable buying forever
            await situsTLD.connect(tldOwner).disableBuyingForever();

            // fail at minting new domains, even the tld owner
            await expect(
                situsTLD.connect(tldOwner).mint(
                    "test1domain", // domain name (without TLD)
                    user.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLD, "DisabledForever");

            await expect(
                situsTLD.connect(user).mint(
                    "test2domain", // domain name (without TLD)
                    user.address, // domain holder
                    ethers.ZeroAddress, // referrer
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLD, "DisabledForever");
        });

        it("should change the price of a domain, fail if not tld owner", async function () {
            const { situsTLD, tldOwner, user } = await loadFixture(deploySitusTLDFixture);
            const priceBefore = await situsTLD.price();
            expect(priceBefore).to.equal(domainPrice);

            const newPrice = ethers.parseUnits("2", "ether");

            await situsTLD.connect(tldOwner).changePrice(newPrice);

            const priceAfter = await situsTLD.price();
            expect(priceAfter).to.equal(newPrice);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(user).changePrice(domainPrice)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change the referral fee, fail if not tld owner", async function () {
            const { situsTLD, tldOwner, user } = await loadFixture(deploySitusTLDFixture);
            const referralBefore = await situsTLD.referral();
            expect(referralBefore).to.equal(1000); // 10% by default

            const newReferral = 500; // 500 bips or 5%

            await situsTLD.connect(tldOwner).changeReferralFee(newReferral);

            const referralAfter = await situsTLD.referral();
            expect(referralAfter).to.equal(newReferral);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(user).changeReferralFee(200)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should prevent setting referral fee to 50% or higher", async function () {
            const { situsTLD, tldOwner } = await loadFixture(deploySitusTLDFixture);
            const referralBefore = await situsTLD.referral();
            expect(referralBefore).to.equal(1000); // 10% by default

            // if referral fee is set to 50%, the tx should fail
            await expect(situsTLD.connect(tldOwner).changeReferralFee(5000)).to.be.revertedWithCustomError(situsTLD, "TooHigh");

            // if referral fee is set to higher than 50%, the tx should fail
            await expect(situsTLD.connect(tldOwner).changeReferralFee(8000)).to.be.revertedWithCustomError(situsTLD, "TooHigh");

            const referralAfter = await situsTLD.referral();
            expect(referralAfter).to.equal(1000); // should remain the same as before
        });

        it("should toggle buying domains", async function () {
            const { situsTLD, tldOwner, user } = await loadFixture(deploySitusTLDFixture);
            const buyingEnabledBefore = await situsTLD.buyingEnabled();
            expect(buyingEnabledBefore).to.be.false;

            await situsTLD.connect(tldOwner).toggleBuyingDomains(); // enable buying domains

            const buyingEnabledAfter = await situsTLD.buyingEnabled();
            expect(buyingEnabledAfter).to.be.true;

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(user).toggleBuyingDomains()).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change max length for a domain name", async function () {
            const { situsTLD, tldOwner, user } = await loadFixture(deploySitusTLDFixture);
            const nameMaxLengthBefore = await situsTLD.nameMaxLength();
            expect(nameMaxLengthBefore).to.equal(140);

            const newMaxLength = 180;

            await situsTLD.connect(tldOwner).changeNameMaxLength(newMaxLength);

            const nameMaxLengthAfter = await situsTLD.nameMaxLength();
            expect(nameMaxLengthAfter).to.equal(newMaxLength);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(user).changeNameMaxLength(70)).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should change the royalty amount", async function () {
            const { situsTLD, admin, user } = await loadFixture(deploySitusTLDFixture);
            const royaltyBefore = await situsTLD.royalty();
            expect(royaltyBefore).to.equal(0);

            const newRoyalty = 10;

            // Royalty Fee Updater is the factory.owner by default
            await situsTLD.connect(admin).changeRoyalty(newRoyalty);

            const royaltyAfter = await situsTLD.royalty();
            expect(royaltyAfter).to.equal(10);

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(user).changeRoyalty(20)).to.be.revertedWithCustomError(situsTLD, "NotRoyaltyFeeUpdater");
        });

        it("should change metadata contract address and then freeze it", async function () {
            const { situsTLD, situsMetadataStore, situsMetadataStore2, tldOwner, user } = await loadFixture(deploySitusTLDFixture);
            const mtdAddrBefore = await situsTLD.metadataAddress();
            expect(mtdAddrBefore).to.equal(await situsMetadataStore.getAddress());

            await situsTLD.connect(tldOwner).changeMetadataAddress(situsMetadataStore2.getAddress());

            const mtdAddrAfter = await situsTLD.metadataAddress();
            expect(mtdAddrAfter).to.equal(await situsMetadataStore2.getAddress());

            // if user is not owner, the tx should revert
            await expect(situsTLD.connect(user).changeMetadataAddress(situsMetadataStore.getAddress())).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            await situsTLD.connect(tldOwner).freezeMetadata();

            await expect(situsTLD.connect(tldOwner).changeMetadataAddress(situsMetadataStore.getAddress())).to.be.revertedWithCustomError(
                situsTLD,
                "MetadataFrozen",
            );
        });
    });
});
