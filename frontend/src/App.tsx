import { useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import CaseInput from "./components/CaseInput";
import JurorCard from "./components/JurorCard";
import FinalConsensus from "./components/FinalConsensus";
import { JURORS, DEMO_CASES } from "./data/jurors";
import { evaluateCaseSync, getThinkingSteps } from "./jury/mockProvider";
import {
  evaluateCaseLLM,
  getDeepseekKey,
  hasDeepseekKey,
} from "./jury/llmProvider";
import AiSettings from "./components/AiSettings";
import {
  checkChain,
  connectWallet,
  getDiscoveredWallets,
  hasAnyWallet,
  readBalance,
  requestAccountSwitch,
  startWalletDiscovery,
  switchToMonad,
  watchWallet,
} from "./web3/wallet";
import type { DiscoveredWallet, Eip1193Provider } from "./web3/wallet";
import WalletModal from "./components/WalletModal";
import { anchorJuryCase, CONTRACT_ADDRESS } from "./web3/registry";
import {
  computeCaseHash,
  computeCommitmentHash,
  computeReasonHash,
  randomSalt,
  verifyCommitment,
} from "./jury/crypto";
import { Verdict } from "./types";
import type {
  CaseData,
  FinalConsensus as FinalConsensusData,
  JurorResult,
  JurorState,
  Verdict as VerdictType,
} from "./types";

// 每个 Agent 的机密数据：Reveal 前绝不进入 UI 渲染状态
interface JurorSecret {
  salt: string;
  reasonHash: string;
  result: import("./types").JurorResult;
}

// 演示模式（未连接钱包）使用的占位地址
const DEMO_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export default function App() {
  const [question, setQuestion] = useState("");
  const [jurors, setJurors] = useState<JurorState[]>(JURORS);
  const [juryRunning, setJuryRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [finalConsensus, setFinalConsensus] =
    useState<FinalConsensusData | null>(null);
  const [caseHash, setCaseHash] = useState<string | null>(null);
  // 演示模式：未连接钱包也能完整体验盲审流程（上链仍需钱包）
  const [demoMode, setDemoMode] = useState(false);

  // ===== V2：真实 AI 推理模式（DeepSeek，Key 存本地浏览器）=====
  const [aiMode, setAiMode] = useState(hasDeepseekKey());
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  // ===== 第八阶段：Monad 上链状态 =====
  const [anchoring, setAnchoring] = useState(false);
  const [anchored, setAnchored] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  // ===== 第五阶段：MetaMask 钱包状态 =====
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const activeProviderRef = useRef<Eip1193Provider | null>(null);

  // 刷新指定 provider 的链/余额状态
  const refreshWalletState = async (provider: Eip1193Provider, address: string) => {
    setChainOk(await checkChain(provider));
    setBalance(await readBalance(provider, address));
  };

  // 启动多钱包发现（EIP-6963），并静默恢复已授权账号
  useEffect(() => {
    const wallets = startWalletDiscovery();
    if (!hasAnyWallet()) {
      setWalletError(
        "检测不到任何钱包。请在装有 MetaMask / OKX / Rabby 等钱包扩展的 Chrome/Edge 浏览器中打开本页面（内置预览窗口无法使用钱包插件）。"
      );
      return;
    }
    const provider = wallets[0].provider;
    provider
      .request({ method: "eth_accounts" })
      .then(async (accounts) => {
        const list = accounts as string[];
        if (list && list.length > 0) {
          activeProviderRef.current = provider;
          setWalletAddress(list[0]);
          await refreshWalletState(provider, list[0]);
        }
      })
      .catch(() => {});
    watchWallet(provider, async () => {
      const list = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      if (list && list.length > 0) {
        setWalletAddress(list[0]);
        await refreshWalletState(provider, list[0]);
      } else {
        setWalletAddress(null);
        setBalance(null);
        setChainOk(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 开发/演示辅助：?autostart=dangerous|safe 自动填入案例并开始盲审
  // （用于无头浏览器端到端验证，不影响正常使用）
  const [autoReveal, setAutoReveal] = useState(false);
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("autostart");
    if (!mode) return;
    const text =
      mode === "safe" ? DEMO_CASES.safe.question : DEMO_CASES.dangerous.question;
    setAutoReveal(true);
    const t = setTimeout(() => {
      setQuestion(text);
      runJury(text);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击 CONNECT WALLET：只有 1 个钱包直接连，多个则弹出选择框
  const handleConnectWallet = async () => {
    setWalletError(null);
    const wallets = getDiscoveredWallets();
    if (wallets.length === 0) {
      setWalletError("未检测到钱包扩展，请先安装 MetaMask 等钱包。");
      return;
    }
    if (wallets.length === 1) {
      await doConnect(wallets[0]);
    } else {
      setWalletModalOpen(true);
    }
  };

  const doConnect = async (wallet: DiscoveredWallet) => {
    setWalletModalOpen(false);
    setConnecting(true);
    try {
      const state = await connectWallet(wallet.provider);
      activeProviderRef.current = wallet.provider;
      setWalletAddress(state.address);
      setChainOk(state.chainOk);
      setBalance(state.balance);
    } catch (err) {
      setWalletError(
        (err as Error).message === "NO_ACCOUNTS"
          ? "钱包未返回账号，请重试。"
          : "连接被取消或失败，请重试。"
      );
    } finally {
      setConnecting(false);
    }
  };

  // ===== 第八阶段：Commit Verdict to Monad（真实上链）=====
  const handleCommitToMonad = async () => {
    const provider = activeProviderRef.current;
    if (!finalConsensus || anchoring || anchored) return;
    if (!provider || !walletAddress) {
      setWalletError("当前是演示模式（未连接钱包），无法上链。请先点击右上角 CONNECT WALLET 连接钱包后再试。");
      return;
    }

    if (!chainOk) {
      setWalletError("请先切换到 Monad Testnet 再上链。");
      return;
    }

    setAnchorError(null);
    setAnchoring(true);
    try {
      // 按陪审员 id 顺序收集 4 个 commitment 和 4 个投票
      const ordered = [...JURORS].sort((a, b) => a.id - b.id);
      const commitments = ordered.map(
        (j) => jurors.find((x) => x.id === j.id)?.commitmentHash ?? ""
      ) as [string, string, string, string];
      const verdicts = ordered.map(
        (j) => secretsRef.current.get(j.id)!.result.verdict
      ) as [number, number, number, number];

      const { txHash: hash } = await anchorJuryCase(provider, {
        caseHash: caseHashRef.current,
        commitments,
        verdicts,
        finalVerdict: finalConsensus.finalVerdict as number,
      });
      setTxHash(hash);
      setAnchored(true);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "ACTION_REJECTED") {
        setAnchorError("你在 MetaMask 中取消了交易。");
      } else {
        setAnchorError(
          "上链失败：请检查网络与余额后重试。（详情见浏览器控制台）"
        );
        console.error("[Anchor] failed:", err);
      }
    } finally {
      setAnchoring(false);
    }
  };

  const handleSwitchAccount = async () => {
    const provider = activeProviderRef.current;
    if (!provider) return;
    try {
      const accounts = await requestAccountSwitch(provider);
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        await refreshWalletState(provider, accounts[0]);
      }
    } catch {
      // 用户在钱包里取消了账号选择，不报错
    }
  };

  const handleSwitchNetwork = async () => {
    const provider = activeProviderRef.current;
    if (!provider) return;
    const ok = await switchToMonad(provider);
    if (ok) {
      await refreshWalletState(provider, walletAddress!);
    } else {
      setWalletError(
        "切换失败：请在钱包中手动添加 Monad Testnet（Chain ID 10143, RPC https://testnet-rpc.monad.xyz）。"
      );
    }
  };

  // 机密区：仅存在于内存，不渲染
  const secretsRef = useRef<Map<number, JurorSecret>>(new Map());
  const caseHashRef = useRef<string>("");
  // 动画运行代号：防止旧定时器污染新一轮流程
  const runIdRef = useRef(0);

  const allCommitted =
    jurors.length > 0 && jurors.every((j) => j.status === "COMMITTED");

  // 自动 Reveal：全部 COMMITTED 后自动揭晓（仅 autostart 模式使用）
  useEffect(() => {
    if (autoReveal && allCommitted && !revealed && !juryRunning) {
      setAutoReveal(false);
      handleRevealJury();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, allCommitted, revealed, juryRunning]);

  const handleStartJury = () => runJury(question);

  // ===== 第三阶段核心：4 个完全独立的 Mock 盲审流程 =====
  // 实现：判断结果同步立即算出（Mock 是纯计算，无需真实等待），
  // THINKING 动画由单一定时器驱动（每 420ms 一个 tick）。
  // 之前每个推理步骤单独 setTimeout，在浏览器后台/预览窗口会被
  // 节流到极慢（表现为几分钟不出结果），单定时器方案彻底规避。
  const runJury = (text: string) => {
    if (juryRunning || !text.trim()) return;

    // 未连接钱包 / 网络不对 → 演示模式：完整跑盲审流程，
    // 只有最后「Commit Verdict to Monad」上链时才强制要求钱包
    const demoMode = !walletAddress || !chainOk;

    // 重置状态
    setRevealed(false);
    setCalculating(false);
    setFinalConsensus(null);
    setAnchoring(false);
    setAnchored(false);
    setTxHash(null);
    setAnchorError(null);
    setDemoMode(demoMode);
    secretsRef.current = new Map();
    setJurors(
      JURORS.map((j) => ({
        ...j,
        status: "IDLE",
        commitmentHash: null,
        result: null,
        verified: false,
        thinkingLog: [],
      }))
    );
    setJuryRunning(true);

    const caseData = {
      question: text.trim(),
      // 已连接钱包用真实地址；演示模式用固定演示地址
      userAddress: walletAddress ?? DEMO_ADDRESS,
      timestamp: Date.now(),
    };

    const hash = computeCaseHash(caseData);
    caseHashRef.current = hash;
    setCaseHash(hash);

    // ===== V2：配置了 DeepSeek Key → 4 名陪审员由真实大模型独立盲审 =====
    if (aiMode && hasDeepseekKey()) {
      runJuryLLM(caseData, hash);
      return;
    }

    // 1. 同步完成全部盲审计算：每个 Agent 独立评估（互不读取对方输出），
    //    独立生成 salt → reasonHash → commitmentHash，机密数据只存内存
    const plan = JURORS.map((juror) => {
      const result = evaluateCaseSync(juror.name, caseData);
      const salt = randomSalt();
      const reasonHash = computeReasonHash(result);
      const commitment = computeCommitmentHash(
        hash,
        juror.id,
        result.verdict,
        result.confidence,
        reasonHash,
        salt
      );
      secretsRef.current.set(juror.id, { salt, reasonHash, result });
      return {
        jurorId: juror.id,
        commitment,
        steps: getThinkingSteps(juror.name),
        // 每个 Agent 在第 4~6 个 tick 随机完成 COMMITTED（交错完成更真实）
        commitTick: 4 + Math.floor(Math.random() * 3),
      };
    });

    // 2. 所有卡片进入 THINKING
    setJurors((prev) =>
      prev.map((j) => ({ ...j, status: "THINKING" as const, thinkingLog: [] }))
    );

    // 3. 单一定时器驱动动画：每个 tick 推进一步推理日志，
    //    到达各自 commitTick 时变为 COMMITTED。全程约 2~3 秒。
    const runId = ++runIdRef.current;
    let tick = 0;
    const timer = setInterval(() => {
      if (runId !== runIdRef.current) {
        clearInterval(timer);
        return;
      }
      tick += 1;
      setJurors((prev) =>
        prev.map((j) => {
          const p = plan.find((x) => x.jurorId === j.id)!;
          if (j.status !== "THINKING") return j;
          if (tick <= p.steps.length) {
            return { ...j, thinkingLog: [...j.thinkingLog, p.steps[tick - 1]] };
          }
          if (tick >= p.commitTick) {
            return { ...j, status: "COMMITTED", commitmentHash: p.commitment };
          }
          return j;
        })
      );
      if (plan.every((p) => tick >= p.commitTick)) {
        clearInterval(timer);
        clearTimeout(watchdog);
        setJuryRunning(false);
      }
    }, 420);

    // 4. 看门狗：即使浏览器把定时器节流到极限（后台标签页等），
    //    12 秒后也强制完成全部 COMMITTED，保证流程永不卡死
    const watchdog = setTimeout(() => {
      if (runId !== runIdRef.current) return;
      clearInterval(timer);
      setJurors((prev) =>
        prev.map((j) => {
          if (j.status !== "THINKING") return j;
          const p = plan.find((x) => x.jurorId === j.id)!;
          return { ...j, status: "COMMITTED", commitmentHash: p.commitment };
        })
      );
      setJuryRunning(false);
    }, 12000);
  };

  // ===== V2：真实 LLM 盲审流程 =====
  // 4 次完全独立的 DeepSeek API 调用（接口层面保证盲审：互不可见对方输出），
  // 谁先返回谁先 COMMITTED（天然交错）。任一调用失败 → 该陪审员回退本地
  // 模拟推理并明确标注，保证演示永不卡死。
  const appendThinking = (jurorId: number, step: string) => {
    setJurors((prev) =>
      prev.map((j) =>
        j.id === jurorId
          ? { ...j, thinkingLog: [...j.thinkingLog, step] }
          : j
      )
    );
  };

  const sealAndCommit = (
    jurorId: number,
    result: JurorResult,
    caseHashStr: string
  ): string => {
    const salt = randomSalt();
    const reasonHash = computeReasonHash(result);
    const commitment = computeCommitmentHash(
      caseHashStr,
      jurorId,
      result.verdict,
      result.confidence,
      reasonHash,
      salt
    );
    secretsRef.current.set(jurorId, { salt, reasonHash, result });
    return commitment;
  };

  const runJuryLLM = (caseData: CaseData, caseHashStr: string) => {
    const runId = runIdRef.current;

    // 全部卡片进入 THINKING，初始日志
    setJurors((prev) =>
      prev.map((j) => ({
        ...j,
        status: "THINKING" as const,
        thinkingLog: [`🧠 真实大模型推理启动（${j.name}）…`],
      }))
    );

    Promise.all(
      JURORS.map(async (juror) => {
        try {
          const result = await evaluateCaseLLM(
            juror.name,
            caseData,
            getDeepseekKey(),
            (step) => {
              if (runId === runIdRef.current) appendThinking(juror.id, step);
            }
          );
          if (runId !== runIdRef.current) return;
          const commitment = sealAndCommit(juror.id, result, caseHashStr);
          setJurors((prev) =>
            prev.map((j) =>
              j.id === juror.id
                ? {
                    ...j,
                    status: "COMMITTED" as const,
                    commitmentHash: commitment,
                    thinkingLog: [
                      ...j.thinkingLog,
                      "✓ 独立裁决完成，承诺已密封（等待统一揭晓）",
                    ],
                  }
                : j
            )
          );
        } catch (err) {
          if (runId !== runIdRef.current) return;
          console.warn(`[Jury] ${juror.name} LLM 调用失败，回退模拟:`, err);
          const result = evaluateCaseSync(juror.name, caseData);
          const commitment = sealAndCommit(juror.id, result, caseHashStr);
          appendThinking(
            juror.id,
            "⚠ DeepSeek 调用失败（网络/额度/CORS），本陪审员回退本地模拟推理"
          );
          setJurors((prev) =>
            prev.map((j) =>
              j.id === juror.id
                ? {
                    ...j,
                    status: "COMMITTED" as const,
                    commitmentHash: commitment,
                  }
                : j
            )
          );
        }
      })
    ).then(() => {
      if (runId !== runIdRef.current) return;
      setJuryRunning(false);
    });
  };

  // ===== 第四阶段：Reveal 揭晓 + 重算 commitment 校验 + 固定代码共识 =====
  const handleRevealJury = async () => {
    if (!allCommitted || revealed || juryRunning) return;

    // 1. 逐个揭晓：REVEALING → 重算 commitmentHash → VERIFIED / FAILED
    //    注意：遍历 jurors 状态（持有真实 commitmentHash），而非 JURORS 常量
    for (const juror of jurors) {
      setJurors((prev) =>
        prev.map((j) =>
          j.id === juror.id ? { ...j, status: "REVEALING" as const } : j
        )
      );
      await new Promise((r) => setTimeout(r, 700));

      const secret = secretsRef.current.get(juror.id);
      if (!secret) continue;

      const ok = verifyCommitment(
        caseHashRef.current,
        juror.id,
        secret.result.verdict,
        secret.result.confidence,
        secret.reasonHash,
        secret.salt,
        juror.commitmentHash ?? ""
      );

      setJurors((prev) =>
        prev.map((j) =>
          j.id === juror.id
            ? {
                ...j,
                status: ok ? ("VERIFIED" as const) : ("FAILED" as const),
                result: secret.result,
                verified: ok,
              }
            : j
        )
      );
    }

    // 2. CALCULATING CONSENSUS...（固定代码统计，非 AI 决定）
    setCalculating(true);
    await new Promise((r) => setTimeout(r, 1400));

    // 3. 投票规则（与智能合约/最终裁决规则一致）：
    //    BLOCK >= 3 → BLOCK；ALLOW >= 3 → ALLOW；其他 → REVIEW
    //    附加规则：Security Jury BLOCK 且 confidence >= 95 → 最低 REVIEW
    const secrets = [...secretsRef.current.values()];
    const count = (v: VerdictType) =>
      secrets.filter((s) => s.result.verdict === v).length;

    let finalVerdict: VerdictType;
    if (count(Verdict.BLOCK) >= 3) finalVerdict = Verdict.BLOCK;
    else if (count(Verdict.ALLOW) >= 3) finalVerdict = Verdict.ALLOW;
    else finalVerdict = Verdict.REVIEW;

    let overrideNote: string | undefined;
    const securityResult = secretsRef.current.get(0)?.result;
    if (
      finalVerdict === Verdict.ALLOW &&
      securityResult &&
      securityResult.verdict === Verdict.BLOCK &&
      securityResult.confidence >= 95
    ) {
      finalVerdict = Verdict.REVIEW;
      overrideNote =
        "附加规则生效：Security Jury 以 ≥95% 置信度投出 BLOCK，即使 ALLOW 票数达标，最终结论也降级为 REVIEW。";
    }

    const avgConfidence = Math.round(
      secrets.reduce((s, x) => s + x.result.confidence, 0) / secrets.length
    );

    // 每位陪审员的意见摘要（按 juror id 顺序）
    const votes = [...secretsRef.current.entries()]
      .sort(([a], [b]) => a - b)
      .map(([id, s]) => ({
        id,
        name: jurors.find((j) => j.id === id)?.name ?? `Juror ${id}`,
        verdict: s.result.verdict,
        confidence: s.result.confidence,
        summary: s.result.summary,
        verified: jurors.find((j) => j.id === id)?.verified ?? false,
      }));

    setFinalConsensus({
      allowVotes: count(Verdict.ALLOW),
      reviewVotes: count(Verdict.REVIEW),
      blockVotes: count(Verdict.BLOCK),
      finalVerdict,
      consensusConfidence: avgConfidence,
      caseHash: caseHashRef.current,
      overrideNote,
      votes,
    });
    setCalculating(false);
    setRevealed(true);
  };

  return (
    <div className="min-h-screen">
      <Navbar
        walletAddress={walletAddress}
        balance={balance}
        chainOk={chainOk}
        connecting={connecting}
        error={walletError}
        onConnect={handleConnectWallet}
        onSwitchNetwork={handleSwitchNetwork}
        onSwitchAccount={handleSwitchAccount}
      />

      <WalletModal
        open={walletModalOpen}
        wallets={getDiscoveredWallets()}
        onPick={doConnect}
        onClose={() => setWalletModalOpen(false)}
      />

      <AiSettings
        open={aiSettingsOpen}
        onClose={() => setAiSettingsOpen(false)}
        onSaved={() => setAiMode(hasDeepseekKey())}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <CaseInput
          question={question}
          onQuestionChange={setQuestion}
          onStartJury={handleStartJury}
          juryRunning={juryRunning}
          revealed={revealed}
        />

        {/* 推理引擎状态条：真实 AI / 本地模拟 */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-panel-edge bg-panel px-4 py-2.5 text-xs">
          {aiMode ? (
            <span className="text-emerald-400">
              🧠 推理引擎：<b className="text-gold-300">DeepSeek 真实大模型</b>
              （4 名陪审员独立 API 调用 · 盲审）
            </span>
          ) : (
            <span className="text-neutral-500">
              🧠 推理引擎：本地模拟数据（未配置 API Key，可用于演示流程）
            </span>
          )}
          <button
            className="font-mono text-[11px] tracking-[0.15em] text-gold-500 transition hover:text-gold-300"
            onClick={() => setAiSettingsOpen(true)}
          >
            ⚙ AI SETTINGS
          </button>
        </div>

        {/* 02 / JURY PANEL */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[11px] font-semibold tracking-[0.25em] text-gold-500">
              02 / JURY PANEL
            </span>
            <div className="h-px flex-1 bg-panel-edge" />
          </div>

          {demoMode && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-300">
              🎭 演示模式（未连接钱包）：盲审流程完整可跑，最后「Commit Verdict to Monad」上链前请先连接钱包
            </div>
          )}

          {allCommitted && !revealed && (
            <div className="animate-expand-reveal mb-4 rounded-lg border border-gold-500/50 bg-gold-500/10 py-4 text-center font-mono text-sm tracking-[0.25em] text-gold-300">
              ALL JURORS COMMITTED ✓
              <span className="mt-1 block text-[10px] tracking-wider text-gold-600">
                CASE HASH: {caseHash?.slice(0, 20)}...{caseHash?.slice(-10)}
              </span>
              <button
                className="btn-gold mt-3 px-8 py-2 text-xs"
                onClick={handleRevealJury}
              >
                🔓 REVEAL JURY
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jurors.map((juror) => (
              <JurorCard key={juror.id} juror={juror} />
            ))}
          </div>
        </section>

        <FinalConsensus
          data={finalConsensus}
          allCommitted={allCommitted}
          calculating={calculating}
          anchored={anchored}
          anchoring={anchoring}
          txHash={txHash}
          contractAddress={CONTRACT_ADDRESS}
          onCommitToMonad={handleCommitToMonad}
        />

        {anchorError && (
          <p className="text-center text-xs text-red-400">{anchorError}</p>
        )}

        <footer className="pt-4 pb-8 text-center text-[11px] text-neutral-700">
          Agent Jury · Built on Monad Testnet · Commit-Reveal Blind Consensus
        </footer>
      </main>
    </div>
  );
}
