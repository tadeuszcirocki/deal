const dealAbi = require("../artifacts/contracts/DealETH.sol/DealETH.json");
const dealMockAbi = require("../artifacts/contracts/MockDealETH.sol/MockDealETH.json");

const { expect } = require("chai");

describe("DealETH contract", function () {

    let DealDeployer;
    let dealDeployer;
    let deal;

    let MockDealDeployer;
    let mockDealDeployer;
    let dealMock;

    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addr4;
    let provider;

    before(async function () {
        DealDeployer = await ethers.getContractFactory("DealDeployer");
        MockDealDeployer = await ethers.getContractFactory("MockDealDeployer");
    });

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
        provider = waffle.provider;

        dealDeployer = await DealDeployer.deploy(3 * 7 * 24 * 60 * 60, 5, addr3.address);   //addr3 the judge
        await dealDeployer.deployed();
        await dealDeployer.connect(addr1).deployDealETH(1000, "PS5", { value: 50 });
        const dealAddr = await dealDeployer.dealsETH(addr1.address, 0);
        deal = new ethers.Contract(dealAddr, dealAbi.abi, owner);

        mockDealDeployer = await MockDealDeployer.deploy(3 * 7 * 24 * 60 * 60, 5, addr3.address);
        await mockDealDeployer.deployed();
        await mockDealDeployer.connect(addr1).deployMockDealETH(1000, "PS5", { value: 50 });
        const mockDealAddr = await mockDealDeployer.dealsETH(addr1.address, 0);
        dealMock = new ethers.Contract(mockDealAddr, dealMockAbi.abi, owner);
    });

    describe("buy", function () {
        it("Should fail if already bought", async function () {
            await deal.connect(addr2).buy({ value: 1000 });
            await expect(
                deal.connect(addr2).buy({ value: 1000 })
            ).to.be.revertedWith("DealETH: Item already bought");
        });
        it("Should fail if called without enough funds to buy", async function () {
            await expect(
                deal.connect(addr2).buy({ value: 900 })
            ).to.be.revertedWith("DealETH: Insufficent funds to buy");
        });
        it("Should transfer funds to contract if called properly", async function () {
            await deal.connect(addr2).buy({ value: 1000 });
            const price = +await deal.price();
            const penalty = +await deal.penalty();
            const balance = await provider.getBalance(deal.address);
            expect(balance).to.equal(price + price * penalty / 100);
        });
    });

    describe("confirm", function () {
        it("Should fail if not bought", async function () {
            await expect(
                deal.connect(addr2).confirm()
            ).to.be.revertedWith("DealETH: Only buyer can confirm");
        });
        it("Should transfer funds to seller if confirmed by buyer", async function () {
            const sellerBalance = await provider.getBalance(addr1.address);

            await deal.connect(addr2).buy({ value: 1000 });
            const price = +await deal.price();
            const penalty = +await deal.penalty();

            await deal.connect(addr2).confirm();

            const sellerBalanceAfter = ethers.BigNumber.from(await provider.getBalance(addr1.address));

            expect(sellerBalanceAfter.sub(sellerBalance).toNumber()).to.equal(price + price * penalty / 100);
        });
    });

    describe("complain", function () {
        it("Should fail if not called by owner or seller", async function () {
            await expect(
                deal.complain()
            ).to.be.revertedWith("DealETH: Only buyer or seller can complain");
        });
        it("Should fail if item not bought", async function () {
            await expect(
                deal.connect(addr1).complain()
            ).to.be.revertedWith("DealETH: Item needs to be bought in order to make a complaint");
        });
        it("Should fail if not enough time passed since purchase", async function () {
            await deal.connect(addr2).buy({ value: 1000 });
            await expect(
                deal.connect(addr2).complain()
            ).to.be.revertedWith("DealETH: A certain amount of time must pass in order to make a complaint");
        });
        it("Should set the complained variable if everything ok", async function () {
            await dealMock.connect(addr2).buy({ value: 1000 });
            await dealMock.setBuyTime(25);
            await dealMock.connect(addr2).complain();
            expect(await dealMock.complained()).to.equal(true);
        });
    });

    describe("resolve", function () {
        it("Should fail if not called by judge", async function () {
            await expect(
                deal.resolve(addr1.address)
            ).to.be.revertedWith("DealETH: Only judge can resolve");
        });
        it("Should fail if not complained", async function () {
            await expect(
                deal.connect(addr3).resolve(addr1.address)
            ).to.be.revertedWith("DealETH: The complaint was not brought");
        });
        it("Should transfer the funds to the winner if resolved", async function () {
            await dealMock.connect(addr2).buy({ value: 1000 });

            const balance = await provider.getBalance(addr1.address);

            await dealMock.setBuyTime(25);
            await dealMock.connect(addr2).complain();

            const price = +await dealMock.price();
            const penalty = +await dealMock.penalty();

            await dealMock.connect(addr3).resolve(addr1.address);

            const balanceAfter = ethers.BigNumber.from(await provider.getBalance(addr1.address));

            expect(balanceAfter.sub(balance).toNumber()).to.equal(price + price * penalty / 100);
        });
    });

    describe("removeDeal", function () {
        it("Should fail if not called by seller", async function () {
            await expect(
                deal.removeDeal()
            ).to.be.revertedWith("DealETH: Only seller can remove the deal");
        });
        it("Should fail if item has been bought", async function () {
            await deal.connect(addr2).buy({ value: 1000 });
            await expect(
                deal.connect(addr1).removeDeal()
            ).to.be.revertedWith("DealETH: Someone bought your item, deal can't be removed");
        });
        it("Should transfer the funds to the seller if removed", async function () {
            const balance = ethers.BigNumber.from(await provider.getBalance(addr1.address));

            const contractBalance = await provider.getBalance(deal.address);

            let tx = await deal.connect(addr1).removeDeal();
            let receipt = await provider.getTransactionReceipt(tx.hash);

            const balanceAfter = ethers.BigNumber.from(await provider.getBalance(addr1.address));
            const gas = receipt.cumulativeGasUsed * receipt.effectiveGasPrice;

            expect(balanceAfter.sub(balance).add(gas).toNumber()).to.
                equal(contractBalance);
        });
    });
});