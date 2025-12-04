const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    // Configuracion de distribucion
    const partner = "0xf961361a55A87C84DeDb59BA95de5a0F7BB10582";
    const ownerShare = 70;
    const partnerShare = 30;

    // Deploy MovieNFT
    const MovieNFT = await hre.ethers.getContractFactory("MovieNFT");
    const movieNFT = await MovieNFT.deploy();
    await movieNFT.deployed();

    // Deploy CinemaWallet
    const CinemaWallet = await hre.ethers.getContractFactory("CinemaWallet");
    const cinemaWallet = await CinemaWallet.deploy(partner, ownerShare, partnerShare);
    await cinemaWallet.deployed();

    // Conectar contratos
    const setMinterTx = await movieNFT.setAuthorizedMinter(cinemaWallet.address);
    await setMinterTx.wait();

    const setNftTx = await cinemaWallet.setNFTContract(movieNFT.address);
    await setNftTx.wait();

    // Guardar en .env
    const envPath = path.join(__dirname, "..", ".env");
    let envContent = fs.readFileSync(envPath, "utf8");

    if (envContent.includes("NFT_CONTRACT_ADDRESS=")) {
        envContent = envContent.replace(/NFT_CONTRACT_ADDRESS=.*/, `NFT_CONTRACT_ADDRESS="${movieNFT.address}"`);
    } else {
        envContent += `\nNFT_CONTRACT_ADDRESS="${movieNFT.address}"`;
    }

    if (envContent.includes("WALLET_CONTRACT=")) {
        envContent = envContent.replace(/WALLET_CONTRACT=.*/, `WALLET_CONTRACT="${cinemaWallet.address}"`);
    } else {
        envContent += `\nWALLET_CONTRACT="${cinemaWallet.address}"`;
    }

    fs.writeFileSync(envPath, envContent);

    // Resumen

    console.log("MovieNFT:", movieNFT.address);
    console.log("CinemaWallet:", cinemaWallet.address);
    console.log("Owner:", deployer.address, `(${ownerShare}%)`);
    console.log("Partner:", partner, `(${partnerShare}%)`);
    console.log("\nEtherscan:");
    console.log(`https://sepolia.etherscan.io/address/${movieNFT.address}`);
    console.log(`https://sepolia.etherscan.io/address/${cinemaWallet.address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
