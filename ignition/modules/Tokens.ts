import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokensModule", (m) => {
  const wec = m.contract("WEC");
  const wecr = m.contract("WECR");

  return { wec, wecr };
});
