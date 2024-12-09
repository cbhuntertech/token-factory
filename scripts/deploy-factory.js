// scripts/deploy-factory.js
async function main() {
    const TokenFactory = await ethers.getContractFactory("TokenFactory");
    console.log("Deploying TokenFactory...");
    
    const factory = await TokenFactory.deploy();
    await factory.deployed();
    
    console.log("TokenFactory deployed to:", factory.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });