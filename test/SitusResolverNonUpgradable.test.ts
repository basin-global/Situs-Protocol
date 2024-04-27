import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("SitusResolverNonUpgradable", function () {
    const tldPrice = ethers.parseUnits("2", "ether");

    // TLD1
    const tldName1 = ".wagmi";
    const domainSymbol1 = ".WAGMI";
    const domainPrice1 = ethers.parseUnits("1", "ether");

    // TLD2
    const tldName2 = ".degen";
    const domainSymbol2 = ".DEGEN";
    const domainPrice2 = ethers.parseUnits("2", "ether");

    // TLD3
    const tldName3 = ".ape";
    const domainSymbol3 = ".APE";
    const domainPrice3 = ethers.parseUnits("3", "ether");

    // Fixture
    async function deploySitusResolverNonUpgradableFixture() {
        const [admin, tldOwner, user] = await hre.ethers.getSigners();

        const SitusMetadataStore = await hre.ethers.getContractFactory("SitusMetadataStore");
        const situsMetadataStore = await SitusMetadataStore.deploy();
        const situsMetadataStoreAddress = await situsMetadataStore.getAddress();

        const SitusForbiddenTLDs = await hre.ethers.getContractFactory("SitusForbiddenTLDs");
        const situsForbiddenTLDs = await SitusForbiddenTLDs.deploy();
        const situsForbiddenTLDsAddress = await situsForbiddenTLDs.getAddress();

        const SitusResolverNonUpgradable = await hre.ethers.getContractFactory("SitusResolverNonUpgradable");
        const situsResolverNonUpgradable = await SitusResolverNonUpgradable.deploy();

        const SitusTLDFactory1 = await hre.ethers.getContractFactory("SitusTLDFactory");
        const situsTLDFactory1 = await SitusTLDFactory1.deploy(tldPrice, situsForbiddenTLDsAddress, situsMetadataStoreAddress);
        const situsTLDFactoryAddress1 = await situsTLDFactory1.getAddress();

        // deploy second factory contract
        const SitusTLDFactory2 = await hre.ethers.getContractFactory("SitusTLDFactory");
        const situsTLDFactory2 = await SitusTLDFactory2.deploy(tldPrice, situsForbiddenTLDsAddress, situsMetadataStoreAddress);
        const situsTLDFactoryAddress2 = await situsTLDFactory2.getAddress();

        await situsForbiddenTLDs.addFactoryAddress(situsTLDFactoryAddress1);
        await situsForbiddenTLDs.addFactoryAddress(situsTLDFactoryAddress2);

        // create TLD no. 1
        await situsTLDFactory1.ownerCreateTld(
            tldName1,
            domainSymbol1,
            tldOwner.address, // TLD owner
            domainPrice1,
            true, // buying enabled
        );

        // create TLD no. 2
        await situsTLDFactory1.ownerCreateTld(
            tldName2,
            domainSymbol2,
            tldOwner.address, // TLD owner
            domainPrice2,
            true, // buying enabled
        );

        // create TLD no. 3
        await situsTLDFactory2.ownerCreateTld(
            tldName3,
            domainSymbol3,
            tldOwner.address, // TLD owner
            domainPrice3,
            true, // buying enabled
        );

        const tldAddress1 = await situsTLDFactory1.tldNamesAddresses(tldName1);
        const tldAddress2 = await situsTLDFactory1.tldNamesAddresses(tldName2);
        const tldAddress3 = await situsTLDFactory2.tldNamesAddresses(tldName3);

        const tldContract1 = await hre.ethers.getContractAt("SitusTLD", tldAddress1);
        const tldContract2 = await hre.ethers.getContractAt("SitusTLD", tldAddress2);
        const tldContract3 = await hre.ethers.getContractAt("SitusTLD", tldAddress3);

        return {
            situsResolverNonUpgradable,
            situsTLDFactory1,
            situsTLDFactory2,
            situsForbiddenTLDs,
            admin,
            tldOwner,
            user,
            tldContract1,
            tldContract2,
            tldContract3,
        };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsTLDFactory1, situsTLDFactory2 } = await loadFixture(deploySitusResolverNonUpgradableFixture);
            expect(await situsTLDFactory1.getAddress()).to.be.properAddress;
            expect(await situsTLDFactory1.getAddress()).to.not.equal(ethers.ZeroAddress);
            expect(await situsTLDFactory2.getAddress()).to.be.properAddress;
            expect(await situsTLDFactory2.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Multiple Factory Test", function () {
        it("adds and removes a factory address (only owner)", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, situsTLDFactory2, admin, tldOwner } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            const owner = await situsResolverNonUpgradable.owner();
            expect(owner).to.equal(admin.address);

            const situsTLDFactory1Address = await situsTLDFactory1.getAddress();

            // check for empty factories array
            const factoryAddresses1 = await situsResolverNonUpgradable.getFactoriesArray();
            expect(factoryAddresses1).to.be.empty;

            // add factory1 address
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1Address);

            // check to see if factory1 address is in the array
            const factoryAddresses2 = await situsResolverNonUpgradable.getFactoriesArray();
            expect(factoryAddresses2.includes(situsTLDFactory1Address)).to.be.true;

            // tldOwner tries to add Factory2 address, should revert
            await expect(situsResolverNonUpgradable.connect(tldOwner).addFactoryAddress(situsTLDFactory2.getAddress())).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            // add for Factory2 Address
            const situsTLDFactory2Address = await situsTLDFactory2.getAddress();
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory2Address);

            // check for both addresses
            const factoryAddresses3 = await situsResolverNonUpgradable.getFactoriesArray();
            expect(factoryAddresses3.includes(situsTLDFactory1Address)).to.be.true;
            expect(factoryAddresses3.includes(situsTLDFactory2Address)).to.be.true;

            // remove Factory1 address
            await situsResolverNonUpgradable.removeFactoryAddress(0);

            // check for Factory2 addresses
            const factoryAddresses4 = await situsResolverNonUpgradable.getFactoriesArray();
            expect(factoryAddresses4.includes(situsTLDFactory2Address)).to.be.true;

            // fail on remove if user is not owner
            await expect(situsResolverNonUpgradable.connect(tldOwner).removeFactoryAddress(0)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );
        });

        it("fetches a domain holder", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, tldOwner, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            const domainName = "tldOwner";

            // check domain holder via TLD contract before
            const domainHolderViaTldBefore = await tldContract1.getDomainHolder(domainName);
            expect(domainHolderViaTldBefore).to.equal(ethers.ZeroAddress);

            // create domain name
            await tldContract1.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            // check domain holder via TLD contract after
            const domainHolderViaTldAfter = await tldContract1.getDomainHolder(domainName);
            expect(domainHolderViaTldAfter).to.equal(tldOwner.address);

            // check domain holder via Resolver before
            const domainHolderViaResolverBefore = await situsResolverNonUpgradable.getDomainHolder(domainName, tldName1);
            expect(domainHolderViaResolverBefore).to.equal(ethers.ZeroAddress);

            // add factory address to the resolver contract
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());

            // check domain holder via Resolver after
            const domainHolderViaResolverAfter = await situsResolverNonUpgradable.getDomainHolder(domainName, tldName1);
            expect(domainHolderViaResolverAfter).to.equal(tldOwner.address);

            // check non-existing domain name via Resolver
            const domainHolderViaResolverNonExisting = await situsResolverNonUpgradable.getDomainHolder("nonExistingDomain", tldName1);
            expect(domainHolderViaResolverNonExisting).to.equal(ethers.ZeroAddress);

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            // should return 0x0 address because TLD is deprecated
            const domainHolderViaResolverDeprecated = await situsResolverNonUpgradable.getDomainHolder(domainName, tldName1);
            expect(domainHolderViaResolverDeprecated).to.equal(ethers.ZeroAddress);
        });

        it("fetches a default domain for a user address", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, tldOwner, user, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            // query default domain via TLD contract before
            const defaultDomainViaTldBefore = await tldContract1.defaultNames(tldOwner.address);
            expect(defaultDomainViaTldBefore).to.equal("");

            // create domain name
            const domainName = "tldowner";

            await tldContract1.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            // check default domain via TLD contract after
            const defaultDomainViaTldAfter = await tldContract1.defaultNames(tldOwner.address);
            expect(defaultDomainViaTldAfter).to.equal(domainName);

            // check default domain via Resolver before
            const defaultDomainViaResolverBefore = await situsResolverNonUpgradable.getDefaultDomain(tldOwner.address, tldName1);
            expect(defaultDomainViaResolverBefore).to.equal("");

            // add factory address to the resolver contract
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());

            // check default domain via Resolver after
            const defaultDomainViaResolverAfter = await situsResolverNonUpgradable.getDefaultDomain(tldOwner.address, tldName1);
            expect(defaultDomainViaResolverAfter).to.equal(domainName);

            // check non-existing default domain via Resolver
            const defaultDomainViaResolverNonExisting = await situsResolverNonUpgradable.getDefaultDomain(user.address, tldName1);
            expect(defaultDomainViaResolverNonExisting).to.equal("");

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            // should return empty string because TLD is deprecated
            const domainDomainViaResolverDeprecated = await situsResolverNonUpgradable.getDomainData(tldOwner.address, tldName1);
            expect(domainDomainViaResolverDeprecated).to.equal("");
        });

        it("fetches domain data", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, tldOwner, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            const domainName = "tldOwner";

            // check domain data via TLD contract before
            const domainDataViaTldBefore = await tldContract1.getDomainData(domainName);
            expect(domainDataViaTldBefore).to.equal("");

            // create domain name
            await tldContract1.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            const newDomainData = "new data";

            await tldContract1.connect(tldOwner).editData(domainName, newDomainData);

            // check domain data via TLD contract after
            const domainDataViaTldAfter = await tldContract1.getDomainData(domainName);
            expect(domainDataViaTldAfter).to.equal(newDomainData);

            // check domain data via Resolver before
            const domainDataViaResolverBefore = await situsResolverNonUpgradable.getDomainData(domainName, tldName1);
            expect(domainDataViaResolverBefore).to.equal("");

            // add factory address to the resolver contract
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());

            // check domain data via Resolver after
            const domainDataViaResolverAfter = await situsResolverNonUpgradable.getDomainData(domainName, tldName1);
            expect(domainDataViaResolverAfter).to.equal(newDomainData);

            // check non-existing domain name via Resolver
            const domainDataViaResolverNonExisting = await situsResolverNonUpgradable.getDomainData("nonExistingDomain", tldName1);
            expect(domainDataViaResolverNonExisting).to.equal("");

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            // should return 0x0 address because TLD is deprecated
            const domainDataViaResolverDeprecated = await situsResolverNonUpgradable.getDomainData(domainName, tldName1);
            expect(domainDataViaResolverDeprecated).to.equal("");
        });

        it("fetches the address of a given TLD", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, situsTLDFactory2, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );

            const tldContract1Address = await tldContract1.getAddress();

            const tldAddressBefore = await situsResolverNonUpgradable.getTldAddress(tldName1);
            expect(tldAddressBefore).to.equal(ethers.ZeroAddress);

            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory2.getAddress());

            const tldAddressAfter1 = await situsResolverNonUpgradable.getTldAddress(tldName1);
            expect(tldAddressAfter1).to.equal(tldContract1Address);

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            const tldAddressAfter2 = await situsResolverNonUpgradable.getTldAddress(tldName1);
            expect(tldAddressAfter2).to.equal(ethers.ZeroAddress);
        });

        it("fetches a stringified CSV of all active TLDs", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, situsTLDFactory2, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            const tldsCsvStringBefore = await situsResolverNonUpgradable.getTlds();
            expect(tldsCsvStringBefore).to.be.empty;

            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory2.getAddress());

            const tldsCsvStringAfter = await situsResolverNonUpgradable.getTlds();
            expect(tldsCsvStringAfter).to.include(tldName1);

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            const tldsCsvStringAfter2 = await situsResolverNonUpgradable.getTlds();
            expect(tldsCsvStringAfter2).to.not.include(tldName1);
        });

        it("fetches a list of default domains for a user address across all TLDs", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, situsTLDFactory2, tldOwner, user, tldContract1, tldContract3 } =
                await loadFixture(deploySitusResolverNonUpgradableFixture);
            // query default domain via TLD contract before
            const defaultDomainViaTldBefore = await tldContract1.defaultNames(tldOwner.address);
            expect(defaultDomainViaTldBefore).to.equal("");

            // create domain name
            const domainName = "tldowner";

            await tldContract1.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            await tldContract3.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice3, // pay  for the domain
                },
            );

            // check default domain via TLD contract after
            const defaultDomainViaTldAfter = await tldContract1.defaultNames(tldOwner.address);
            expect(defaultDomainViaTldAfter).to.equal(domainName);

            // check default domain via Resolver before
            const defaultDomainViaResolverBefore = await situsResolverNonUpgradable.getDefaultDomains(tldOwner.address);
            expect(defaultDomainViaResolverBefore).to.equal("");

            // add factory addresses to the resolver contract
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory2.getAddress());

            // check default domain via Resolver after
            const defaultDomainViaResolverAfter = await situsResolverNonUpgradable.getDefaultDomains(tldOwner.address);
            expect(defaultDomainViaResolverAfter).to.equal(domainName + tldName1 + " " + domainName + tldName3);

            // check non-existing default domain via Resolver
            const defaultDomainViaResolverNonExisting = await situsResolverNonUpgradable.getDefaultDomains(user.address);
            expect(defaultDomainViaResolverNonExisting).to.equal("");

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            // should return 1 less domain name because TLD is deprecated
            const defaultDomainViaResolverAfter2 = await situsResolverNonUpgradable.getDefaultDomains(tldOwner.address);
            expect(defaultDomainViaResolverAfter2).to.equal(domainName + tldName3);
        });

        it("fetches a single users default domain name, the first that comes", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, situsTLDFactory2, tldOwner, user, tldContract1, tldContract3 } =
                await loadFixture(deploySitusResolverNonUpgradableFixture);
            // query default domain via TLD contract before
            const defaultDomainViaTldBefore = await tldContract1.defaultNames(tldOwner.address);
            expect(defaultDomainViaTldBefore).to.equal("");

            // create domain name
            const domainName = "tldowner";

            await tldContract1.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            await tldContract3.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice3, // pay  for the domain
                },
            );

            // check default domain via TLD contract after
            const defaultDomainViaTldAfter = await tldContract1.defaultNames(tldOwner.address);
            expect(defaultDomainViaTldAfter).to.equal(domainName);

            // check default domain via Resolver before
            const defaultDomainViaResolverBefore = await situsResolverNonUpgradable.getFirstDefaultDomain(tldOwner.address);
            expect(defaultDomainViaResolverBefore).to.equal("");

            // add factory addresses to the resolver contract
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory2.getAddress());

            // check default domain via Resolver after
            const defaultDomainViaResolverAfter = await situsResolverNonUpgradable.getFirstDefaultDomain(tldOwner.address);
            expect(defaultDomainViaResolverAfter).to.equal(domainName + tldName1);

            // check non-existing default domain via Resolver
            const defaultDomainViaResolverNonExisting = await situsResolverNonUpgradable.getFirstDefaultDomain(user.address);
            expect(defaultDomainViaResolverNonExisting).to.equal("");

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            // should return a different domain name because the first TLD is deprecated
            const defaultDomainViaResolverAfter2 = await situsResolverNonUpgradable.getDefaultDomains(tldOwner.address);
            expect(defaultDomainViaResolverAfter2).to.equal(domainName + tldName3);
        });

        it("un/sets a TLD as deprecated (only owner)", async function () {
            const { situsResolverNonUpgradable, tldOwner, tldContract2 } = await loadFixture(deploySitusResolverNonUpgradableFixture);
            const isDeprecatedBefore = await situsResolverNonUpgradable.isTldDeprecated(tldContract2.getAddress());
            expect(isDeprecatedBefore).to.be.false;

            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract2.getAddress());

            const isDeprecatedAfter1 = await situsResolverNonUpgradable.isTldDeprecated(tldContract2.getAddress());
            expect(isDeprecatedAfter1).to.be.true;

            await situsResolverNonUpgradable.removeDeprecatedTldAddress(tldContract2.getAddress());

            const isDeprecatedAfter2 = await situsResolverNonUpgradable.isTldDeprecated(tldContract2.getAddress());
            expect(isDeprecatedAfter2).to.be.false;

            // should fail if user is not owner
            await expect(
                situsResolverNonUpgradable.connect(tldOwner).addDeprecatedTldAddress(tldContract2.getAddress()),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("fetch domain metadata via tokenURI", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, tldOwner, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            const domainName = "tldowner";

            // create domain name
            await tldContract1.mint(
                domainName, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            // check domain metadata via TLD contract
            const domainMetadataViaTldAfter = await tldContract1.tokenURI(1);
            const mdJson = Buffer.from(domainMetadataViaTldAfter.substring(29), "base64");
            const mdResult = JSON.parse(mdJson.toString());
            expect(mdResult.name).to.equal(domainName + tldName1);

            // check domain metadata via Resolver contract
            const domainMetadataViaTldAfter2 = await situsResolverNonUpgradable.getDomainTokenUri(domainName, tldName1);
            expect(domainMetadataViaTldAfter2).to.be.empty;

            // add factory address to the resolver contract
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());

            // check domain metadata via Resolver contract
            const domainMetadataViaTldAfter3 = await situsResolverNonUpgradable.getDomainTokenUri(domainName, tldName1);
            const mdJson2 = Buffer.from(domainMetadataViaTldAfter3.substring(29), "base64");
            const mdResult2 = JSON.parse(mdJson2.toString());
            expect(mdResult2.name).to.equal(domainName + tldName1);

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            // should return an empty string because the TLD is deprecated
            const domainMetadataViaTldAfter4 = await situsResolverNonUpgradable.getDomainTokenUri(domainName, tldName1);
            expect(domainMetadataViaTldAfter4).to.be.empty;
        });

        it("fetches the address of the factory through which a given TLD was created", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, situsTLDFactory2, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            const factoryAddressBefore = await situsResolverNonUpgradable.getTldFactoryAddress(tldName1);
            expect(factoryAddressBefore).to.equal(ethers.ZeroAddress);

            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory2.getAddress());

            const factoryAddressAfter1 = await situsResolverNonUpgradable.getTldFactoryAddress(tldName1);
            expect(factoryAddressAfter1).to.equal(await situsTLDFactory1.getAddress());

            // deprecate a TLD
            await situsResolverNonUpgradable.addDeprecatedTldAddress(tldContract1.getAddress());

            const factoryAddressAfter2 = await situsResolverNonUpgradable.getTldFactoryAddress(tldName1);
            expect(factoryAddressAfter2).to.equal(ethers.ZeroAddress);
        });

        it("allows user to set a custom default domain", async function () {
            const { situsResolverNonUpgradable, situsTLDFactory1, tldOwner, tldContract1 } = await loadFixture(
                deploySitusResolverNonUpgradableFixture,
            );
            // check default domain via Resolver before
            const defaultDomainViaResolverBefore = await situsResolverNonUpgradable.getDefaultDomain(tldOwner.address, tldName1);
            expect(defaultDomainViaResolverBefore).to.equal("");

            // add factory address to the resolver contract
            await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactory1.getAddress());

            // create domain name
            const domainName1 = "tldownera";

            await tldContract1.mint(
                domainName1, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            // create another domain name
            const domainName2 = "tldownerb";

            await tldContract1.mint(
                domainName2, // domain name (without TLD)
                tldOwner.address, // domain owner
                ethers.ZeroAddress, // no referrer
                {
                    value: domainPrice1, // pay  for the domain
                },
            );

            // check default domain via Resolver after
            const defaultDomainViaResolverAfter = await situsResolverNonUpgradable.getDefaultDomain(tldOwner.address, tldName1);
            expect(defaultDomainViaResolverAfter).to.equal(domainName1);

            // check the first default domain via Resolver before
            const defaultFirstDomainViaResolverBefore = await situsResolverNonUpgradable.getFirstDefaultDomain(tldOwner.address);
            expect(defaultFirstDomainViaResolverBefore).to.equal(domainName1 + ".wagmi");

            // user sets a different domain to be the default domain in the Resolver contract
            await situsResolverNonUpgradable.connect(tldOwner).setCustomDefaultDomain(domainName2, ".wagmi");

            // check the first default domain via Resolver after
            const defaultFirstDomainViaResolverAfter = await situsResolverNonUpgradable.getFirstDefaultDomain(tldOwner.address);
            expect(defaultFirstDomainViaResolverAfter).to.equal(domainName2 + ".wagmi");

            await expect(
                situsResolverNonUpgradable.connect(tldOwner).setCustomDefaultDomain("admin", ".wagmi"),
            ).to.be.revertedWithCustomError(situsResolverNonUpgradable, "NotDomainOwner");

            // un-set/remove a custom default domain
            await situsResolverNonUpgradable.connect(tldOwner).setCustomDefaultDomain("", "");

            // check the first default domain via Resolver after
            const defaultFirstDomainViaResolverAfter2 = await situsResolverNonUpgradable.getFirstDefaultDomain(tldOwner.address);
            expect(defaultFirstDomainViaResolverAfter2).to.equal(domainName1 + ".wagmi");
        });
    });
});
