import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

const SitusTLDModule = buildModule("SitusTLDModule", (m) => {
  const deployer = m.getAccount(0);

  const situsMetadataStore = m.contract("SitusMetadataStore");
  const situsForbiddenTLDs = m.contract("SitusForbiddenTLDs");
  const situsResolverNonUpgradable = m.contract("SitusResolverNonUpgradable");

  const tldPrice = "900000"; // TODO: verify TLD Price

  const situsTLDFactory = m.contract("SitusTLDFactory", [
    tldPrice,
    situsForbiddenTLDs,
    situsMetadataStore
  ]);

  m.call(situsForbiddenTLDs, 'addFactoryAddress', [situsTLDFactory]);
  m.call(situsResolverNonUpgradable, 'addFactoryAddress', [situsTLDFactory]);

  const situsTldName = ".situs";
  const situsTldSymbol = ".SITUS";
  const situsTldDomainPrice = 0;

  const basinTldName = ".basin";
  const basinTldSymbol = ".BASIN";
  const basinTldDomainPrice = 0;

  // Standard TLD without a custom metadata contract
  const callNewTLDSitus = m.call(situsTLDFactory, 'ownerCreateTld', [
    situsTldName,
    situsTldSymbol,
    deployer,
    situsTldDomainPrice,
    false // buying enabled
  ]);
  const situsTLDAddress = m.readEventArgument(callNewTLDSitus, "TldCreated", "tldAddress");
  const situsTLDContract = m.contractAt("SitusTLD", situsTLDAddress);

  const price1char = parseUnits("1", "ether");
  const price2char = parseUnits("0.1", "ether");
  const price3char = parseUnits("0.03", "ether");
  const price4char = parseUnits("0.008", "ether");
  const price5char = parseUnits("0.0002", "ether");

  const situsTLDMinter = m.contract("SitusTLDMinter", [
    situsTLDContract,
    price1char,
    price2char,
    price3char,
    price4char,
    price5char
  ]);
  m.call(situsTLDContract, 'changeMinter', [situsTLDMinter]);

  const callNewTLDBasin = m.call(situsTLDFactory, 'ownerCreateTld', [
    basinTldName,
    basinTldSymbol,
    deployer,
    basinTldDomainPrice,
    false // buying enabled
  ],
  { id: "SitusTLDFactoryOwnerCreateTldBasin"}
  );
  const basinTLDAddress = m.readEventArgument(callNewTLDBasin, "TldCreated", "tldAddress", { id: "ReadAddressBasin"});
  const basinTLDContract = m.contractAt("SitusTLD", basinTLDAddress, { id: "BasinTLD"});

  const basinTLDMinter = m.contract("BasinTLDMinter", [
    basinTLDContract,
    price1char,
    price2char,
    price3char,
    price4char,
    price5char
  ]);
  m.call(basinTLDContract, 'changeMinter', [basinTLDMinter]);

  return { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory, situsTLDContract, situsTLDMinter, basinTLDContract, basinTLDMinter };
});

export default SitusTLDModule;
