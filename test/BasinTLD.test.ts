import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ContractTransactionReceipt, EventLog } from "ethers";
import hre from "hardhat";
import { ethers } from "hardhat";

function calculateGasCosts(testName: string, receipt: ContractTransactionReceipt | null) {
    if (!receipt) {
        return
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

describe("BasinTLD", function () {
    const domainName = ".web3";
    const domainSymbol = "WEB3";
    const domainPrice = ethers.parseUnits("1", "ether");
    const domainRoyalty = 10; // royalty in bips (10 bips is 0.1%)

    // Fixture
    async function deployBasinTLDFixture() {
        const [signer, anotherUser, referrer] = await hre.ethers.getSigners();

        const BasinMetadataStore = await hre.ethers.getContractFactory("BasinMetadataStore");
        const basinMetadataStore = await BasinMetadataStore.deploy();
        const basinMetadataStoreAddress = await basinMetadataStore.getAddress();

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

        return { basinTLD, basinMetadataStore, signer, anotherUser, referrer };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { basinTLD } = await loadFixture(deployBasinTLDFixture);
            expect(await basinTLD.getAddress()).to.be.properAddress;
            expect(await basinTLD.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Create TLD", function () {
        it("should confirm the correct TLD name", async function () {
            const { basinTLD } = await loadFixture(deployBasinTLDFixture);
            const name = await basinTLD.name();
            expect(name).to.equal(domainName);
        });

        it("should create a new valid domain", async function () {
            const { basinTLD, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const price = await basinTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // get referrer's balance BEFORE
            const balanceReferrerBefore = await hre.ethers.provider.getBalance(referrer.address);

            const totalSupplyBefore = await basinTLD.totalSupply();
            expect(totalSupplyBefore).to.equal(0);

            const tx = await basinTLD.mint(
                newDomainName, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const receipt = await tx.wait();

            calculateGasCosts("Mint", receipt);

            let event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === 'DomainCreated') as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfter = await basinTLD.totalSupply();
            expect(totalSupplyAfter).to.equal(1);

            // get referrer's balance AFTER
            const balanceReferrerAfter = await hre.ethers.provider.getBalance(referrer.address);

            expect(BigInt(balanceReferrerAfter) - BigInt(balanceReferrerBefore)).to.equal(
                BigInt("100000000000000000"),
            );

            // get domain name by token ID
            const firstDomainName = await basinTLD.domainIdsNames(1);
            expect(firstDomainName).to.equal(newDomainName);

            // get domain data by domain name
            const firstDomainData = await basinTLD.domains(newDomainName);
            expect(firstDomainData.name).to.equal(newDomainName);
            expect(firstDomainData.holder).to.equal(signer.address);
            expect(firstDomainData.tokenId).to.equal(1);

            // mint another domain
            await basinTLD.mint(
                "second", // domain name (without TLD)
                referrer.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            // check total supply of tokens
            const totalSupplyAfterSecond = await basinTLD.totalSupply();
            expect(totalSupplyAfterSecond).to.equal(2);

            // get domain data by domain name
            const secondDomainData = await basinTLD.domains("second");
            expect(secondDomainData.name).to.equal("second");
            expect(secondDomainData.holder).to.equal(referrer.address);
            expect(secondDomainData.tokenId).to.equal(2);

            // mint a 1-letter domain
            await basinTLD.connect(anotherUser).mint(
                "a", // domain name (without TLD)
                anotherUser.address, // domain owner
                ethers.ZeroAddress, // no referrer in this case
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            // check total supply of tokens
            const totalSupplyAfterA = await basinTLD.totalSupply();
            expect(totalSupplyAfterA).to.equal(3);

            // get domain data by domain name
            const aDomainData = await basinTLD.domains("a");
            expect(aDomainData.name).to.equal("a");
            expect(aDomainData.holder).to.equal(anotherUser.address);
            expect(aDomainData.tokenId).to.equal(3);

            // fail at minting an empty domain
            await expect(
                basinTLD.mint(
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
            const { basinTLD, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const newDomainName = "techie";
            const tokenId = 1;

            await expect(
                basinTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(basinTLD, "DomainCreated");

            // get owner
            const domainOwnerBefore = await basinTLD.ownerOf(tokenId);
            expect(domainOwnerBefore).to.equal(signer.address);

            // get domain data by domain name
            const firstDomainDataBefore = await basinTLD.domains(newDomainName);
            expect(firstDomainDataBefore.name).to.equal(newDomainName);
            expect(firstDomainDataBefore.holder).to.equal(signer.address);

            // transfer domain from signer to another user
            /*
            await expect(basinTLD.transferFrom(
              signer.address, // from
              anotherUser.address, // to
              tokenId // token ID
            )).to.emit(basinTLD, "Transfer");
            */

            const tx = await basinTLD.transferFrom(
                // this approach is better for getting gasUsed value from receipt
                signer.address, // from
                anotherUser.address, // to
                tokenId, // token ID
            );

            const receipt = await tx.wait();

            calculateGasCosts("Transfer", receipt);

            let event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === 'Transfer') as EventLog;
            expect(event).is.not.empty;

            // get default name (after)
            const defaultNameAfterSigner = await basinTLD.defaultNames(signer.address);
            expect(defaultNameAfterSigner).to.be.empty;

            const defaultNameAfterAnother = await basinTLD.defaultNames(anotherUser.address);
            expect(defaultNameAfterAnother).to.equal(newDomainName);

            // get owner
            const domainOwnerAfter = await basinTLD.ownerOf(tokenId);
            expect(domainOwnerAfter).to.equal(anotherUser.address);

            // get domain data by domain name
            const firstDomainDataAfter = await basinTLD.domains(newDomainName);
            expect(firstDomainDataAfter.name).to.equal(newDomainName);
            expect(firstDomainDataAfter.holder).to.equal(anotherUser.address);
        });

        it("should change default domain", async function () {
            const { basinTLD, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const price = await basinTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // mint domain
            await expect(
                basinTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(basinTLD, "DomainCreated");

            // get default name (before)
            const defaultNameBefore = await basinTLD.defaultNames(signer.address);
            expect(defaultNameBefore).to.equal(newDomainName);

            const anotherDomainName = "tempe";

            // mint domain
            await expect(
                basinTLD.mint(
                    anotherDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(basinTLD, "DomainCreated");

            // get default name (after 1)
            const defaultNameAfter = await basinTLD.defaultNames(signer.address);
            expect(defaultNameAfter).to.equal(newDomainName); // default domain name should remain the first domain (techie)

            // change default domain to tempe
            await expect(basinTLD.editDefaultDomain(anotherDomainName)).to.emit(basinTLD, "DefaultDomainChanged");

            // get default name (after change)
            const defaultNameAfterChange = await basinTLD.defaultNames(signer.address);
            expect(defaultNameAfterChange).to.equal(anotherDomainName); // default domain name should change to tempe

            // fail at changing default domain if msg.sender is not domain holder
            await expect(
                basinTLD.connect(anotherUser).editDefaultDomain(
                    newDomainName, // trying to change back to techie (but msg.sender is not domain holder)
                ),
            ).to.be.revertedWith("You do not own the selected domain");
        });

        it("should change domain data", async function () {
            const { basinTLD, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const price = await basinTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // mint domain
            await expect(
                basinTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(basinTLD, "DomainCreated");

            // get domain data by domain name (before)
            const firstDomainDataBefore = await basinTLD.domains(newDomainName);
            expect(firstDomainDataBefore.data).to.equal("");

            const newData = "{'description': 'This is my NEW domain description'}";

            // set new data
            const tx = await basinTLD.editData(
                newDomainName, // domain name (without TLD)
                newData,
            );

            const receipt = await tx.wait();

            calculateGasCosts("DataChanged", receipt);

            let event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === 'DataChanged') as EventLog;
            expect(event).is.not.empty;

            // get domain data by domain name (after)
            const firstDomainDataAfter = await basinTLD.domains(newDomainName);
            expect(firstDomainDataAfter.data).to.equal(newData);

            // fail at changing data if msg.sender is not domain holder
            await expect(
                basinTLD.connect(anotherUser).editData(
                    newDomainName, // domain name (without TLD)
                    "No change",
                ),
            ).to.be.revertedWith("Only domain holder can edit their data");
        });

        it("should change metadata", async function () {
            const { basinTLD, basinMetadataStore, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const price = await basinTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "techie";

            // mint domain
            await expect(
                basinTLD.mint(
                    newDomainName, // domain name (without TLD)
                    signer.address, // domain owner
                    ethers.ZeroAddress,
                    {
                        value: domainPrice, // pay  for the domain
                    },
                ),
            ).to.emit(basinTLD, "DomainCreated");

            // get domain token ID
            const domainData = await basinTLD.domains(newDomainName);
            expect(domainData.tokenId).to.equal(1);

            // get domain metadata
            const domainMetadata = await basinTLD.tokenURI(domainData.tokenId);
            const mdJson = Buffer.from(domainMetadata.substring(29), "base64");
            const mdResult = JSON.parse(mdJson.toString());
            expect(mdResult.name).to.equal(newDomainName + domainName);
            expect(mdResult.description).to.equal("");

            // change description in the metadata contract
            const newDesc = "The best top-level domain";

            await basinMetadataStore.changeDescription(basinTLD.getAddress(), newDesc);

            // get domain metadata
            const domainMetadata2 = await basinTLD.tokenURI(domainData.tokenId);
            const mdJson2 = Buffer.from(domainMetadata2.substring(29), "base64");
            const mdResult2 = JSON.parse(mdJson2.toString());
            expect(mdResult2.name).to.equal(newDomainName + domainName);
            expect(mdResult2.description).to.equal(newDesc);

            // fail at changing metadata description if sender is not TLD owner
            await expect(basinMetadataStore.connect(anotherUser).changeDescription(basinTLD.getAddress(), newDesc)).to.be.revertedWith(
                "Sender not TLD owner",
            );
        });

        it("should create a new valid domain, but with non-ascii letters input", async function () {
            const { basinTLD, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const price = await basinTLD.price();
            expect(price).to.equal(domainPrice);

            const newDomainName = "poɯSnᴉǝ";

            // TODO set domainPrice value here
            const tx = await basinTLD.mint(newDomainName, signer.address, referrer.address, { value: domainPrice });

            const receipt = await tx.wait();

            calculateGasCosts("Mint " + newDomainName, receipt);

            let event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === 'DomainCreated') as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfter = await basinTLD.totalSupply();
            expect(totalSupplyAfter).to.equal(1);

            const getDomainName = await basinTLD.domainIdsNames(1);
            console.log(getDomainName);
            expect(getDomainName).to.equal(newDomainName.toLowerCase()); // should be lowercase
        });

        it("should mint a token and burn it and mint it again", async function () {
            const { basinTLD, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const totalSupplyBeforeMint = await basinTLD.totalSupply();
            expect(totalSupplyBeforeMint).to.equal(0);

            const balanceBeforeMint = await basinTLD.balanceOf(signer.address);
            expect(balanceBeforeMint).to.equal(0);

            const getDomainNameBeforeMint = await basinTLD.domainIdsNames(1); // token ID 1
            expect(getDomainNameBeforeMint).to.equal(""); // should be empty string

            const price = await basinTLD.price();
            expect(price).to.equal(domainPrice);

            // MINT DOMAIN

            const newDomainName = "signer";

            await basinTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMint = await basinTLD.totalSupply();
            expect(totalSupplyAfterMint).to.equal(1);

            const balanceAfterMint = await basinTLD.balanceOf(signer.address);
            expect(balanceAfterMint).to.equal(1);

            const getDomainDataAfterMint = await basinTLD.domains(newDomainName);
            expect(getDomainDataAfterMint.name).to.equal(newDomainName);
            expect(getDomainDataAfterMint.tokenId).to.equal(1);
            expect(getDomainDataAfterMint.holder).to.equal(signer.address);
            expect(getDomainDataAfterMint.data).to.equal("");

            const getDomainNameAfterMint = await basinTLD.domainIdsNames(1);
            expect(getDomainNameAfterMint).to.equal(newDomainName);

            // BURN DOMAIN

            const tx = await basinTLD.burn(newDomainName);

            const receipt = await tx.wait();

            calculateGasCosts("Burn domain", receipt);

            let event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === 'DomainBurned') as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfterBurn = await basinTLD.totalSupply();
            expect(totalSupplyAfterBurn).to.equal(0);

            const balanceAfterBurn = await basinTLD.balanceOf(signer.address);
            expect(balanceAfterBurn).to.equal(0);

            const getDomainDataAfterBurn = await basinTLD.domains(newDomainName);
            expect(getDomainDataAfterBurn.holder).to.equal(ethers.ZeroAddress);
            expect(getDomainDataAfterBurn.name).to.equal("");
            expect(getDomainDataAfterBurn.data).to.equal("");
            expect(getDomainDataAfterBurn.tokenId).to.equal(0);

            const getDomainNameAfterBurn = await basinTLD.domainIdsNames(1);
            expect(getDomainNameAfterBurn).to.equal(""); // should be empty

            const getDefaultDomainNameAfterBurn = await basinTLD.defaultNames(signer.address);
            expect(getDefaultDomainNameAfterBurn).to.equal(""); // should be empty

            // MINT AGAIN

            await basinTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMintAgain = await basinTLD.totalSupply();
            expect(totalSupplyAfterMintAgain).to.equal(1);

            const balanceAfterMintAgain = await basinTLD.balanceOf(signer.address);
            expect(balanceAfterMintAgain).to.equal(1);

            const getDomainDataAfterMintAgain = await basinTLD.domains(newDomainName);
            expect(getDomainDataAfterMintAgain.name).to.equal(newDomainName);
            expect(getDomainDataAfterMintAgain.tokenId).to.equal(2); // token ID is now 2, because burned IDs still count as used
            expect(getDomainDataAfterMintAgain.holder).to.equal(signer.address);
            expect(getDomainDataAfterMintAgain.data).to.equal("");

            // token ID 1 still burned
            const getDomainNameAfterMintAgain0 = await basinTLD.domainIdsNames(1); // token ID 1 is burned and will not be used again
            expect(getDomainNameAfterMintAgain0).to.equal("");

            // new NFT has now ID 2
            const getDomainNameAfterMintAgain1 = await basinTLD.domainIdsNames(2); // new domain has ID 2
            expect(getDomainNameAfterMintAgain1).to.equal(newDomainName);
        });

        it("should mint multiple tokens, burn one and mint it again", async function () {
            const { basinTLD, signer, anotherUser, referrer } = await loadFixture(deployBasinTLDFixture);
            await basinTLD.toggleBuyingDomains(); // enable buying domains

            const totalSupplyBeforeMint = await basinTLD.totalSupply();
            expect(totalSupplyBeforeMint).to.equal(0);

            const idCounterBeforeMint = await basinTLD.idCounter();
            expect(idCounterBeforeMint).to.equal(1);

            const balanceBeforeMint = await basinTLD.balanceOf(signer.address);
            expect(balanceBeforeMint).to.equal(0);

            const getDomainNameBeforeMint = await basinTLD.domainIdsNames(1);
            expect(getDomainNameBeforeMint).to.equal(""); // should be empty string

            const price = await basinTLD.price();
            expect(price).to.equal(domainPrice);

            // MINT 3 DOMAINs

            const newDomainName1 = "signer";
            const newDomainName2 = "anotheruser";
            const newDomainName3 = "referrer";

            await basinTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName1, // domain name (without TLD)
                signer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            await basinTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName2, // domain name (without TLD)
                anotherUser.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            await basinTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName3, // domain name (without TLD)
                referrer.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMint = await basinTLD.totalSupply();
            expect(totalSupplyAfterMint).to.equal(3);

            const idCounterAfterMint = await basinTLD.idCounter();
            expect(idCounterAfterMint).to.equal(4); // 3 token IDs has been created. The next domain will have ID 4.

            const balanceAfterMint = await basinTLD.balanceOf(signer.address);
            expect(balanceAfterMint).to.equal(1);

            const balanceAfterMint2 = await basinTLD.balanceOf(anotherUser.address);
            expect(balanceAfterMint2).to.equal(1);

            const balanceAfterMint3 = await basinTLD.balanceOf(referrer.address);
            expect(balanceAfterMint3).to.equal(1);

            const getDefaultDomainAfterMint = await basinTLD.defaultNames(anotherUser.address);
            expect(getDefaultDomainAfterMint).to.equal(newDomainName2);

            const getDomainDataAfterMint = await basinTLD.domains(newDomainName1);
            expect(getDomainDataAfterMint.name).to.equal(newDomainName1);

            const getDomainDataAfterMint2 = await basinTLD.domains(newDomainName2);
            expect(getDomainDataAfterMint2.name).to.equal(newDomainName2);
            expect(getDomainDataAfterMint2.tokenId).to.equal(2);
            expect(getDomainDataAfterMint2.holder).to.equal(anotherUser.address);
            expect(getDomainDataAfterMint2.data).to.equal("");

            const getDomainNameAfterMint = await basinTLD.domainIdsNames(2);
            expect(getDomainNameAfterMint).to.equal(newDomainName2);

            // fail at minting the existing domain before burning it
            await expect(
                basinTLD.mint(
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

            await basinTLD.connect(anotherUser).editData(newDomainName2, domainDataString);

            // check domain data before burn
            const domainDataBeforeBurn = await basinTLD.getDomainData(newDomainName2);
            expect(domainDataBeforeBurn).to.equal(domainDataString);

            // BURN DOMAIN

            const tx = await basinTLD.connect(anotherUser).burn(newDomainName2);

            const receipt = await tx.wait();

            calculateGasCosts("Burn second domain", receipt);

            let event = receipt?.logs.find((log) => log instanceof EventLog && log.fragment.name === 'DomainBurned') as EventLog;
            expect(event).is.not.empty;

            const totalSupplyAfterBurn = await basinTLD.totalSupply();
            expect(totalSupplyAfterBurn).to.equal(2);

            const idCounterAfterBurn = await basinTLD.idCounter();
            expect(idCounterAfterBurn).to.equal(4);

            // check domain data after burn
            const domainDataAfterBurn = await basinTLD.getDomainData(newDomainName2);
            expect(domainDataAfterBurn).to.equal("");

            const balanceAfterBurn = await basinTLD.balanceOf(signer.address);
            expect(balanceAfterBurn).to.equal(1);

            const balanceAfterBurn1 = await basinTLD.balanceOf(anotherUser.address);
            expect(balanceAfterBurn1).to.equal(0);

            const balanceAfterBurn2 = await basinTLD.balanceOf(referrer.address);
            expect(balanceAfterBurn2).to.equal(1);

            const getDomainDataAfterBurn = await basinTLD.domains(newDomainName1);
            expect(getDomainDataAfterBurn.holder).to.equal(signer.address);
            expect(getDomainDataAfterBurn.name).to.equal("signer");
            expect(getDomainDataAfterBurn.data).to.equal("");
            expect(getDomainDataAfterBurn.tokenId).to.equal(1);

            const getDomainDataAfterBurn2 = await basinTLD.domains(newDomainName2);
            expect(getDomainDataAfterBurn2.holder).to.equal(ethers.ZeroAddress);
            expect(getDomainDataAfterBurn2.name).to.equal("");
            expect(getDomainDataAfterBurn2.data).to.equal("");
            expect(getDomainDataAfterBurn2.tokenId).to.equal(0);

            const getDomainDataAfterBurn3 = await basinTLD.domains(newDomainName3);
            expect(getDomainDataAfterBurn3.holder).to.equal(referrer.address);
            expect(getDomainDataAfterBurn3.name).to.equal("referrer");
            expect(getDomainDataAfterBurn3.data).to.equal("");
            expect(getDomainDataAfterBurn3.tokenId).to.equal(3);

            const getDomainNameAfterBurn = await basinTLD.domainIdsNames(1);
            expect(getDomainNameAfterBurn).to.equal("signer");

            const getDomainNameAfterBurn2 = await basinTLD.domainIdsNames(2);
            expect(getDomainNameAfterBurn2).to.equal(""); // should be empty

            const getDomainNameAfterBurn3 = await basinTLD.domainIdsNames(3);
            expect(getDomainNameAfterBurn3).to.equal("referrer");

            // MINT AGAIN

            await basinTLD.mint(
                // this approach is better for getting gasUsed value from receipt
                newDomainName2, // domain name (without TLD)
                anotherUser.address, // domain owner
                referrer.address, // referrer is set, so 0.1 ETH referral fee will go to referrers address
                {
                    value: domainPrice, // pay  for the domain
                },
            );

            const totalSupplyAfterMintAgain = await basinTLD.totalSupply();
            expect(totalSupplyAfterMintAgain).to.equal(3);

            const idCounterAfterMintAgain = await basinTLD.idCounter();
            expect(idCounterAfterMintAgain).to.equal(5);

            const balanceAfterMintAgain = await basinTLD.balanceOf(signer.address);
            expect(balanceAfterMintAgain).to.equal(1);

            const balanceAfterMintAgain2 = await basinTLD.balanceOf(anotherUser.address);
            expect(balanceAfterMintAgain2).to.equal(1);

            const balanceAfterMintAgain3 = await basinTLD.balanceOf(referrer.address);
            expect(balanceAfterMintAgain3).to.equal(1);

            const getDomainDataAfterMintAgain = await basinTLD.domains(newDomainName2);
            expect(getDomainDataAfterMintAgain.name).to.equal(newDomainName2);
            expect(getDomainDataAfterMintAgain.tokenId).to.equal(4); // token ID is now 4, because burned IDs still count as used
            expect(getDomainDataAfterMintAgain.holder).to.equal(anotherUser.address);
            expect(getDomainDataAfterMintAgain.data).to.equal("");

            // token ID 2 still burned
            const getDomainNameAfterMintAgain1 = await basinTLD.domainIdsNames(2);
            expect(getDomainNameAfterMintAgain1).to.equal("");

            // new NFT has now ID 4
            const getDomainNameAfterMintAgain3 = await basinTLD.domainIdsNames(4);
            expect(getDomainNameAfterMintAgain3).to.equal(newDomainName2);
        });
    });
});
