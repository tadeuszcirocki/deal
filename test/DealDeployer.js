const dealAbi = require("../artifacts/contracts/Deal.sol/Deal.json");
const dealETHAbi = require("../artifacts/contracts/DealETH.sol/DealETH.json");

const { expect } = require("chai");

describe("DealDeployer contract", function () {

    let Token;
    let token;
    let DealDeployer;
    let dealDeployer;

    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addr4;

    before(async function () {
        DealDeployer = await ethers.getContractFactory("DealDeployer");
        Token = await ethers.getContractFactory("TestToken");
    });

    beforeEach(async function () {
        [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
        token = await Token.deploy();
        await token.deployed();
        dealDeployer = await DealDeployer.deploy(3 * 7 * 24 * 60 * 60, 5, addr3.address);
        await dealDeployer.deployed();
    });

    describe("constructor", function () {
        it("Should set the right owner", async function () {
            expect(await dealDeployer.owner()).to.equal(owner.address);
        });
        it("Should set the deadline as expected", async function () {
            expect(await dealDeployer.deadline()).to.equal(3 * 7 * 24 * 60 * 60);
        });
        it("Should set the penalty as expected", async function () {
            expect(await dealDeployer.penalty()).to.equal(5);
        });
        it("Should set the judge as expected", async function () {
            expect(await dealDeployer.judge()).to.equal(addr3.address);
        });
    });

    describe("setDeadline", function () {
        it("Should set the deadline as expected", async function () {
            await dealDeployer.setDeadline(2 * 7 * 24 * 60 * 60);
            expect(await dealDeployer.deadline()).to.equal(2 * 7 * 24 * 60 * 60);
        });
        it("Should fail if provided with deadline out of range", async function () {
            await expect(
                dealDeployer.setDeadline(5 * 7 * 24 * 60 * 60)
            ).to.be.revertedWith("DealDeployer: Deadline value out of range");
        });
        it("Should fail if someone other than owner calls", async function () {
            await expect(
                dealDeployer.connect(addr1).setDeadline(2 * 7 * 24 * 60 * 60)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("setPenalty", function () {
        it("Should set the penalty as expected", async function () {
            await dealDeployer.setPenalty(3);
            expect(await dealDeployer.penalty()).to.equal(3);
        });
        it("Should fail if provided with penalty out of range", async function () {
            await expect(
                dealDeployer.setPenalty(11)
            ).to.be.revertedWith("DealDeployer: Penalty value out of range");
        });
        it("Should fail if someone other than owner calls", async function () {
            await expect(
                dealDeployer.connect(addr1).setPenalty(3)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("setJudge", function () {
        it("Should set the judge as expected", async function () {
            await dealDeployer.setJudge(addr2.address);
            expect(await dealDeployer.judge()).to.equal(addr2.address);
        });
        it("Should fail if someone other than owner calls", async function () {
            await expect(
                dealDeployer.connect(addr1).setJudge(addr2.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("deployDeal", function () {
        it("Should fail if provided with price too low", async function () {
            token.transfer(addr1.address, 1000);    //addr1 - seller
            await expect(
                dealDeployer.connect(addr1).deployDeal(token.address, 50, "PS5")
            ).to.be.revertedWith("DealDeployer: price too low");
        });
        it("Should fail if called without enough funds to deposit", async function () {
            token.transfer(addr1.address, 30);
            await expect(
                dealDeployer.connect(addr1).deployDeal(token.address, 1000, "PS5")
            ).to.be.revertedWith("DealDeployer: Insufficent funds to deposit");
        });
        it("Should fail if called without enough funds approved to the contract", async function () {
            token.transfer(addr1.address, 1000);
            await expect(
                dealDeployer.connect(addr1).deployDeal(token.address, 1000, "PS5")
            ).to.be.revertedWith("DealDeployer: You need to approve some tokens to the contract first");
        });
        it("Should deploy deal and save its address if called properly", async function () {
            token.transfer(addr1.address, 1000);
            token.connect(addr1).approve(dealDeployer.address, 50);
            await dealDeployer.connect(addr1).deployDeal(token.address, 1000, "PS5");
            const dealAddr = await dealDeployer.deals(addr1.address, 0);
            expect(dealAddr).to.include('0x');
        });
    });

    describe("deployDealETH", function () {
        it("Should fail if provided with price too low", async function () {
            await expect(
                dealDeployer.connect(addr1).deployDealETH(50, "PS5", { value: 100 })
            ).to.be.revertedWith("DealDeployer: price too low");
        });
        it("Should fail if called without enough funds to deposit", async function () {
            await expect(
                dealDeployer.connect(addr1).deployDealETH(1000, "PS5", { value: 30 })
            ).to.be.revertedWith("DealDeployer: Insufficent funds to deposit");
        });
        it("Should deploy deal and save its address if called properly", async function () {
            await dealDeployer.connect(addr1).deployDealETH(1000, "PS5", { value: 50 });
            const dealAddr = await dealDeployer.dealsETH(addr1.address, 0);
            expect(dealAddr).to.include('0x');
        });
    });
});