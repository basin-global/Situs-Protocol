import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

// Default Values
const TLDPRICE = parseUnits("900000", "wei");
const TLDDOMAINPRICE = 0; //must be zero when using a minter
const TLDBUYINGENABLED = false; // must be false when using a minter
const PRICE1 = parseUnits("1000000000000000000", "wei");
const PRICE2 = parseUnits("100000000000000000", "wei");
const PRICE3 = parseUnits("30000000000000000", "wei");
const PRICE4 = parseUnits("8000000000000000", "wei");
const PRICE5 = parseUnits("200000000000000", "wei");

const SitusTLDFactoryModule = buildModule("SitusTLDFactoryModule", (m) => {
  const tldPrice = m.getParameter("tldPrice", TLDPRICE);
  const situsMetadataStore = m.contract("SitusMetadataStore");
  const situsForbiddenTLDs = m.contract("SitusForbiddenTLDs");
  const situsResolverNonUpgradable = m.contract("SitusResolverNonUpgradable");

  const situsTLDFactory = m.contract("SitusTLDFactory", [
    tldPrice,
    situsForbiddenTLDs,
    situsMetadataStore,
  ]);

  m.call(situsForbiddenTLDs, "addFactoryAddress", [situsTLDFactory]);
  m.call(situsResolverNonUpgradable, "addFactoryAddress", [situsTLDFactory]);

  return { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory };
});

const SitusProtocolModule = buildModule("SitusProtocolModule", (m) => {

  const createTLD = (namePrefix: string) => {
    const tldName = m.getParameter(`${namePrefix}TldName`, ".demo");
    const tldSymbol = m.getParameter(`${namePrefix}TldName`, ".DEMO");
    const price1 = m.getParameter(`${namePrefix}Price1char`, PRICE1);
    const price2 = m.getParameter(`${namePrefix}Price2char`, PRICE2);
    const price3 = m.getParameter(`${namePrefix}Price3char`, PRICE3);
    const price4 = m.getParameter(`${namePrefix}Price4char`, PRICE4);
    const price5 = m.getParameter(`${namePrefix}Price5char`, PRICE5);

    const callNewTLD = m.call(situsTLDFactory, "ownerCreateTld", [
      tldName,
      tldSymbol,
      deployer,
      TLDDOMAINPRICE,
      TLDBUYINGENABLED,
    ], { id: namePrefix });
    const tldAddress = m.readEventArgument(callNewTLD, "TldCreated", "tldAddress", {id: namePrefix + "TldAddress" });
    const tldContract = m.contractAt("SitusTLD", tldAddress, { id: namePrefix + "TldContract" });

    const tldMinter = m.contract("SitusTLDMinter", [
      tldContract,
      price1,
      price2,
      price3,
      price4,
      price5
    ], { id: namePrefix + "Minter" });
    m.call(tldContract, "changeMinter", [tldMinter]);

    return { tldContract, tldMinter };
  };

  const deployer = m.getAccount(0);
  const { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory } = m.useModule(SitusTLDFactoryModule);

  const { tldContract: situsTLDContract, tldMinter: situsTLDMinter } = createTLD("situs");

  const { tldContract: basinTLDContract, tldMinter: basinTLDMinter } = createTLD("basin");

  return { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory, situsTLDContract, situsTLDMinter, basinTLDContract, basinTLDMinter };
});

export default SitusProtocolModule;
