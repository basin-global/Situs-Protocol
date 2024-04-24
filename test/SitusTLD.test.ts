import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ContractTransactionReceipt, EventLog } from "ethers";
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

describe("SitusTLD", function () {
    const domainName = ".web3";
    const domainSymbol = "WEB3";
    const domainPrice = ethers.parseUnits("1", "ether");
    const domainRoyalty = 10; // royalty in bips (10 bips is 0.1%)

    // Fixture
    async function deploySitusTLDFixture() {
        const [signer, anotherUser, referrer] = await hre.ethers.getSigners();

        const SitusMetadataStore = await hre.ethers.getContractFactory("SitusMetadataStore");
        const situsMetadataStore = await SitusMetadataStore.deploy();
        const situsMetadataStoreAddress = await situsMetadataStore.getAddress();

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

        return { situsTLD, situsMetadataStore, signer, anotherUser, referrer };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsTLD } = await loadFixture(deploySitusTLDFixture);
            expect(await situsTLD.getAddress()).to.be.properAddress;
            expect(await situsTLD.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Create TLD", function () {
        it("should confirm the correct TLD name", async function () {
            const { situsTLD } = await loadFixture(deploySitusTLDFixture);
            const name = await situsTLD.name();
            expect(name).to.equal(domainName);
        });

        it("should create a new valid domain", async function () {
            const { situsTLD, signer, anotherUser, referrer } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const price = await situsTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // get referrer's balance BEFORE
            const balanceReferrerBefore = await hre.ethers.provider.getBalance(referrer.address);

            const totalSupplyBefore = await situsTLD.totalSupply();
            expect(totalSupplyBefore).to.equal(0);

            const tx = await situsTLD.mint(
                newDomainName, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const receipt = await tx.wait();

            calculateGasCosts("Mint", receipt);

            const event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === "DomainCreated") as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfter = await situsTLD.totalSupply();
            expect(totalSupplyAfter).to.equal(1);

            // get referrer's balance AFTER
            const balanceReferrerAfter = await hre.ethers.provider.getBalance(referrer.address);

            expect(BigInt(balanceReferrerAfter) - BigInt(balanceReferrerBefore)).to.equal(BigInt("100000000000000000"));

            // get domain name by token ID
            const firstDomainName = await situsTLD.domainIdsNames(1);
            expect(firstDomainName).to.equal(newDomainName);

            // get domain data by domain name
            const firstDomainData = await situsTLD.domains(newDomainName);
            expect(firstDomainData.name).to.equal(newDomainName);
            expect(firstDomainData.holder).to.equal(signer.address);
            expect(firstDomainData.tokenId).to.equal(1);

            // mint another domain
            await situsTLD.mint(
                "second", // domain name (without TLD)
                referrer.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: domainPrice, // pay  for the domain
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
            await situsTLD.connect(anotherUser).mint(
                "a", // domain name (without TLD)
                anotherUser.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            // check total supply of tokens
            const totalSupplyAfterA = await situsTLD.totalSupply();
            expect(totalSupplyAfterA).to.equal(3);

            // get domain data by domain name
            const aDomainData = await situsTLD.domains("a");
            expect(aDomainData.name).to.equal("a");
            expect(aDomainData.holder).to.equal(anotherUser.address);
            expect(aDomainData.tokenId).to.equal(3);

            // fail at minting an empty domain
            await expect(
                situsTLD.mint(
                    // this approach is better for getting gasUsed value from receipt
                    "", // empty domain name (without TLD)
                    anotherUser.address, // domain owner
                    referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWith("Domain name empty");
        });

        it("should transfer domain to another user", async function () {
            const { situsTLD, signer, anotherUser } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const newDomainName = "techie";
            const tokenId = 1;

            await expect(
                situsTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(situsTLD, "DomainCreated");

            // get owner
            const domainOwnerBefore = await situsTLD.ownerOf(tokenId);
            expect(domainOwnerBefore).to.equal(signer.address);

            // get domain data by domain name
            const firstDomainDataBefore = await situsTLD.domains(newDomainName);
            expect(firstDomainDataBefore.name).to.equal(newDomainName);
            expect(firstDomainDataBefore.holder).to.equal(signer.address);

            // transfer domain from signer to another user
            /*
            await expect(situsTLD.transferFrom(
              signer.address, // from
              anotherUser.address, // to
              tokenId // token ID
            )).to.emit(situsTLD, "Transfer");
            */

            const tx = await situsTLD.transferFrom(
                // this approach is better for getting gasUsed value from receipt
                signer.address, // from
                anotherUser.address, // to
                tokenId, // token ID
            );

            const receipt = await tx.wait();

            calculateGasCosts("Transfer", receipt);

            const event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === "Transfer") as EventLog;
            expect(event).is.not.empty;

            // get default name (after)
            const defaultNameAfterSigner = await situsTLD.defaultNames(signer.address);
            expect(defaultNameAfterSigner).to.be.empty;

            const defaultNameAfterAnother = await situsTLD.defaultNames(anotherUser.address);
            expect(defaultNameAfterAnother).to.equal(newDomainName);

            // get owner
            const domainOwnerAfter = await situsTLD.ownerOf(tokenId);
            expect(domainOwnerAfter).to.equal(anotherUser.address);

            // get domain data by domain name
            const firstDomainDataAfter = await situsTLD.domains(newDomainName);
            expect(firstDomainDataAfter.name).to.equal(newDomainName);
            expect(firstDomainDataAfter.holder).to.equal(anotherUser.address);
        });

        it("should change default domain", async function () {
            const { situsTLD, signer, anotherUser } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const price = await situsTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // mint domain
            await expect(
                situsTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(situsTLD, "DomainCreated");

            // get default name (before)
            const defaultNameBefore = await situsTLD.defaultNames(signer.address);
            expect(defaultNameBefore).to.equal(newDomainName);

            const anotherDomainName = "tempe";

            // mint domain
            await expect(
                situsTLD.mint(
                    anotherDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(situsTLD, "DomainCreated");

            // get default name (after 1)
            const defaultNameAfter = await situsTLD.defaultNames(signer.address);
            expect(defaultNameAfter).to.equal(newDomainName); // default domain name should remain the first domain (techie)

            // change default domain to tempe
            await expect(situsTLD.editDefaultDomain(anotherDomainName)).to.emit(situsTLD, "DefaultDomainChanged");

            // get default name (after change)
            const defaultNameAfterChange = await situsTLD.defaultNames(signer.address);
            expect(defaultNameAfterChange).to.equal(anotherDomainName); // default domain name should change to tempe

            // fail at changing default domain if msg.sender is not domain holder
            await expect(
                situsTLD.connect(anotherUser).editDefaultDomain(
                    newDomainName, // trying to change back to techie (but msg.sender is not domain holder)
                ),
            ).to.be.revertedWith("You do not own the selected domain");
        });

        it("should change domain data", async function () {
            const { situsTLD, signer, anotherUser } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const price = await situsTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // mint domain
            await expect(
                situsTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(situsTLD, "DomainCreated");

            // get domain data by domain name (before)
            const firstDomainDataBefore = await situsTLD.domains(newDomainName);
            expect(firstDomainDataBefore.data).to.equal("");

            const newData = "{'description': 'This is my NEW domain description'}";

            // set new data
            const tx = await situsTLD.editData(
                newDomainName, // domain name (without TLD)
                newData,
            );

            const receipt = await tx.wait();

            calculateGasCosts("DataChanged", receipt);

            const event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === "DataChanged") as EventLog;
            expect(event).is.not.empty;

            // get domain data by domain name (after)
            const firstDomainDataAfter = await situsTLD.domains(newDomainName);
            expect(firstDomainDataAfter.data).to.equal(newData);

            // fail at changing data if msg.sender is not domain holder
            await expect(
                situsTLD.connect(anotherUser).editData(
                    newDomainName, // domain name (without TLD)
                    "No change",
                ),
            ).to.be.revertedWith("Only domain holder can edit their data");
        });

        it("should change metadata", async function () {
            const { situsTLD, situsMetadataStore, signer, anotherUser } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const price = await situsTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // mint domain
            await expect(
                situsTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(situsTLD, "DomainCreated");

            // get domain token ID
            const domainData = await situsTLD.domains(newDomainName);
            expect(domainData.tokenId).to.equal(1);

            // get domain metadata
            const domainMetadata = await situsTLD.tokenURI(domainData.tokenId);
            const mdJson = Buffer.from(domainMetadata.substring(29), "base64");
            const mdResult = JSON.parse(mdJson.toString());
            expect(mdResult.name).to.equal(newDomainName + domainName);
            expect(mdResult.description).to.equal("");

            // change description in the metadata contract
            const newDesc = "The best top-level domain";

            await situsMetadataStore.changeDescription(situsTLD.getAddress(), newDesc);

            // get domain metadata
            const domainMetadata2 = await situsTLD.tokenURI(domainData.tokenId);
            const mdJson2 = Buffer.from(domainMetadata2.substring(29), "base64");
            const mdResult2 = JSON.parse(mdJson2.toString());
            expect(mdResult2.name).to.equal(newDomainName + domainName);
            expect(mdResult2.description).to.equal(newDesc);

            // fail at changing metadata description if sender is not TLD owner
            await expect(situsMetadataStore.connect(anotherUser).changeDescription(situsTLD.getAddress(), newDesc)).to.be.revertedWith(
                "Sender not TLD owner",
            );
        });

        it("should create a new valid domain, but with non-ascii letters input", async function () {
            const { situsTLD, signer, referrer } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const price = await situsTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "poɯSnᴉǝ";

            // TODO set domainPrice value here
            const tx = await situsTLD.mint(newDomainName, signer.address, referrer.address, { value: domainPrice });

            const receipt = await tx.wait();

            calculateGasCosts("Mint " + newDomainName, receipt);

            const event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === "DomainCreated") as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfter = await situsTLD.totalSupply();
            expect(totalSupplyAfter).to.equal(1);

            const getDomainName = await situsTLD.domainIdsNames(1);
            console.log(getDomainName);
            expect(getDomainName).to.equal(newDomainName.toLowerCase()); // should be lowercase
        });

        it("should mint a token and burn it and mint it again", async function () {
            const { situsTLD, signer, referrer } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const totalSupplyBeforeMint = await situsTLD.totalSupply();
            expect(totalSupplyBeforeMint).to.equal(0);

            const balanceBeforeMint = await situsTLD.balanceOf(signer.address);
            expect(balanceBeforeMint).to.equal(0);

            const getDomainNameBeforeMint = await situsTLD.domainIdsNames(1); // token ID 1
            expect(getDomainNameBeforeMint).to.equal(""); // should be empty string

            const price = await situsTLD.price();
            expect(price).to.equal(domainPrice);

            // MINT DOMAIN

            const newDomainName = "signer";

            await situsTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMint = await situsTLD.totalSupply();
            expect(totalSupplyAfterMint).to.equal(1);

            const balanceAfterMint = await situsTLD.balanceOf(signer.address);
            expect(balanceAfterMint).to.equal(1);

            const getDomainDataAfterMint = await situsTLD.domains(newDomainName);
            expect(getDomainDataAfterMint.name).to.equal(newDomainName);
            expect(getDomainDataAfterMint.tokenId).to.equal(1);
            expect(getDomainDataAfterMint.holder).to.equal(signer.address);
            expect(getDomainDataAfterMint.data).to.equal("");

            const getDomainNameAfterMint = await situsTLD.domainIdsNames(1);
            expect(getDomainNameAfterMint).to.equal(newDomainName);

            // BURN DOMAIN

            const tx = await situsTLD.burn(newDomainName);

            const receipt = await tx.wait();

            calculateGasCosts("Burn domain", receipt);

            const event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === "DomainBurned") as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfterBurn = await situsTLD.totalSupply();
            expect(totalSupplyAfterBurn).to.equal(0);

            const balanceAfterBurn = await situsTLD.balanceOf(signer.address);
            expect(balanceAfterBurn).to.equal(0);

            const getDomainDataAfterBurn = await situsTLD.domains(newDomainName);
            expect(getDomainDataAfterBurn.holder).to.equal(ethers.ZeroAddress);
            expect(getDomainDataAfterBurn.name).to.equal("");
            expect(getDomainDataAfterBurn.data).to.equal("");
            expect(getDomainDataAfterBurn.tokenId).to.equal(0);

            const getDomainNameAfterBurn = await situsTLD.domainIdsNames(1);
            expect(getDomainNameAfterBurn).to.equal(""); // should be empty

            const getDefaultDomainNameAfterBurn = await situsTLD.defaultNames(signer.address);
            expect(getDefaultDomainNameAfterBurn).to.equal(""); // should be empty

            // MINT AGAIN

            await situsTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMintAgain = await situsTLD.totalSupply();
            expect(totalSupplyAfterMintAgain).to.equal(1);

            const balanceAfterMintAgain = await situsTLD.balanceOf(signer.address);
            expect(balanceAfterMintAgain).to.equal(1);

            const getDomainDataAfterMintAgain = await situsTLD.domains(newDomainName);
            expect(getDomainDataAfterMintAgain.name).to.equal(newDomainName);
            expect(getDomainDataAfterMintAgain.tokenId).to.equal(2); // token ID is now 2, because burned IDs still count as used
            expect(getDomainDataAfterMintAgain.holder).to.equal(signer.address);
            expect(getDomainDataAfterMintAgain.data).to.equal("");

            // token ID 1 still burned
            const getDomainNameAfterMintAgain0 = await situsTLD.domainIdsNames(1); // token ID 1 is burned and will not be used again
            expect(getDomainNameAfterMintAgain0).to.equal("");

            // new NFT has now ID 2
            const getDomainNameAfterMintAgain1 = await situsTLD.domainIdsNames(2); // new domain has ID 2
            expect(getDomainNameAfterMintAgain1).to.equal(newDomainName);
        });

        it("should mint multiple tokens, burn one and mint it again", async function () {
            const { situsTLD, signer, anotherUser, referrer } = await loadFixture(deploySitusTLDFixture);
            await situsTLD.toggleBuyingDomains(); // enable buying domains

            const totalSupplyBeforeMint = await situsTLD.totalSupply();
            expect(totalSupplyBeforeMint).to.equal(0);

            const idCounterBeforeMint = await situsTLD.idCounter();
            expect(idCounterBeforeMint).to.equal(1);

            const balanceBeforeMint = await situsTLD.balanceOf(signer.address);
            expect(balanceBeforeMint).to.equal(0);

            const getDomainNameBeforeMint = await situsTLD.domainIdsNames(1);
            expect(getDomainNameBeforeMint).to.equal(""); // should be empty string

            const price = await situsTLD.price();
            expect(price).to.equal(domainPrice);

            // MINT 3 DOMAINs

            const newDomainName1 = "signer";
            const newDomainName2 = "anotheruser";
            const newDomainName3 = "referrer";

            await situsTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName1, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            await situsTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName2, // domain name (without TLD)
                anotherUser.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            await situsTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName3, // domain name (without TLD)
                referrer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMint = await situsTLD.totalSupply();
            expect(totalSupplyAfterMint).to.equal(3);

            const idCounterAfterMint = await situsTLD.idCounter();
            expect(idCounterAfterMint).to.equal(4); // 3 token IDs has been created. The next domain will have ID 4.

            const balanceAfterMint = await situsTLD.balanceOf(signer.address);
            expect(balanceAfterMint).to.equal(1);

            const balanceAfterMint2 = await situsTLD.balanceOf(anotherUser.address);
            expect(balanceAfterMint2).to.equal(1);

            const balanceAfterMint3 = await situsTLD.balanceOf(referrer.address);
            expect(balanceAfterMint3).to.equal(1);

            const getDefaultDomainAfterMint = await situsTLD.defaultNames(anotherUser.address);
            expect(getDefaultDomainAfterMint).to.equal(newDomainName2);

            const getDomainDataAfterMint = await situsTLD.domains(newDomainName1);
            expect(getDomainDataAfterMint.name).to.equal(newDomainName1);

            const getDomainDataAfterMint2 = await situsTLD.domains(newDomainName2);
            expect(getDomainDataAfterMint2.name).to.equal(newDomainName2);
            expect(getDomainDataAfterMint2.tokenId).to.equal(2);
            expect(getDomainDataAfterMint2.holder).to.equal(anotherUser.address);
            expect(getDomainDataAfterMint2.data).to.equal("");

            const getDomainNameAfterMint = await situsTLD.domainIdsNames(2);
            expect(getDomainNameAfterMint).to.equal(newDomainName2);

            // fail at minting the existing domain before burning it
            await expect(
                situsTLD.mint(
                    // this approach is better for getting gasUsed value from receipt
                    newDomainName2, // domain name (without TLD)
                    anotherUser.address, // domain owner
                    referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.be.revertedWith("Domain with this name already exists");

            // set domain data
            const domainDataString = "{'url': 'https://ethereum.org'}";

            await situsTLD.connect(anotherUser).editData(newDomainName2, domainDataString);

            // check domain data before burn
            const domainDataBeforeBurn = await situsTLD.getDomainData(newDomainName2);
            expect(domainDataBeforeBurn).to.equal(domainDataString);

            // BURN DOMAIN

            const tx = await situsTLD.connect(anotherUser).burn(newDomainName2);

            const receipt = await tx.wait();

            calculateGasCosts("Burn second domain", receipt);

            const event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === "DomainBurned") as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfterBurn = await situsTLD.totalSupply();
            expect(totalSupplyAfterBurn).to.equal(2);

            const idCounterAfterBurn = await situsTLD.idCounter();
            expect(idCounterAfterBurn).to.equal(4);

            // check domain data after burn
            const domainDataAfterBurn = await situsTLD.getDomainData(newDomainName2);
            expect(domainDataAfterBurn).to.equal("");

            const balanceAfterBurn = await situsTLD.balanceOf(signer.address);
            expect(balanceAfterBurn).to.equal(1);

            const balanceAfterBurn1 = await situsTLD.balanceOf(anotherUser.address);
            expect(balanceAfterBurn1).to.equal(0);

            const balanceAfterBurn2 = await situsTLD.balanceOf(referrer.address);
            expect(balanceAfterBurn2).to.equal(1);

            const getDomainDataAfterBurn = await situsTLD.domains(newDomainName1);
            expect(getDomainDataAfterBurn.holder).to.equal(signer.address);
            expect(getDomainDataAfterBurn.name).to.equal("signer");
            expect(getDomainDataAfterBurn.data).to.equal("");
            expect(getDomainDataAfterBurn.tokenId).to.equal(1);

            const getDomainDataAfterBurn2 = await situsTLD.domains(newDomainName2);
            expect(getDomainDataAfterBurn2.holder).to.equal(ethers.ZeroAddress);
            expect(getDomainDataAfterBurn2.name).to.equal("");
            expect(getDomainDataAfterBurn2.data).to.equal("");
            expect(getDomainDataAfterBurn2.tokenId).to.equal(0);

            const getDomainDataAfterBurn3 = await situsTLD.domains(newDomainName3);
            expect(getDomainDataAfterBurn3.holder).to.equal(referrer.address);
            expect(getDomainDataAfterBurn3.name).to.equal("referrer");
            expect(getDomainDataAfterBurn3.data).to.equal("");
            expect(getDomainDataAfterBurn3.tokenId).to.equal(3);

            const getDomainNameAfterBurn = await situsTLD.domainIdsNames(1);
            expect(getDomainNameAfterBurn).to.equal("signer");

            const getDomainNameAfterBurn2 = await situsTLD.domainIdsNames(2);
            expect(getDomainNameAfterBurn2).to.equal(""); // should be empty

            const getDomainNameAfterBurn3 = await situsTLD.domainIdsNames(3);
            expect(getDomainNameAfterBurn3).to.equal("referrer");

            // MINT AGAIN

            await situsTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName2, // domain name (without TLD)
                anotherUser.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMintAgain = await situsTLD.totalSupply();
            expect(totalSupplyAfterMintAgain).to.equal(3);

            const idCounterAfterMintAgain = await situsTLD.idCounter();
            expect(idCounterAfterMintAgain).to.equal(5);

            const balanceAfterMintAgain = await situsTLD.balanceOf(signer.address);
            expect(balanceAfterMintAgain).to.equal(1);

            const balanceAfterMintAgain2 = await situsTLD.balanceOf(anotherUser.address);
            expect(balanceAfterMintAgain2).to.equal(1);

            const balanceAfterMintAgain3 = await situsTLD.balanceOf(referrer.address);
            expect(balanceAfterMintAgain3).to.equal(1);

            const getDomainDataAfterMintAgain = await situsTLD.domains(newDomainName2);
            expect(getDomainDataAfterMintAgain.name).to.equal(newDomainName2);
            expect(getDomainDataAfterMintAgain.tokenId).to.equal(4); // token ID is now 4, because burned IDs still count as used
            expect(getDomainDataAfterMintAgain.holder).to.equal(anotherUser.address);
            expect(getDomainDataAfterMintAgain.data).to.equal("");

            // token ID 2 still burned
            const getDomainNameAfterMintAgain1 = await situsTLD.domainIdsNames(2);
            expect(getDomainNameAfterMintAgain1).to.equal("");

            // new NFT has now ID 4
            const getDomainNameAfterMintAgain3 = await situsTLD.domainIdsNames(4);
            expect(getDomainNameAfterMintAgain3).to.equal(newDomainName2);
        });
    });
});
