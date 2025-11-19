import * as fs from "fs";
import * as path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Generate frontend ABI and address files from deployed contracts
 * Automatically reads existing deployments and skips missing ones
 */
async function generateFrontendABI(hre: HardhatRuntimeEnvironment) {
  const contractName = "GuessGame";
  const frontendAbiDir = path.join(__dirname, "../../frontend/abi");
  
  // Ensure frontend/abi directory exists
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }

  // Read ABI from artifacts
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    console.log(`⚠️  Artifact not found: ${artifactPath}`);
    console.log("   Please compile contracts first: npm run compile");
    return;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const abi = artifact.abi;

  // Generate ABI file
  const abiFilePath = path.join(frontendAbiDir, "GuessGameABI.ts");
  const abiContent = `// Auto-generated file - do not edit manually
// Generated from contract: ${contractName}

export const GuessGameABI = ${JSON.stringify(abi, null, 2)} as const;

export type GuessGameABI = typeof GuessGameABI;
`;

  fs.writeFileSync(abiFilePath, abiContent);
  console.log(`✅ Generated ABI file: ${abiFilePath}`);

  // Read deployments from hardhat-deploy
  const deploymentsDir = path.join(__dirname, "../deployments");
  const addresses: Record<string, { address: string; chainId: number; chainName?: string }> = {};

  // Check if deployments directory exists
  if (fs.existsSync(deploymentsDir)) {
    const networkDirs = fs.readdirSync(deploymentsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const networkName of networkDirs) {
      const deploymentFile = path.join(deploymentsDir, networkName, `${contractName}.json`);
      
      if (fs.existsSync(deploymentFile)) {
        try {
          const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
          const address = deployment.address;
          
          if (address && address !== "0x0000000000000000000000000000000000000000") {
            // Get chainId from network config or deployment metadata
            let chainId: number | undefined;
            let chainName: string | undefined;

            // Try to get chainId from network config
            try {
              const networkConfig = hre.config.networks[networkName];
              if (networkConfig && "chainId" in networkConfig) {
                chainId = networkConfig.chainId as number;
              }
            } catch (e) {
              // Ignore errors
            }

            // If chainId not found, try to infer from network name
            if (!chainId) {
              if (networkName === "sepolia") {
                chainId = 11155111;
                chainName = "Sepolia";
              } else if (networkName === "hardhat" || networkName === "localhost") {
                chainId = 31337;
                chainName = "Hardhat Local";
              } else if (networkName === "anvil") {
                chainId = 31337;
                chainName = "Anvil Local";
              }
            }

            if (chainId) {
              addresses[chainId.toString()] = {
                address,
                chainId,
                chainName: chainName || networkName,
              };
              console.log(`✅ Found deployment on ${networkName} (chainId: ${chainId}): ${address}`);
            } else {
              console.log(`⚠️  Skipping ${networkName}: chainId not found`);
            }
          }
        } catch (e) {
          console.log(`⚠️  Error reading deployment file ${deploymentFile}: ${e}`);
        }
      } else {
        console.log(`ℹ️  No deployment found for ${contractName} on ${networkName}, skipping`);
      }
    }
  } else {
    console.log(`ℹ️  Deployments directory not found: ${deploymentsDir}`);
    console.log("   Run deployment first: npm run deploy:sepolia");
  }

  // Generate addresses file
  const addressesFilePath = path.join(frontendAbiDir, "GuessGameAddresses.ts");
  const addressesContent = `// Auto-generated file - do not edit manually
// Generated from deployments

export type GuessGameAddresses = Record<string, { address: string; chainId: number; chainName?: string }>;

export const GuessGameAddresses: GuessGameAddresses = ${JSON.stringify(addresses, null, 2)};

// Helper to get address by chainId
export function getGuessGameAddress(chainId: number): string | undefined {
  const entry = GuessGameAddresses[chainId.toString()];
  return entry?.address;
}
`;

  fs.writeFileSync(addressesFilePath, addressesContent);
  console.log(`✅ Generated addresses file: ${addressesFilePath}`);
  
  if (Object.keys(addresses).length === 0) {
    console.log(`⚠️  No deployments found. Addresses file is empty.`);
    console.log(`   Deploy contracts first: npm run deploy:sepolia`);
  } else {
    console.log(`✅ Found ${Object.keys(addresses).length} deployment(s)`);
  }
}

// Main execution
async function main() {
  const hre = await import("hardhat");
  await generateFrontendABI(hre as unknown as HardhatRuntimeEnvironment);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

