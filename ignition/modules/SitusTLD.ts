import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";
import SitusTLDFactoryModule from "./SitusProtocol";

// Default Values
const TLDDOMAINPRICE = 0; // must be zero when using a minter
const TLDBUYINGENABLED = false; // must be false when using a minter
const PRICE1 = parseUnits("1000000000000000000", "wei");
const PRICE2 = parseUnits("100000000000000000", "wei");
const PRICE3 = parseUnits("30000000000000000", "wei");
const PRICE4 = parseUnits("8000000000000000", "wei");
const PRICE5 = parseUnits("200000000000000", "wei");

const SitusTLDModule = buildModule("SitusTLDModule", (m) => {
    const { situsTLDFactory } = m.useModule(SitusTLDFactoryModule);
    const deployer = m.getAccount(0);
  
    const customTldName = m.getParameter("customTldName", ".empty");
    const customTldSymbol = m.getParameter("customTldName", ".EMPTY");
    const customPrice1 = m.getParameter("customPrice1char", PRICE1);
    const customPrice2 = m.getParameter("customPrice2char", PRICE2);
    const customPrice3 = m.getParameter("customPrice3char", PRICE3);
    const customPrice4 = m.getParameter("customPrice4char", PRICE4);
    const customPrice5 = m.getParameter("customPrice5char", PRICE5);
  
    const callNewTLDSitus = m.call(situsTLDFactory, "ownerCreateTld", [
      customTldName,
      customTldSymbol,
      deployer,
      TLDDOMAINPRICE,
      TLDBUYINGENABLED
    ]);
    const situsTLDAddress = m.readEventArgument(
      callNewTLDSitus,
      "TldCreated",
      "tldAddress"
    );
    const customTLDContract = m.contractAt("SitusTLD", situsTLDAddress);
  
    const customTLDMinter = m.contract("SitusTLDMinter", [
        customTLDContract,
        customPrice1,
        customPrice2,
        customPrice3,
        customPrice4,
        customPrice5,
    ]);
    m.call(customTLDContract, "changeMinter", [customTLDMinter]);
  
    return { customTLDContract, customTLDMinter };
  });

  export default SitusTLDModule;