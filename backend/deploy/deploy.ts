import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Build EIP-1559 fee overrides (bump vs. suggested to avoid REPLACEMENT_UNDERPRICED)
  const feeData = await hre.ethers.provider.getFeeData();

  const envMaxFeeGwei = process.env.MAX_FEE_PER_GAS_GWEI;
  const envMaxPriorityGwei = process.env.MAX_PRIORITY_FEE_PER_GAS_GWEI;

  let maxPriorityFeePerGas: bigint | undefined;
  let maxFeePerGas: bigint | undefined;

  if (envMaxPriorityGwei) {
    maxPriorityFeePerGas = hre.ethers.parseUnits(envMaxPriorityGwei, "gwei");
  }
  if (envMaxFeeGwei) {
    maxFeePerGas = hre.ethers.parseUnits(envMaxFeeGwei, "gwei");
  }

  const basePriority =
    feeData.maxPriorityFeePerGas ?? feeData.gasPrice ?? 1_500_000_000n; // 1.5 gwei fallback
  const baseMaxFee = feeData.maxFeePerGas ?? feeData.gasPrice ?? 30_000_000_000n; // 30 gwei fallback

  // If not provided by env, bump suggested values by ~20% and +1 gwei on tip
  if (!maxPriorityFeePerGas) {
    maxPriorityFeePerGas = basePriority + basePriority / 5n + 1_000_000_000n;
  }
  if (!maxFeePerGas) {
    maxFeePerGas = baseMaxFee + baseMaxFee / 5n;
  }
  // Ensure maxFeePerGas >= maxPriorityFeePerGas + 1 gwei
  if (maxFeePerGas < maxPriorityFeePerGas) {
    maxFeePerGas = maxPriorityFeePerGas + 1_000_000_000n;
  }

  console.log("Using gas overrides:", {
    maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    maxFeePerGas: maxFeePerGas.toString(),
  });

  const deployedGuessGame = await deploy("GuessGame", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  console.log(`GuessGame contract deployed at: `, deployedGuessGame.address);
};
export default func;
func.id = "deploy_guessGame"; // id required to prevent reexecution
func.tags = ["GuessGame"];

