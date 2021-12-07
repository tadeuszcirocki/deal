const dealAbi = require("../artifacts/contracts/Deal.sol/Deal.json");
const dealMockAbi = require("../artifacts/contracts/MockDeal.sol/MockDeal.json");

const { expect } = require("chai");

describe("Deal contract", function () {

    let Token;
    let token;
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

    before(async function () {
        DealDeployer = await ethers.getContractFactory("DealDeployer");
        Token = await ethers.getContractFactory("TestToken");
        MockDealDeployer = await ethers.getContractFactory("MockDealDeployer");
    });

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

        token = await Token.deploy();
        await token.deployed();

        //seller - addr1 deploys the deal
        token.transfer(addr1.address, 100);

        dealDeployer = await DealDeployer.deploy(3 * 7 * 24 * 60 * 60, 5, addr3.address);   //addr3 the judge
        await dealDeployer.deployed();
        token.connect(addr1).approve(dealDeployer.address, 50);
        await dealDeployer.connect(addr1).deployDeal(token.address, 1000, "PS5");
        const dealAddr = await dealDeployer.deals(addr1.address, 0);
        deal = new ethers.Contract(dealAddr, dealAbi.abi, owner);

        mockDealDeployer = await MockDealDeployer.deploy(3 * 7 * 24 * 60 * 60, 5, addr3.address);
        await mockDealDeployer.deployed();
        token.connect(addr1).approve(mockDealDeployer.address, 50);
        await mockDealDeployer.connect(addr1).deployMockDeal(token.address, 1000, "PS5");
        const mockDealAddr = await mockDealDeployer.deals(addr1.address, 0);
        dealMock = new ethers.Contract(mockDealAddr, dealMockAbi.abi, owner);
    });

    describe("buy", function () {
        it("Should fail if already bought", async function () {
            token.transfer(addr2.address, 10000);    //addr2 - buyer
            await token.connect(addr2).approve(deal.address, 2000);
            await deal.connect(addr2).buy();
            await expect(
                deal.connect(addr2).buy()
            ).to.be.revertedWith("Deal: Item already bought");
        });
        it("Should fail if called without enough funds to buy", async function () {
            token.transfer(addr2.address, 30);
            await expect(
                deal.connect(addr2).buy()
            ).to.be.revertedWith("Deal: Insufficent funds to buy");
        });
        it("Should fail if called without enough funds approved to the contract", async function () {
            token.transfer(addr2.address, 1000);
            await expect(
                deal.connect(addr2).buy()
            ).to.be.revertedWith("Deal: You need to approve some tokens to the contract first");
        });
        it("Should transfer funds to contract if called properly", async function () {
            token.transfer(addr2.address, 10000);
            await token.connect(addr2).approve(deal.address, 2000);
            await deal.connect(addr2).buy();
            const price = +await deal.price();
            const penalty = +await deal.penalty();
            expect(await token.balanceOf(deal.address)).to.equal(price + price * penalty / 100);
        });
    });

    describe("confirm", function () {
        it("Should fail if not bought", async function () {
            await expect(
                deal.connect(addr2).confirm()
            ).to.be.revertedWith("Deal: Only buyer can confirm");
        });
        it("Should transfer funds to seller if confirmed by buyer", async function () {
            token.transfer(addr2.address, 10000);
            await token.connect(addr2).approve(deal.address, 2000);
            await deal.connect(addr2).buy();
            const price = +await deal.price();
            const penalty = +await deal.penalty();

            await deal.connect(addr2).confirm();

            expect(await token.balanceOf(addr1.address)).to.equal(price + price * penalty / 100);
        });
    });

    describe("complain", function () {
        it("Should fail if not called by owner or seller", async function () {
            await expect(
                deal.complain()
            ).to.be.revertedWith("Deal: Only buyer or seller can complain");
        });
        it("Should fail if item not bought", async function () {
            await expect(
                deal.connect(addr1).complain()
            ).to.be.revertedWith("Deal: Item needs to be bought in order to make a complaint");
        });
        it("Should fail if not enough time passed since purchase", async function () {
            token.transfer(addr2.address, 10000);
            await token.connect(addr2).approve(deal.address, 2000);
            await deal.connect(addr2).buy();
            await expect(
                deal.connect(addr2).complain()
            ).to.be.revertedWith("Deal: A certain amount of time must pass in order to make a complaint");
        });
        it("Should set the complained variable if everything ok", async function () {
            token.transfer(addr2.address, 10000);
            await token.connect(addr2).approve(dealMock.address, 2000);
            await dealMock.connect(addr2).buy();
            await dealMock.setBuyTime(25);
            await dealMock.connect(addr2).complain();
            expect(await dealMock.complained()).to.equal(true);
        });
    });

    describe("resolve", function () {
        it("Should fail if not called by judge", async function () {
            await expect(
                deal.resolve(addr1.address)
            ).to.be.revertedWith("Deal: Only judge can resolve");
        });
        it("Should fail if not complained", async function () {
            await expect(
                deal.connect(addr3).resolve(addr1.address)
            ).to.be.revertedWith("Deal: The complaint was not brought");
        });
        it("Should transfer the funds to the winner if resolved", async function () {
            token.transfer(addr2.address, 1000);
            await token.connect(addr2).approve(dealMock.address, 1000);
            await dealMock.connect(addr2).buy();
            await dealMock.setBuyTime(25);
            await dealMock.connect(addr2).complain();

            const price = +await dealMock.price();
            const penalty = +await dealMock.penalty();

            await dealMock.connect(addr3).resolve(addr2.address);

            expect(await token.balanceOf(addr2.address)).to.equal(price + price * penalty / 100);
        });
    });

    describe("removeDeal", function () {
        it("Should fail if not called by seller", async function () {
            await expect(
                deal.removeDeal()
            ).to.be.revertedWith("Deal: Only seller can remove the deal");
        });
        it("Should fail if item has been bought", async function () {
            token.transfer(addr2.address, 10000);
            await token.connect(addr2).approve(deal.address, 2000);
            await deal.connect(addr2).buy();
            await expect(
                deal.connect(addr1).removeDeal()
            ).to.be.revertedWith("Deal: Someone bought your item, deal can't be removed");
        });
        it("Should transfer the funds to the seller if removed", async function () {
            const contractBalance = +await token.balanceOf(deal.address);

            await deal.connect(addr1).removeDeal();

            expect(await token.balanceOf(addr1.address)).to.equal(contractBalance);
        });
    });
});