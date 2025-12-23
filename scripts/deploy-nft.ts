/**
 * NFT Deployment Script for Visor
 * 
 * Usage:
 *   pnpm tsx scripts/deploy-nft.ts --network basesepolia
 *   pnpm tsx scripts/deploy-nft.ts --network base
 * 
 * Prerequisites:
 *   - Set DEPLOYER_PRIVATE_KEY in .env.local
 *   - Have ETH/WETH on the target network
 */

import { mintclub } from 'mint.club-v2-sdk';
import { parseEther } from 'viem';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// ===========================================
// CONFIGURATION
// ===========================================

const NFT_NAME = 'Visor NFT';
const NFT_SYMBOL = process.env.NEXT_PUBLIC_VISOR_NFT_SYMBOL || 'VISOR';
const NFT_DESCRIPTION = 'Visor NFT - Points farming on Base network';

// Bonding curve config from env
const CURVE_TYPE = (process.env.NEXT_PUBLIC_CURVE_TYPE || 'LINEAR') as 'LINEAR' | 'EXPONENTIAL' | 'FLAT';
const STEP_COUNT = Number(process.env.NEXT_PUBLIC_CURVE_STEP_COUNT) || 20;
const MAX_SUPPLY = Number(process.env.NEXT_PUBLIC_NFT_MAX_SUPPLY) || 10000;
const INITIAL_PRICE = process.env.NEXT_PUBLIC_INITIAL_MINT_PRICE || '0.0001';
const FINAL_PRICE = process.env.NEXT_PUBLIC_FINAL_MINT_PRICE || '0.01';
const CREATOR_ROYALTY = Number(process.env.NEXT_PUBLIC_CREATOR_ROYALTY) || 5;
const CREATOR_ALLOCATION = Number(process.env.NEXT_PUBLIC_CREATOR_ALLOCATION) || 100;

// WETH addresses
const WETH_ADDRESSES: Record<string, string> = {
  basesepolia: process.env.NEXT_PUBLIC_WETH_ADDRESS_TESTNET || '0x4200000000000000000000000000000000000006',
  base: process.env.NEXT_PUBLIC_WETH_ADDRESS_MAINNET || '0x4200000000000000000000000000000000000006',
};

// ===========================================
// MAIN DEPLOYMENT FUNCTION
// ===========================================

async function deployNFT(network: 'basesepolia' | 'base') {
  console.log('\n========================================');
  console.log('🚀 VISOR NFT DEPLOYMENT');
  console.log('========================================\n');

  // Validate environment
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set in .env.local');
  }

  const wethAddress = WETH_ADDRESSES[network];
  if (!wethAddress) {
    throw new Error(`WETH address not found for network: ${network}`);
  }

  console.log('📋 Configuration:');
  console.log(`   Network: ${network}`);
  console.log(`   NFT Name: ${NFT_NAME}`);
  console.log(`   NFT Symbol: ${NFT_SYMBOL}`);
  console.log(`   Curve Type: ${CURVE_TYPE}`);
  console.log(`   Step Count: ${STEP_COUNT}`);
  console.log(`   Max Supply: ${MAX_SUPPLY}`);
  console.log(`   Initial Price: ${INITIAL_PRICE} ETH`);
  console.log(`   Final Price: ${FINAL_PRICE} ETH`);
  console.log(`   Creator Royalty: ${CREATOR_ROYALTY}%`);
  console.log(`   Creator Allocation: ${CREATOR_ALLOCATION}`);
  console.log(`   WETH Address: ${wethAddress}`);
  console.log('');

  // Step 1: Upload metadata to IPFS
  console.log('📤 Step 1: Uploading metadata to IPFS...');
  
  const metadata = {
    name: NFT_NAME,
    description: NFT_DESCRIPTION,
    image: 'ipfs://QmVisorPlaceholder', // Replace with actual image
    attributes: [
      { trait_type: 'Type', value: 'Bonding Curve NFT' },
      { trait_type: 'Network', value: network === 'basesepolia' ? 'Base Sepolia' : 'Base' },
    ],
  };

  const metadataFile = new File(
    [JSON.stringify(metadata)],
    'metadata.json',
    { type: 'application/json' }
  );

  let metadataUri: string;
  try {
    const ipfsHash = await mintclub.ipfs.upload(metadataFile);
    metadataUri = `ipfs://${ipfsHash}`;
    console.log(`   ✅ Metadata uploaded: ${metadataUri}`);
  } catch (error) {
    console.log('   ⚠️ IPFS upload failed, using placeholder URI');
    metadataUri = 'ipfs://QmVisorMetadataPlaceholder';
  }

  // Step 2: Create NFT with bonding curve
  console.log('\n📝 Step 2: Creating NFT with bonding curve...');
  console.log('   Waiting for wallet signature...');

  try {
    const result = await mintclub
      .network(network)
      .withAccount(privateKey as `0x${string}`)
      .nft(NFT_SYMBOL)
      .create({
        name: NFT_NAME,
        symbol: NFT_SYMBOL,
        uri: metadataUri,
        reserveToken: {
          address: wethAddress as `0x${string}`,
          decimals: 18,
        },
        curveData: {
          curveType: CURVE_TYPE,
          stepCount: STEP_COUNT,
          maxSupply: BigInt(MAX_SUPPLY),
          initialMintingPrice: parseEther(INITIAL_PRICE),
          finalMintingPrice: parseEther(FINAL_PRICE),
          creatorAllocation: BigInt(CREATOR_ALLOCATION),
        },
        royalty: CREATOR_ROYALTY,
        onSignatureRequest: () => {
          console.log('   🔐 Signing transaction...');
        },
        onSigned: (txHash) => {
          console.log(`   📨 Transaction submitted: ${txHash}`);
        },
      });

    console.log('\n========================================');
    console.log('✅ NFT DEPLOYED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`\n📋 Deployment Details:`);
    console.log(`   Network: ${network}`);
    console.log(`   Symbol: ${NFT_SYMBOL}`);
    console.log(`   Metadata URI: ${metadataUri}`);
    console.log(`\n⚠️ IMPORTANT: Update your .env.local with:`);
    
    if (network === 'basesepolia') {
      console.log(`   NEXT_PUBLIC_VISOR_NFT_ADDRESS_TESTNET=<check basescan for address>`);
    } else {
      console.log(`   NEXT_PUBLIC_VISOR_NFT_ADDRESS_MAINNET=<check basescan for address>`);
    }
    
    console.log(`   NEXT_PUBLIC_VISOR_NFT_METADATA_URI=${metadataUri}`);
    console.log('\n');

    return result;
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    throw error;
  }
}

// ===========================================
// CLI ENTRY POINT
// ===========================================

async function main() {
  const args = process.argv.slice(2);
  const networkIndex = args.indexOf('--network');
  
  if (networkIndex === -1 || !args[networkIndex + 1]) {
    console.error('Usage: pnpm tsx scripts/deploy-nft.ts --network <basesepolia|base>');
    process.exit(1);
  }

  const network = args[networkIndex + 1] as 'basesepolia' | 'base';
  
  if (!['basesepolia', 'base'].includes(network)) {
    console.error('Invalid network. Use: basesepolia or base');
    process.exit(1);
  }

  try {
    await deployNFT(network);
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

main();
