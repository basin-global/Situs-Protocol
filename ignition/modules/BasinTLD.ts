import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasinTLDModule = buildModule("BasinTLDModule", (m) => {
  const deployer = m.getAccount(0);

  const basinMetadata = m.contract("BasinMetadata");
  const basinForbiddenTLDs = m.contract("BasinForbiddenTLDs");
  const basinResolverNonUpgradable = m.contract("BasinResolverNonUpgradable");

  let tldPrice = "900000"; // default price in ETH

  const basinTLDFactory = m.contract("BasinTLDFactory", [
    tldPrice,
    basinForbiddenTLDs,
    basinMetadata
  ]);

  m.call(basinForbiddenTLDs, 'addFactoryAddress', [basinTLDFactory]);
  m.call(basinResolverNonUpgradable, 'addFactoryAddress', [basinTLDFactory]);

  const tldName = ".basin";
  const tldSymbol = ".BASIN";

  m.call(basinTLDFactory, 'ownerCreateTld', [
    tldName,
    tldSymbol,
    deployer,
    0,
    false // buying enabled
  ]);

  return { basinMetadata, basinForbiddenTLDs, basinResolverNonUpgradable, basinTLDFactory };
});

export default BasinTLDModule;
