import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

//npx hardhat ignition deploy ignition/modules/SitusTLDModule.ts --parameters ignition/parameters.json
// https://github.com/NomicFoundation/hardhat-ignition/issues/32
// https://github.com/NomicFoundation/hardhat-ignition/issues/608
// https://github.com/NomicFoundation/hardhat-ignition/issues/607


// Default Values
const PRICE1CHAR = "1";
const PRICE2CHAR = "0.1";
const PRICE3CHAR = "0.03";
const PRICE4CHAR = "0.008";
const PRICE5CHAR = "0.0002";

const SitusTLDFactoryModule = buildModule("SitusTLDFactoryModule", (m) => {
  const tldPrice = m.getParameter("tldPrice");

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

  const createTLD = (name: string, tldName: string, tldSymbol: string) => {
    const tldDomainPrice = 0;

    const price1char = m.getParameter(`${name}Price1char`, PRICE1CHAR);
    const price2char = m.getParameter(`${name}Price2char`, PRICE2CHAR);
    const price3char = m.getParameter(`${name}Price3char`, PRICE3CHAR);
    const price4char = m.getParameter(`${name}Price4char`, PRICE4CHAR);
    const price5char = m.getParameter(`${name}Price5char`, PRICE5CHAR);
    const price1 = parseUnits(price1char.defaultValue || PRICE1CHAR, "ether");
    const price2 = parseUnits(price2char.defaultValue || PRICE2CHAR, "ether");
    const price3 = parseUnits(price3char.defaultValue || PRICE3CHAR, "ether");
    const price4 = parseUnits(price4char.defaultValue || PRICE4CHAR, "ether");
    const price5 = parseUnits(price5char.defaultValue || PRICE5CHAR, "ether");

    const callNewTLD = m.call(situsTLDFactory, "ownerCreateTld", [
      tldName,
      tldSymbol,
      deployer,
      tldDomainPrice,
      false, // buying enabled
    ], { id: name });
    const tldAddress = m.readEventArgument(callNewTLD, "TldCreated", "tldAddress", {id: name + "TldAddress" });
    const tldContract = m.contractAt("SitusTLD", tldAddress, { id: name + "TldContract" });

    const tldMinter = m.contract("SitusTLDMinter", [
      tldContract,
      price1,
      price2,
      price3,
      price4,
      price5,
    ], { id: name + "Minter" });
    m.call(tldContract, "changeMinter", [tldMinter]);

    return { tldContract, tldMinter };
  };

  const deployer = m.getAccount(0);
  const { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory } = m.useModule(SitusTLDFactoryModule);

  const { tldContract: situsTLDContract, tldMinter: situsTLDMinter } = createTLD("situs", ".situs", ".SITUS");

  const { tldContract: basinTLDContract, tldMinter: basinTLDMinter } = createTLD("basin", ".basin", ".BASIN");

  return { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory, situsTLDContract, situsTLDMinter, basinTLDContract, basinTLDMinter };
});

export default SitusProtocolModule;
