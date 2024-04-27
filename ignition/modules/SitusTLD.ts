import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

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

  // Use a custom metadata contract
  // const basinMetadata3 = m.contract("BasinMetadata3");
  // const tldRoyalty = "0"; // default price in ETH
  // const basinTLD = m.contract("SitusTLD", [
  //   basinTldName,
  //   basinTldSymbol,
  //   deployer,
  //   basinTldDomainPrice,
  //   false,
  //   tldRoyalty,
  //   situsTLDFactory,
  //   basinMetadata3
  // ]);

  return { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory, situsTLDContract, basinTLDContract };
});

export default SitusTLDModule;
