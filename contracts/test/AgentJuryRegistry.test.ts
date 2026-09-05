import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentJuryRegistry", function () {
  async function deployFixture() {
    const [creator, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentJuryRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();
    return { registry, creator, other };
  }

  it("记录一次完整裁决并可通过 getCase 查询", async function () {
    const { registry, creator } = await deployFixture();

    const caseHash = ethers.id("dangerous case");
    const commitments = [
      ethers.id("commit-0"),
      ethers.id("commit-1"),
      ethers.id("commit-2"),
      ethers.id("commit-3"),
    ];
    // Security=BLOCK, Intent=REVIEW, Economic=REVIEW, Adversarial=BLOCK
    const verdicts = [2, 1, 1, 2];
    const finalVerdict = 2; // BLOCK

    await expect(
      registry.recordJuryCase(caseHash, commitments, verdicts, finalVerdict)
    )
      .to.emit(registry, "JuryCaseRecorded")
      .withArgs(1, creator.address, caseHash, finalVerdict);

    const c = await registry.getCase(1);
    expect(c.id).to.equal(1n);
    expect(c.creator).to.equal(creator.address);
    expect(c.caseHash).to.equal(caseHash);
    expect(c.finalVerdict).to.equal(2);
    expect(c.commitments[0]).to.equal(commitments[0]);
    expect(c.verdicts[2]).to.equal(1);
    expect(c.timestamp).to.be.greaterThan(0n);
  });

  it("连续记录时 caseId 递增", async function () {
    const { registry } = await deployFixture();
    const zeros = [ethers.id("a"), ethers.id("b"), ethers.id("c"), ethers.id("d")];
    await registry.recordJuryCase(ethers.id("case1"), zeros, [0, 0, 0, 0], 0);
    await registry.recordJuryCase(ethers.id("case2"), zeros, [2, 2, 2, 2], 2);
    expect(await registry.caseCount()).to.equal(2n);
    const c2 = await registry.getCase(2);
    expect(c2.finalVerdict).to.equal(2);
  });

  it("拒绝非法投票编码", async function () {
    const { registry } = await deployFixture();
    const commitments = [ethers.id("a"), ethers.id("b"), ethers.id("c"), ethers.id("d")];
    await expect(
      registry.recordJuryCase(ethers.id("case"), commitments, [0, 3, 1, 2], 1)
    ).to.be.revertedWith("Invalid juror verdict");
    await expect(
      registry.recordJuryCase(ethers.id("case"), commitments, [0, 1, 1, 2], 5)
    ).to.be.revertedWith("Invalid verdict encoding");
  });

  it("拒绝空 commitment", async function () {
    const { registry } = await deployFixture();
    const commitments = [ethers.ZeroHash, ethers.id("b"), ethers.id("c"), ethers.id("d")];
    await expect(
      registry.recordJuryCase(ethers.id("case"), commitments, [0, 1, 1, 2], 1)
    ).to.be.revertedWith("Empty commitment");
  });

  it("链上复核投票规则：BLOCK>=3 -> BLOCK", async function () {
    const { registry } = await deployFixture();
    const commitments = [ethers.id("a"), ethers.id("b"), ethers.id("c"), ethers.id("d")];
    await registry.recordJuryCase(ethers.id("case"), commitments, [2, 2, 2, 0], 2);
    expect(await registry.verifyFinalVerdict(1)).to.equal(true);
  });

  it("链上复核投票规则：ALLOW>=3 -> ALLOW", async function () {
    const { registry } = await deployFixture();
    const commitments = [ethers.id("a"), ethers.id("b"), ethers.id("c"), ethers.id("d")];
    await registry.recordJuryCase(ethers.id("case"), commitments, [0, 0, 0, 1], 0);
    expect(await registry.verifyFinalVerdict(1)).to.equal(true);
  });

  it("链上复核投票规则：平票 -> REVIEW", async function () {
    const { registry } = await deployFixture();
    const commitments = [ethers.id("a"), ethers.id("b"), ethers.id("c"), ethers.id("d")];
    await registry.recordJuryCase(ethers.id("case"), commitments, [2, 2, 0, 0], 1);
    expect(await registry.verifyFinalVerdict(1)).to.equal(true);
  });

  it("finalVerdict 与投票矛盾时复核返回 false", async function () {
    const { registry } = await deployFixture();
    const commitments = [ethers.id("a"), ethers.id("b"), ethers.id("c"), ethers.id("d")];
    // 4 票 ALLOW 却记录为 BLOCK —— 复核应识别出矛盾
    await registry.recordJuryCase(ethers.id("case"), commitments, [0, 0, 0, 0], 2);
    expect(await registry.verifyFinalVerdict(1)).to.equal(false);
  });

  it("查询不存在的案件时回滚", async function () {
    const { registry } = await deployFixture();
    await expect(registry.getCase(99)).to.be.revertedWith("Case not found");
  });
});
