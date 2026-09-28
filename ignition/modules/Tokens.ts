import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokensModule", (m) => {
  const wec = m.contract("WEC");
  const wecr = m.contract("WECR");
  const usdt = m.contract("USDT");
  const usdc = m.contract("USDC");

  return { wec, wecr, usdt, usdc };
});
