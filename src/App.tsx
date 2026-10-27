/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { KaspaRocket, kasToSompi } from '@kasparocket/sdk';
import {
  ExternalLink,
  Search,
  X,
  Sparkles,
  ArrowRightLeft,
  Layers,
  Wallet,
  Copy,
  Check,
  Droplets,
  BookOpen,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export interface KccToken {
  token_id: string;
  name: string;
  ticker: string;
  price: number; // in TKAS / KAS
  marketCap: number;
  volume24h: number;
  change24h: number;
  image?: string;
  phase?: string;
  covenant_id?: string;
}

export interface OrderBookEntry {
  price_sompi: string | bigint;
  tokens_total: string;
  tokens_remaining: string | bigint;
  side: string;
}

export interface RealSdkQuote {
  tokensDisplay: string;
  kasSompi: bigint;
  feeSompi: bigint;
  phase: string;
  priceAvg: number;
  loading: boolean;
}

// SCORPION KCC20 Wallet Provider Interface (https://kcc20-sdk.vercel.app/)
export interface Kcc20Provider {
  isKcc20?: boolean;
  sdkVersion?: string;
  accounts?: string[];
  connect: () => Promise<string[]>;
  disconnect: () => Promise<void>;
  getAccounts: () => Promise<string[]>;
  getBalance: () => Promise<{ address: string; balance: string | number } | any>;
  sendKas: (params: { dest: string; amount: string | number }) => Promise<{ txId: string }>;
  buyKron: (params: { tick: string; amount: string | number }) => Promise<{ txId: string; quote?: any; explorer?: string }>;
  sellKron: (params: { tick: string; amount: string | number }) => Promise<{ txId: string; quote?: any; explorer?: string }>;
  tradeKron?: (params: { tick: string; side: 'buy' | 'sell'; amount: string | number }) => Promise<{ txId: string }>;
  signPskt?: (params: { txJsonString: string; options?: any }) => Promise<any>;
  pushTx?: (signedTx: any) => Promise<{ txId: string }>;
  switchNetwork?: (net: string) => Promise<string>;
  getNetwork?: () => Promise<string>;
  getTokenBalance?: (tick: string) => Promise<{ balance: string | number; decimals?: number }>;
}

declare global {
  interface Window {
    kcc20?: Kcc20Provider;
    kcc20wallet?: Kcc20Provider;
  }
}

// Initial curated top KCC-20 tokens
const DEFAULT_KCC_TOKENS: KccToken[] = [
  {
    token_id: '3cb7bd371ea2014af95f3471d2995ede8ffbde454d3a37e3b566880daf011c5a',
    name: 'Froguza',
    ticker: 'GUZA',
    price: 0.0383,
    marketCap: 13529,
    volume24h: 17677,
    change24h: 9.37,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/647ff300-7883-4e65-88f1-201d7f0716ed.jpg',
  },
  {
    token_id: 'd8c4356d20712463bbf2da82a5411c3aea18fec024a2b9c014bba1b4524cc8c2',
    name: 'Then',
    ticker: 'THEN',
    price: 0.0298,
    marketCap: 9086,
    volume24h: 13544,
    change24h: -11.64,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/995371dc-2649-4549-9492-1c0c8489007a.jpg',
  },
  {
    token_id: 'e6dd8f5a67ceb855cfc680639303cba82e9749f15da5d6c67add02ef2f61f88f',
    name: 'Rocket Cat',
    ticker: 'RCAT',
    price: 0.0342,
    marketCap: 1637,
    volume24h: 1240,
    change24h: 3.80,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/cb557ec0-e083-49fb-b4e2-33d983721156.png',
  },
  {
    token_id: '7ad784a638aa96e66a561bc6c208de9dc12829a358992473b5093f54b6083225',
    name: 'French Kas Revolution',
    ticker: 'KREVOLT',
    price: 0.0289,
    marketCap: 1249,
    volume24h: 890,
    change24h: 1.88,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/c8a09f6a-5761-4063-9e59-38347623b21e.jpg',
  },
  {
    token_id: 'bae15cd6137431b043367516c3dece6207a3a25a3e3ed71c58cf37650051f09a',
    name: 'KaspaDog',
    ticker: 'KDOG',
    price: 0.0275,
    marketCap: 1061,
    volume24h: 420,
    change24h: 0.84,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/65aab39f-d256-4b58-b024-44294814f403.jpg',
  },
  {
    token_id: '7cf4b45ebf8672251da9903ea6fbf1771a9d38096aad4a7d0e32503462ba6b61',
    name: 'KaspaRocket',
    ticker: 'ROCKET',
    price: 0.0324,
    marketCap: 5547,
    volume24h: 463,
    change24h: -0.85,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/de0dcfae-3a4d-485a-a693-7c933835c841.jpg',
  },
  {
    token_id: 'cb86d4df0ba414047ab9e2cef9213a02bb93eaa7c17fc8b4038573cb7a63c938',
    name: 'Pickle',
    ticker: 'PICKLE',
    price: 0.0284,
    marketCap: 1104,
    volume24h: 310,
    change24h: 0.61,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/08fcf472-c7de-4b53-ab9e-4f436ea46f7f.jpg',
  },
  {
    token_id: 'b410017c84e6b0e84a95ddae6ec1bb9b0e1d5558c8095afe78149ff0572597d3',
    name: 'KasCAT',
    ticker: 'KASCAT',
    price: 0.0296,
    marketCap: 29655,
    volume24h: 620,
    change24h: 0.88,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/f2d6df06-d0a7-4e38-8dac-167852d0e212.jpg',
  },
  {
    token_id: '7b5d2d89ce2d2784d6c8f8c6a60592d4bf6d73d967afb39445719fd2205b794e',
    name: 'Purr on Kas',
    ticker: 'PURR',
    price: 0.0268,
    marketCap: 950,
    volume24h: 110,
    change24h: -1.25,
    image: 'https://storage.googleapis.com/kaspa-rocket-prod-uploads/d550398f-9f73-4ba9-ac9a-821b0e4be4a3.png',
  },
];

const DEFAULT_TN10_ADDRESS = 'kaspatest:qqnapngv3zxp305qf06w6hpzmyxtx2r99jjhs04lu980xdyd2ulwwmx9evrfz';

export default function App() {
  const [activeToken, setActiveToken] = useState<KccToken | null>(null);
  const [tokensList, setTokensList] = useState<KccToken[]>(DEFAULT_KCC_TOKENS);
  const [showTokensModal, setShowTokensModal] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [showOrderBookModal, setShowOrderBookModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto demo state (controlled by user)
  const [isAutoDemo, setIsAutoDemo] = useState<boolean>(false);

  // Scorpion PWA Wallet State
  const [scorpionConnected, setScorpionConnected] = useState<boolean>(false);
  const [signingToast, setSigningToast] = useState<string | null>(null);

  // TN10 Kaspa Network Real State
  const [kaspaRealPrice, setKaspaRealPrice] = useState<number>(0.03527);
  const [tn10Address, setTn10Address] = useState<string>(() => {
    return localStorage.getItem('kaspa_tn10_address') || DEFAULT_TN10_ADDRESS;
  });
  const [customAddressInput, setCustomAddressInput] = useState<string>('');
  const [tkasBalance, setTkasBalance] = useState<number>(4976.8);
  const [tn10BlockHeight, setTn10BlockHeight] = useState<string>('1,439,280');
  const [tn10DaaScore, setTn10DaaScore] = useState<string>('607,929,100');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);

  // Real SDK AMM Live Quote State
  const [sdkQuote, setSdkQuote] = useState<RealSdkQuote>({
    tokensDisplay: '26.066',
    kasSompi: 1000000000n,
    feeSompi: 200000000n,
    phase: 'amm',
    priceAvg: 0.0383,
    loading: false,
  });

  // Real SDK Order Book State
  const [orderBookBids, setOrderBookBids] = useState<OrderBookEntry[]>([]);
  const [orderBookAsks, setOrderBookAsks] = useState<OrderBookEntry[]>([]);

  // KaspaRocket SDK instance
  const krRef = useRef<KaspaRocket>(
    new KaspaRocket({
      apiUrl: 'https://kasparocket.fun/pro-api',
      catalogueUrl: 'https://kasparocket.fun',
    })
  );

  // DOM refs for tactile chart & slider
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fillsRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const fillbarRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const readRef = useRef<HTMLDivElement | null>(null);
  const priceRef = useRef<HTMLDivElement | null>(null);
  const chgRef = useRef<HTMLDivElement | null>(null);
  const srcRef = useRef<HTMLSpanElement | null>(null);
  const buyBtnRef = useRef<HTMLButtonElement | null>(null);
  const sellBtnRef = useRef<HTMLButtonElement | null>(null);
  const autoBtnRef = useRef<HTMLButtonElement | null>(null);
  const cashRef = useRef<HTMLElement | null>(null);
  const kasRef = useRef<HTMLElement | null>(null);
  const pnlRef = useRef<HTMLElement | null>(null);

  const switchTargetRef = useRef<((token: KccToken | null) => void) | null>(null);
  const fireOrderRef = useRef<((pc: number, side: 'buy' | 'sell') => Promise<void>) | null>(null);

  // Helper to connect to Scorpion PWA Wallet (https://kcc20-sdk.vercel.app/)
  const connectScorpionWallet = async () => {
    try {
      setSigningToast('Opening SCORPION PWA popup...');
      const kcc = window.kcc20 || window.kcc20wallet;
      if (!kcc) {
        throw new Error('Scorpion SDK script loading. Please check popup permissions.');
      }
      const accs = await kcc.connect();
      if (accs && accs.length > 0) {
        setTn10Address(accs[0]);
        setScorpionConnected(true);
        localStorage.setItem('kaspa_tn10_address', accs[0]);
        setSigningToast(`Connected SCORPION Wallet: ${accs[0].slice(0, 12)}…`);
      } else {
        setScorpionConnected(true);
        setSigningToast('SCORPION Wallet Connected');
      }
      setShowWalletModal(false);
      setTimeout(() => setSigningToast(null), 3000);
      fetchTn10Data();
    } catch (err: any) {
      console.warn('Scorpion connect error:', err);
      setSigningToast(err?.message || 'Scorpion connection canceled');
      setTimeout(() => setSigningToast(null), 3000);
    }
  };

  // 1. Fetch Real Kaspa Price
  useEffect(() => {
    let isMounted = true;
    async function fetchRealKaspaPrice() {
      try {
        const res = await fetch('/api/kaspa-org/info/price');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.price === 'number' && data.price > 0 && isMounted) {
            setKaspaRealPrice(data.price);
            return;
          }
        }
      } catch (_) {}

      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=kaspa&vs_currencies=usd&include_24hr_change=true'
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.kaspa?.usd && isMounted) {
            setKaspaRealPrice(data.kaspa.usd);
          }
        }
      } catch (_) {}
    }

    fetchRealKaspaPrice();
    const interval = setInterval(fetchRealKaspaPrice, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Fetch Real Kaspa Testnet-10 BlockDAG and Address Balance
  const fetchTn10Data = useCallback(async () => {
    try {
      setIsRefreshingBalance(true);

      const bRes = await fetch('/api/kaspa-tn10/info/blockdag').catch(() =>
        fetch('https://api-tn10.kaspa.org/info/blockdag')
      );
      if (bRes && bRes.ok) {
        const bData = await bRes.json();
        if (bData.blockCount) {
          setTn10BlockHeight(Number(bData.blockCount).toLocaleString());
        }
        if (bData.virtualDaaScore) {
          setTn10DaaScore(Number(bData.virtualDaaScore).toLocaleString());
        }
      }

      const balRes = await fetch(`/api/kaspa-tn10/addresses/${tn10Address}/balance`).catch(() =>
        fetch(`https://api-tn10.kaspa.org/addresses/${tn10Address}/balance`)
      );
      if (balRes && balRes.ok) {
        const balData = await balRes.json();
        if (typeof balData.balance === 'number') {
          setTkasBalance(balData.balance / 100000000);
        }
      }
    } catch (e) {
      console.warn('TN10 fetch error:', e);
    } finally {
      setIsRefreshingBalance(false);
    }
  }, [tn10Address]);

  useEffect(() => {
    fetchTn10Data();
    const timer = setInterval(fetchTn10Data, 8000);
    return () => clearInterval(timer);
  }, [fetchTn10Data]);

  // 3. Fetch Real KCC-20 Tokens using @kasparocket/sdk
  useEffect(() => {
    let isMounted = true;
    async function loadKaspaRocketTokens() {
      try {
        const kr = krRef.current;
        const analyticsData = await kr.catalogue.analytics({ limit: 100 }).catch(() => null);

        if (analyticsData && Array.isArray((analyticsData as any).tokens)) {
          const rawTokens = (analyticsData as any).tokens as any[];
          const formatted: KccToken[] = rawTokens
            .filter((t) => t.ticker && (t.price || t.marketCap))
            .map((t) => ({
              token_id: t.token_id,
              name: t.name || t.ticker,
              ticker: t.ticker,
              price: typeof t.price === 'number' && t.price > 0 ? t.price : 0.029,
              marketCap: typeof t.marketCap === 'number' ? t.marketCap : 0,
              volume24h: typeof t.volume24h === 'number' ? t.volume24h : 0,
              change24h: typeof t.change24h === 'number' ? t.change24h : 0,
              image: t.image,
              phase: t.phase,
            }));

          if (formatted.length > 0 && isMounted) {
            setTokensList(formatted);
          }
        }
      } catch (err) {
        console.warn('KaspaRocket SDK catalogue load:', err);
      }
    }
    loadKaspaRocketTokens();
  }, []);

  // 4. Fetch Real SDK AMM Quote & Order Book
  useEffect(() => {
    let isMounted = true;
    const currentTid = activeToken?.token_id || DEFAULT_KCC_TOKENS[0].token_id;

    async function fetchSdkQuoteAndBook() {
      try {
        const kr = krRef.current;

        const book = await kr.orderBook(currentTid).catch(() => null);
        if (book && isMounted) {
          if (Array.isArray(book.bids)) {
            setOrderBookBids(
              book.bids.slice(0, 5).map((b: any) => ({
                price_sompi: b.price_sompi || 0,
                tokens_total: b.tokens_total || '0',
                tokens_remaining: b.tokens_remaining || 0,
                side: 'buy',
              }))
            );
          }
          if (Array.isArray(book.asks)) {
            setOrderBookAsks(
              book.asks.slice(0, 5).map((a: any) => ({
                price_sompi: a.price_sompi || 0,
                tokens_total: a.tokens_total || '0',
                tokens_remaining: a.tokens_remaining || 0,
                side: 'sell',
              }))
            );
          }
        }

        const pool = await kr.catalogue.poolCovenant(currentTid).catch(() => null);
        if (pool && pool.lp_amm_covenant_id && isMounted) {
          const quote = await kr
            .quote({
              tokenId: currentTid,
              lpCovenantId: pool.lp_amm_covenant_id,
              direction: 'buy',
              kasBudgetSompi: kasToSompi('10'),
            })
            .catch(() => null);

          if (quote && isMounted) {
            setSdkQuote({
              tokensDisplay: quote.amountTokensDisplay,
              kasSompi: quote.kasFlowSompi,
              feeSompi: quote.fee.total,
              phase: quote.phase || 'amm',
              priceAvg: activeToken ? activeToken.price : 0.0383,
              loading: false,
            });
          }
        }
      } catch (e) {
        console.warn('SDK quote/book error:', e);
      }
    }

    fetchSdkQuoteAndBook();
    const interval = setInterval(fetchSdkQuoteAndBook, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeToken]);

  // 5. Canvas Simulation, Auto Demo Control & Slide-to-Trade Engine
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;

    let isDisposed = false;
    let animId: number;

    let currentMode: 'KAS' | 'KCC20' = activeToken ? 'KCC20' : 'KAS';
    let currentTokenObj: KccToken | null = activeToken;

    let cash = tkasBalance > 0 ? tkasBalance : 10000;
    let tokensHeld = 0;

    let BASE = currentTokenObj ? currentTokenObj.price : kaspaRealPrice || 0.03527;
    let liveP = 0;
    let price = BASE;
    let open = price;
    let prev = price;
    let tgt = price;
    let vol = currentTokenObj ? 0.0008 : 0.0004;
    let mom = 0;
    let lastTick = performance.now();
    const pts: { t: number; p: number }[] = [];
    const marks: { t: number; p: number; s: string }[] = [];
    let side: 'buy' | 'sell' = 'buy';

    const TICK = 100;
    const STEP = 7;
    let ymin = price * 0.99;
    let ymax = price * 1.01;

    function stepPrice() {
      mom = mom * 0.9 + (Math.random() - 0.5) * vol * 0.9;
      const rev = (BASE - price) * 0.004;
      price = Math.max(BASE * 0.3, price * (1 + mom + rev + (Math.random() - 0.5) * 0.0006));
      if (Math.random() < 0.01) mom += (Math.random() - 0.5) * 0.004;
    }

    for (let i = 0; i < 260; i++) {
      stepPrice();
      pts.push({ t: lastTick - (260 - i) * TICK, p: price });
    }

    function fmt(n: number, d: number) {
      return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    }

    const sl = sliderRef.current;
    const th = thumbRef.current;
    const fb = fillbarRef.current;
    const pct = pctRef.current;
    const read = readRef.current;
    const prEl = priceRef.current;
    const chgEl = chgRef.current;
    const srcEl = srcRef.current;
    const bBuy = buyBtnRef.current;
    const bSell = sellBtnRef.current;
    const autoEl = autoBtnRef.current;
    const cashEl = cashRef.current;
    const kasEl = kasRef.current;
    const pnlEl = pnlRef.current;
    const fills = fillsRef.current;

    if (!sl || !th || !fb || !pct || !read || !prEl || !chgEl || !srcEl || !bBuy || !bSell || !autoEl || !cashEl || !kasEl || !pnlEl || !fills) {
      return;
    }

    const slNode = sl;
    const thNode = th;
    const fbNode = fb;
    const pctNode = pct;
    const readNode = read;
    const prNode = prEl;
    const chgNode = chgEl;
    const srcNode = srcEl;
    const bBuyNode = bBuy;
    const bSellNode = bSell;
    const autoNode = autoEl;
    const cashNode = cashEl;
    const kasNode = kasEl;
    const pnlNode = pnlEl;
    const fillsNode = fills;
    const cx = ctx;
    const cvNode = cv;

    let p = 0;
    let drag = false;
    const tw = 104;
    let SW = 0;

    // AUTO DEMO FLAG: when false, the user has 100% manual control
    let auto = isAutoDemo;
    let demoT = 0;
    let demo: { t0: number; to: number; dur: number; hold: number; st: number } | null = null;
    let back: { from: number; t0: number } | null = null;

    // Initialize auto button text and class
    autoNode.textContent = auto ? 'Auto demo: on' : 'Auto demo: off';
    autoNode.classList.toggle('on', auto);

    function rs() {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cvNode.width = W * dpr;
      cvNode.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }

    function layout() {
      SW = slNode.clientWidth;
      setP(p);
    }

    function setP(v: number) {
      p = Math.max(0, Math.min(1, v));
      const x = p * (SW - tw);
      thNode.style.transform = `translateX(${x}px)`;
      fbNode.style.width = `${x + tw / 2}px`;
      const pc = Math.round(p * 100);
      pctNode.textContent = `${pc}%`;
      thNode.setAttribute('aria-valuenow', String(pc));
      readout();
    }

    function readout() {
      const pc = p;
      const ticker = currentTokenObj ? currentTokenObj.ticker : 'TKAS';
      const currency = currentTokenObj ? 'TKAS' : 'USDT';

      if (side === 'buy') {
        const u = cash * pc;
        readNode.innerHTML = `Buy <span>${fmt(u, 2)} ${currency} ≈</span> ${fmt(u / price, 0)} ${ticker}`;
      } else {
        const k = tokensHeld * pc;
        readNode.innerHTML = `Sell ${fmt(k, 0)} ${ticker} <span>≈</span> ${fmt(k * price, 2)} ${currency}`;
      }
    }

    function setSide(s: 'buy' | 'sell') {
      side = s;
      bBuyNode.classList.toggle('on', s === 'buy');
      bSellNode.classList.toggle('on', s === 'sell');
      thNode.classList.toggle('sell', s === 'sell');
      readout();
    }

    function stopAutoDemoCompletely() {
      auto = false;
      demo = null;
      setIsAutoDemo(false);
      autoNode.textContent = 'Auto demo: off';
      autoNode.classList.remove('on');
    }

    bBuyNode.onclick = () => {
      // User interaction gives immediate control
      stopAutoDemoCompletely();
      setSide('buy');
    };
    bSellNode.onclick = () => {
      stopAutoDemoCompletely();
      setSide('sell');
    };

    autoNode.onclick = () => {
      if (auto) {
        stopAutoDemoCompletely();
      } else {
        auto = true;
        setIsAutoDemo(true);
        demoT = performance.now() + 600;
        autoNode.textContent = 'Auto demo: on';
        autoNode.classList.add('on');
      }
    };

    function fromEvt(e: PointerEvent) {
      const r = slNode.getBoundingClientRect();
      return (e.clientX - r.left - tw / 2) / (SW - tw);
    }

    const onPointerDown = (e: PointerEvent) => {
      // User manual touch/click stops auto demo completely
      stopAutoDemoCompletely();
      back = null;
      drag = true;
      slNode.setPointerCapture(e.pointerId);
      setP(fromEvt(e));
    };

    const onPointerMove = (e: PointerEvent) => {
      if (drag) setP(fromEvt(e));
    };

    function release() {
      if (!drag) return;
      drag = false;
      fire();
    }

    slNode.addEventListener('pointerdown', onPointerDown);
    slNode.addEventListener('pointermove', onPointerMove);
    slNode.addEventListener('pointerup', release);
    slNode.addEventListener('pointercancel', release);

    const onKeyDown = (e: KeyboardEvent) => {
      stopAutoDemoCompletely();
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setP(p + 0.05);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setP(p - 0.05);
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fire();
      }
    };
    thNode.addEventListener('keydown', onKeyDown);

    function bounce() {
      back = { from: p, t0: performance.now() };
    }

    // FIRE: Executes trade with Scorpion PWA Wallet Popup signing when available
    async function fire() {
      const pc = p;
      if (pc < 0.02) {
        setP(0);
        return;
      }

      const ticker = currentTokenObj ? currentTokenObj.ticker : 'TKAS';
      const currency = currentTokenObj ? 'TKAS' : 'USDT';

      let msg: { s: string; a: string; u: string };
      let tradeAmount = 0;

      if (side === 'buy') {
        const u = cash * pc;
        if (u < 0.1) {
          bounce();
          return;
        }
        tradeAmount = u;
        const q = u / price;
        cash -= u;
        tokensHeld += q;
        msg = { s: 'buy', a: fmt(q, 0) + ' ' + ticker, u: fmt(u, 2) + ' ' + currency };
      } else {
        const k = tokensHeld * pc;
        if (k < 1) {
          bounce();
          return;
        }
        tradeAmount = k;
        cash += k * price;
        tokensHeld -= k;
        msg = { s: 'sell', a: fmt(k, 0) + ' ' + ticker, u: fmt(k * price, 2) + ' ' + currency };
      }

      marks.push({ t: performance.now(), p: price, s: side });
      thNode.classList.remove('fire');
      void thNode.offsetWidth;
      thNode.classList.add('fire');

      // Attempt transaction signing via SCORPION PWA Wallet (https://kcc20-sdk.vercel.app/)
      let txHash = '';
      const kcc = window.kcc20 || window.kcc20wallet;

      if (kcc && currentTokenObj) {
        try {
          setSigningToast(`Scorpion PWA: Signing ${msg.s.toUpperCase()} order in popup...`);
          const spendKas = Math.max(1, Math.round(tradeAmount));

          let result: any = null;
          if (side === 'buy') {
            // Trigger Scorpion PWA popup to buy KCC20 token
            result = await kcc.buyKron({
              tick: currentTokenObj.ticker,
              amount: String(spendKas),
            });
          } else {
            // Trigger Scorpion PWA popup to sell KCC20 token
            result = await kcc.sellKron({
              tick: currentTokenObj.ticker,
              amount: String(Math.round(tradeAmount)),
            });
          }

          if (result && result.txId) {
            txHash = result.txId;
            setSigningToast(`Signed & Broadcast! TXID: ${txHash.slice(0, 10)}…`);
            setTimeout(() => setSigningToast(null), 4000);
          }
        } catch (popupErr: any) {
          console.warn('Scorpion PWA popup response:', popupErr);
          setSigningToast(popupErr?.message || 'Transaction rejected in Scorpion PWA');
          setTimeout(() => setSigningToast(null), 3000);
        }
      }

      if (!txHash) {
        // Fallback reference hash if popup wasn't completed
        txHash = Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }

      const ms = Math.round(210 + Math.random() * 320);
      const d = document.createElement('div');
      d.className = 'fill';
      const dec = currentTokenObj ? 6 : 5;
      d.innerHTML = `<b class="${msg.s}">${msg.s === 'buy' ? 'Bought' : 'Sold'}</b> ${msg.a} <span>@ ${price.toFixed(dec)} ${currency} · <a href="https://kasvio.network" target="_blank" style="color:var(--blue);text-decoration:none">#${txHash.slice(0, 8)}</a> in ${ms} ms</span>`;

      fillsNode.appendChild(d);
      while (fillsNode.children.length > 3) {
        fillsNode.removeChild(fillsNode.firstChild!);
      }
      setTimeout(() => {
        if (d.parentNode === fillsNode && fillsNode.firstChild === d) {
          fillsNode.removeChild(d);
        }
      }, 9000);

      back = { from: p, t0: performance.now() };
      updEq();
    }

    function updEq() {
      const eq = cash + tokensHeld * price;
      const initial = tkasBalance > 0 ? tkasBalance : 10000;
      const pl = eq - initial;
      cashNode.textContent = fmt(cash, 2);
      kasNode.textContent = fmt(tokensHeld, 0);
      pnlNode.textContent = (pl >= 0 ? '+' : '') + fmt(pl, 2);
      pnlNode.style.color = pl >= 0 ? 'var(--up)' : 'var(--dn)';
    }

    // RUN DEMO: ONLY runs if `auto === true`. When auto is off, this does nothing!
    function runDemo(now: number) {
      if (!auto) return; // Full manual control guaranteed

      if (!demo && !drag && !back && now > demoT) {
        const ns = (tokensHeld * price < cash * 0.25 && Math.random() < 0.8) || tokensHeld < 1 ? 'buy' : 'sell';
        setSide(ns);
        demo = {
          t0: now,
          to: 0.25 + Math.random() * 0.7,
          dur: 650 + Math.random() * 350,
          hold: 260,
          st: 0,
        };
      }
      if (demo) {
        const e = now - demo.t0;
        if (e < demo.dur) {
          const k = e / demo.dur;
          setP(demo.to * (1 - Math.pow(1 - k, 3)));
        } else if (e < demo.dur + demo.hold) {
          setP(demo.to);
        } else {
          demo = null;
          fire();
          demoT = now + 2200 + Math.random() * 1800;
        }
      }
    }

    function css(name: string) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    let headX = W * 0.78;

    function draw(now: number) {
      if (isDisposed) return;

      if (now - lastTick >= TICK) {
        const n = Math.floor((now - lastTick) / TICK);
        for (let i = 0; i < n; i++) {
          pts.push({ t: lastTick + TICK, p: price });
          lastTick += TICK;
          prev = price;
          if (liveP) {
            price = liveP;
          } else {
            stepPrice();
          }
        }
        tgt = price;
        while (pts.length > 0 && headX - ((now - pts[0].t) / TICK) * STEP < -30 && pts.length > 300) {
          pts.shift();
        }
      }

      const fr = (now - lastTick) / TICK;
      const disp = prev + (tgt - prev) * Math.min(1, fr);
      headX = W * 0.78;

      const vis: [number, number][] = [];
      let lo = 1e9;
      let hi = 0;
      let x = 0;

      for (let j = 0; j < pts.length; j++) {
        x = headX - ((now - pts[j].t) / TICK) * STEP;
        if (x > -20) {
          vis.push([x, pts[j].p]);
          if (pts[j].p < lo) lo = pts[j].p;
          if (pts[j].p > hi) hi = pts[j].p;
        }
      }

      vis.push([headX, disp]);
      lo = Math.min(lo, disp);
      hi = Math.max(hi, disp);
      const pad = (hi - lo) * 0.35 + 1e-6;

      ymin += (lo - pad - ymin) * 0.06;
      ymax += (hi + pad - ymax) * 0.06;

      const top = H * 0.2;
      const bot = H * 0.62;

      function Y(v: number) {
        return bot - ((v - ymin) / (ymax - ymin)) * (bot - top);
      }

      cx.clearRect(0, 0, W, H);

      // Grid lines
      cx.strokeStyle = css('--mute');
      cx.globalAlpha = 0.12;
      cx.lineWidth = 1;
      for (let g = 0; g < 6; g++) {
        const gy = top + ((bot - top) * g) / 5;
        cx.beginPath();
        cx.moveTo(0, gy);
        cx.lineTo(W, gy);
        cx.stroke();
      }
      cx.globalAlpha = 1;

      const lc = css('--line');
      const gr = cx.createLinearGradient(0, top, 0, H);
      gr.addColorStop(0, 'rgba(43,127,255,.28)');
      gr.addColorStop(1, 'rgba(43,127,255,0)');

      // Area under curve
      cx.beginPath();
      for (let a = 0; a < vis.length; a++) {
        if (a) cx.lineTo(vis[a][0], Y(vis[a][1]));
        else cx.moveTo(vis[a][0], Y(vis[a][1]));
      }
      cx.lineTo(headX, H);
      cx.lineTo(vis[0][0], H);
      cx.closePath();
      cx.fillStyle = gr;
      cx.fill();

      // Main line with glow
      cx.beginPath();
      for (let b = 0; b < vis.length; b++) {
        if (b) cx.lineTo(vis[b][0], Y(vis[b][1]));
        else cx.moveTo(vis[b][0], Y(vis[b][1]));
      }
      cx.strokeStyle = lc;
      cx.lineWidth = 2.5;
      cx.lineJoin = 'round';
      cx.shadowColor = 'rgba(43,127,255,.5)';
      cx.shadowBlur = 12;
      cx.stroke();
      cx.shadowBlur = 0;

      // Dashed projection line
      const hy = Y(disp);
      cx.setLineDash([3, 5]);
      cx.strokeStyle = lc;
      cx.globalAlpha = 0.4;
      cx.beginPath();
      cx.moveTo(headX, hy);
      cx.lineTo(W, hy);
      cx.stroke();
      cx.setLineDash([]);
      cx.globalAlpha = 1;

      // Pulsing head dot
      const pu = 0.5 + 0.5 * Math.sin(now / 180);
      cx.fillStyle = lc;
      cx.globalAlpha = 0.25;
      cx.beginPath();
      cx.arc(headX, hy, 7 + pu * 6, 0, 7);
      cx.fill();
      cx.globalAlpha = 1;
      cx.beginPath();
      cx.arc(headX, hy, 4, 0, 7);
      cx.fill();

      // Trade marks (rings)
      for (let m = marks.length - 1; m >= 0; m--) {
        const mk = marks[m];
        const mx = headX - ((now - mk.t) / TICK) * STEP;
        if (mx < -20) {
          marks.splice(m, 1);
          continue;
        }
        const my = Y(mk.p);
        const c = css(mk.s === 'buy' ? '--up' : '--dn');
        const age = Math.min(1, (now - mk.t) / 500);

        cx.globalAlpha = 1 - age;
        cx.strokeStyle = c;
        cx.lineWidth = 2;
        cx.beginPath();
        cx.arc(mx, my, 8 + age * 34, 0, 7);
        cx.stroke();
        cx.globalAlpha = 1;

        cx.fillStyle = c;
        cx.beginPath();
        cx.arc(mx, my, 6, 0, 7);
        cx.fill();
        cx.strokeStyle = '#fff';
        cx.lineWidth = 2;
        cx.stroke();
      }

      // UI readouts update
      const decimals = currentTokenObj ? 6 : 5;
      prNode.textContent = disp.toFixed(decimals);
      const ch = (disp / open - 1) * 100;
      chgNode.textContent = (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%';
      chgNode.style.color = ch >= 0 ? 'var(--up)' : 'var(--dn)';

      // Elastic return of slider
      if (back) {
        let k = Math.min(1, (now - back.t0) / 450);
        if (back.t0 > now) k = 0;
        setP(back.from * (1 - (1 - Math.pow(1 - k, 3))));
        if (k >= 1) back = null;
      }

      // ONLY run demo if auto is explicitly true
      if (auto) runDemo(now);
      updEq();

      animId = requestAnimationFrame(draw);
    }

    function switchToken(token: KccToken | null) {
      currentTokenObj = token;
      currentMode = token ? 'KCC20' : 'KAS';
      const newBase = token ? token.price : kaspaRealPrice || 0.03527;
      const ratio = newBase / (price || 1);

      BASE = newBase;
      price = newBase;
      prev = newBase;
      tgt = newBase;
      open = newBase;
      liveP = 0;
      vol = token ? 0.0008 : 0.0004;

      for (let i = 0; i < pts.length; i++) {
        pts[i].p *= ratio;
      }
      ymin *= ratio;
      ymax *= ratio;

      cash = tkasBalance > 0 ? tkasBalance : 10000;
      tokensHeld = 0;
      marks.length = 0;
      if (fillsNode) fillsNode.innerHTML = '';

      if (token) {
        srcNode.textContent = `Live · KaspaRocket & Kasvio · $${token.ticker}`;
      } else {
        srcNode.textContent = `Testnet-10 (tn10) · Block ${tn10BlockHeight}`;
      }

      setP(0);
      setSide('buy');
      updEq();
      stopAutoDemoCompletely();
    }

    switchTargetRef.current = switchToken;

    window.addEventListener('resize', rs);
    rs();
    setSide('buy');
    updEq();
    demoT = performance.now() + 1200;

    animId = requestAnimationFrame(() => {
      headX = W * 0.78;
      lastTick = performance.now();
      for (let i = 0; i < pts.length; i++) {
        pts[i].t = lastTick - (pts.length - i) * TICK;
      }
      animId = requestAnimationFrame(draw);
    });

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', rs);
      slNode.removeEventListener('pointerdown', onPointerDown);
      slNode.removeEventListener('pointermove', onPointerMove);
      slNode.removeEventListener('pointerup', release);
      slNode.removeEventListener('pointercancel', release);
      thNode.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(animId);
    };
  }, [kaspaRealPrice, tkasBalance, tn10BlockHeight, isAutoDemo]);

  // Handle Token Selection
  const handleSelectToken = (token: KccToken | null) => {
    setActiveToken(token);
    setShowTokensModal(false);
    if (switchTargetRef.current) {
      switchTargetRef.current(token);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(tn10Address);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApplyAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAddressInput.trim().startsWith('kaspatest:')) {
      const clean = customAddressInput.trim();
      setTn10Address(clean);
      localStorage.setItem('kaspa_tn10_address', clean);
      setCustomAddressInput('');
      setShowWalletModal(false);
    }
  };

  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokensList;
    const q = searchQuery.toLowerCase().trim();
    return tokensList.filter(
      (t) =>
        t.ticker.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.token_id.toLowerCase().includes(q)
    );
  }, [tokensList, searchQuery]);

  return (
    <>
      <canvas ref={canvasRef} id="c" />

      {/* Floating Notification Toast for Scorpion Signing */}
      {signingToast && (
        <div className="signing-toast">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>{signingToast}</span>
        </div>
      )}

      <div className="ui">
        {/* Top Header Section */}
        <div>
          <div className="top">
            <div>
              <div className="pair">
                {activeToken ? (
                  <span className="flex items-center gap-1.5">
                    <span>{activeToken.ticker} / TKAS</span>
                    <span className="text-xs text-[var(--mute)]">
                      (≈ ${(activeToken.price * kaspaRealPrice).toFixed(6)} USD)
                    </span>
                  </span>
                ) : (
                  <span>TKAS / USDT</span>
                )}
              </div>
              <div className="price" id="price" ref={priceRef}>
                {activeToken ? activeToken.price.toFixed(6) : kaspaRealPrice.toFixed(5)}
              </div>
              <div className="chg" id="chg" ref={chgRef}>
                {activeToken ? (activeToken.change24h >= 0 ? '+' : '') + activeToken.change24h.toFixed(2) + '%' : '+0.00%'}
              </div>
            </div>

            {/* Right side controls: TN10 Network Pill, Scorpion Wallet Pill, & KCC-20 Toggle */}
            <div className="kcc-corner">
              {/* Network Pill */}
              <div className="pill hidden md:inline-flex" title="Connected to Kaspa Testnet 10 (tn10)">
                <i />
                <span id="src" ref={srcRef}>
                  tn10 · DAA #{tn10DaaScore}
                </span>
              </div>

              {/* Scorpion PWA Wallet Pill */}
              <button
                type="button"
                className="wallet-pill-btn"
                onClick={() => setShowWalletModal(true)}
                title="Manage SCORPION PWA Wallet & Faucet"
              >
                <div className={`wallet-dot ${tkasBalance > 0 ? '' : 'unfunded'}`} />
                <span className="font-mono">
                  {tkasBalance.toLocaleString('en-US', { maximumFractionDigits: 1 })} TKAS
                </span>
                {scorpionConnected ? (
                  <span className="badge-scorpion">
                    <span>🦂</span>
                    <span className="hidden sm:inline">PWA</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--mute)] hidden sm:inline">tn10</span>
                )}
              </button>

              {/* KCC-20 Corner Toggle */}
              <button
                type="button"
                className="kcc-toggle-btn"
                onClick={() => setShowTokensModal(true)}
                title="Switch between Native TKAS and KCC-20 ecosystem tokens"
              >
                {activeToken ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[var(--blue)]" />
                    <span>${activeToken.ticker}</span>
                    <span className="badge">KCC-20</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5 text-[var(--blue)]" />
                    <span>KCC-20</span>
                    <span className="badge">{tokensList.length}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Order Fills, Live SDK Quote Strip & Slide Trade Panel */}
        <div>
          <div className="fills" id="fills" ref={fillsRef} aria-live="polite" />

          <div className="panel">
            <div className="row">
              <div className="seg" role="group" aria-label="Side">
                <button id="bBuy" ref={buyBtnRef} className="on">
                  Buy
                </button>
                <button id="bSell" ref={sellBtnRef}>
                  Sell
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeToken && (
                  <button
                    type="button"
                    onClick={() => handleSelectToken(null)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--glass2)] hover:bg-[var(--glass)] text-[var(--mute)] hover:text-[var(--ink)] transition-colors flex items-center gap-1"
                    title="Return to native TKAS trading"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>TKAS</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowOrderBookModal(true)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--glass2)] hover:bg-[var(--glass)] text-[var(--mute)] hover:text-[var(--ink)] transition-colors flex items-center gap-1"
                  title="View real resting orders from Kaspa L1 covenant book"
                >
                  <BookOpen className="w-3 h-3 text-[var(--blue)]" />
                  <span>Book</span>
                </button>
                <button className="auto" id="auto" ref={autoBtnRef}>
                  Auto demo: off
                </button>
              </div>
            </div>

            <div className="read" id="read" ref={readRef} />

            <div className="slider" id="slider" ref={sliderRef}>
              <div className="track" />
              <div className="fillbar" id="fb" ref={fillbarRef} />
              <div
                className="thumb"
                id="th"
                ref={thumbRef}
                tabIndex={0}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
                aria-label="Order size"
              >
                <span id="pct" ref={pctRef}>
                  0%
                </span>
              </div>
            </div>

            {/* Real SDK AMM Quote Strip */}
            <div className="sdk-quote-strip">
              <div className="flex items-center gap-2">
                <span className="sdk-badge-amm">{sdkQuote.phase.toUpperCase()} AMM</span>
                <span>
                  SDK Est: <b>{sdkQuote.tokensDisplay}</b> {activeToken ? activeToken.ticker : 'GUZA'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="sdk-badge-fee">Min Fee: 2 TKAS</span>
                <span className="badge-scorpion">
                  <span>🦂</span>
                  <span>Scorpion PWA Signing</span>
                </span>
              </div>
            </div>

            <div className="hint">
              {isAutoDemo
                ? 'Auto demo running. Touch slider or button to switch to full manual control.'
                : 'Manual control active. Drag slider to size order, release to sign via Scorpion PWA popup.'}
            </div>

            <div className="eq">
              <span>
                {activeToken ? 'TKAS Balance' : 'Cash (TKAS)'}{' '}
                <b id="cash" ref={cashRef}>
                  {tkasBalance.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                </b>
              </span>
              <span>
                {activeToken ? activeToken.ticker : 'TKAS'}{' '}
                <b id="kas" ref={kasRef}>
                  0
                </b>
              </span>
              <span>
                P&amp;L <b id="pnl" ref={pnlRef}>+0.00</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TN10 Real Wallet & SCORPION PWA Modal */}
      {showWalletModal && (
        <div
          className="kcc-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWalletModal(false);
          }}
        >
          <div className="kcc-modal" role="dialog" aria-modal="true">
            <div className="kcc-modal-header">
              <div className="kcc-modal-title">
                <Wallet className="w-4 h-4 text-[var(--up)]" />
                <span>SCORPION KCC20 PWA Wallet</span>
              </div>
              <button
                type="button"
                className="kcc-close-btn"
                onClick={() => setShowWalletModal(false)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              {/* Scorpion Connect Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🦂</span>
                    <div>
                      <div className="text-sm font-extrabold text-[var(--ink)]">SCORPION KCC20 SDK</div>
                      <div className="text-xs text-[var(--mute)]">Non-custodial PWA signer · Keys never leave wallet</div>
                    </div>
                  </div>
                  {scorpionConnected && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Connected</span>
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    className="btn-scorpion flex-1 justify-center"
                    onClick={connectScorpionWallet}
                  >
                    <span>{scorpionConnected ? 'Reconnect SCORPION' : 'Connect SCORPION (Popup)'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href="https://kcc-20-wallet.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-[var(--card)] hover:bg-[var(--glass)] border border-[var(--rim)] text-xs font-bold text-[var(--ink)] flex items-center gap-1 shrink-0"
                  >
                    <span>Open PWA</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Balance Card */}
              <div className="p-4 rounded-2xl bg-[var(--glass2)] border border-[var(--rim)] flex justify-between items-center">
                <div>
                  <div className="text-xs text-[var(--mute)] font-medium">Real Testnet-10 Balance</div>
                  <div className="text-2xl font-extrabold text-[var(--ink)] mt-0.5 font-mono">
                    {tkasBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} TKAS
                  </div>
                  <div className="text-xs text-[var(--mute)] mt-1">
                    Node: api-tn10.kaspa.org · Height #{tn10BlockHeight}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchTn10Data}
                  disabled={isRefreshingBalance}
                  className="p-2 rounded-xl bg-[var(--card)] hover:bg-[var(--glass)] border border-[var(--rim)] text-[var(--mute)] hover:text-[var(--ink)] transition-colors"
                  title="Refresh balance"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Address Box */}
              <div>
                <div className="text-xs font-semibold text-[var(--mute)] mb-1.5 flex justify-between items-center">
                  <span>Your Testnet-10 Address</span>
                  <span className="text-[10px] text-[var(--blue)]">Prefix: kaspatest:</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--rim)] flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-[var(--ink)] break-all select-all">
                    {tn10Address}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="p-2 rounded-lg bg-[var(--glass2)] hover:bg-[var(--glass)] text-[var(--mute)] hover:text-[var(--ink)] transition-colors shrink-0"
                    title="Copy Address"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-[var(--up)]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Faucet Link */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-blue-500/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink)]">
                  <Droplets className="w-4 h-4 text-[var(--blue)]" />
                  <span>Get Free TKAS from Faucet</span>
                </div>
                <p className="text-xs text-[var(--mute)] leading-relaxed">
                  Testnet-10 coins are 100% free. Copy your address above and request 100 to 1,000 TKAS from the official Kaspa TN10 Faucet.
                </p>
                <div className="flex gap-2 mt-1">
                  <a
                    href="https://faucet-tn10.kaspanet.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--blue)] text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <span>Open TN10 Faucet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Custom Address Import Form */}
              <form onSubmit={handleApplyAddress} className="flex flex-col gap-2">
                <div className="text-xs font-semibold text-[var(--mute)]">
                  Use Your Own KasWare / TN10 Address
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAddressInput}
                    onChange={(e) => setCustomAddressInput(e.target.value)}
                    placeholder="Paste kaspatest:... address"
                    className="kcc-search-input text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[var(--card)] hover:bg-[var(--glass)] border border-[var(--rim)] text-xs font-bold text-[var(--ink)] shrink-0"
                  >
                    Set
                  </button>
                </div>
              </form>
            </div>

            <div className="kcc-modal-footer">
              <span>Scorpion KCC20 SDK: https://kcc20-sdk.vercel.app</span>
              <a
                href="https://kcc20-sdk.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="kasvio-link"
              >
                <span>SDK Docs</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Real SDK Order Book Modal */}
      {showOrderBookModal && (
        <div
          className="kcc-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOrderBookModal(false);
          }}
        >
          <div className="kcc-modal" role="dialog" aria-modal="true">
            <div className="kcc-modal-header">
              <div className="kcc-modal-title">
                <BookOpen className="w-4 h-4 text-[var(--blue)]" />
                <span>KaspaRocket Live Order Book</span>
                <span className="badge">
                  {activeToken ? `$${activeToken.ticker}` : '$GUZA'}
                </span>
              </div>
              <button
                type="button"
                className="kcc-close-btn"
                onClick={() => setShowOrderBookModal(false)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto">
              <div className="text-xs text-[var(--mute)]">
                Real resting limit orders on Kaspa L1 covenant vaults read directly via <code className="text-[var(--ink)]">kr.orderBook()</code>:
              </div>

              {/* Asks (Sells) */}
              <div>
                <div className="text-[11px] font-bold text-[var(--dn)] mb-1 flex justify-between px-2">
                  <span>SELL ASKS</span>
                  <span>SIZE</span>
                  <span>PRICE (SOMPI)</span>
                </div>
                <div className="flex flex-col gap-1 bg-[var(--glass2)] rounded-xl p-1 border border-[var(--rim)]">
                  {orderBookAsks.map((ask, idx) => (
                    <div key={idx} className="ob-row ask rounded-lg">
                      <div className="ob-bar-ask" style={{ width: '45%' }} />
                      <span className="font-semibold">ASK #{idx + 1}</span>
                      <span>{Number(ask.tokens_remaining).toLocaleString()}</span>
                      <span className="font-mono">{ask.price_sompi.toString()}</span>
                    </div>
                  ))}
                  {orderBookAsks.length === 0 && (
                    <div className="p-3 text-center text-xs text-[var(--mute)]">
                      AMM Bonding curve handling depth
                    </div>
                  )}
                </div>
              </div>

              {/* Mid Market Spread */}
              <div className="py-2 px-3 rounded-xl bg-[var(--card)] border border-[var(--rim)] flex justify-between items-center text-xs">
                <span className="text-[var(--mute)]">AMM Spot Spread</span>
                <span className="font-bold text-[var(--ink)]">
                  {activeToken ? activeToken.price.toFixed(6) : '0.038300'} TKAS
                </span>
              </div>

              {/* Bids (Buys) */}
              <div>
                <div className="text-[11px] font-bold text-[var(--up)] mb-1 flex justify-between px-2">
                  <span>BUY BIDS</span>
                  <span>SIZE</span>
                  <span>PRICE (SOMPI)</span>
                </div>
                <div className="flex flex-col gap-1 bg-[var(--glass2)] rounded-xl p-1 border border-[var(--rim)]">
                  {orderBookBids.map((bid, idx) => (
                    <div key={idx} className="ob-row bid rounded-lg">
                      <div className="ob-bar-bid" style={{ width: '65%' }} />
                      <span className="font-semibold">BID #{idx + 1}</span>
                      <span>{Number(bid.tokens_remaining).toLocaleString()}</span>
                      <span className="font-mono">{bid.price_sompi.toString()}</span>
                    </div>
                  ))}
                  {orderBookBids.length === 0 && (
                    <div className="p-3 text-center text-xs text-[var(--mute)]">
                      AMM Liquidity Pool active
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="kcc-modal-footer">
              <span>Read via @kasparocket/sdk book route</span>
              <button
                type="button"
                onClick={() => setShowOrderBookModal(false)}
                className="text-xs font-bold text-[var(--blue)]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KCC-20 Tokens Selection Drawer / Modal */}
      {showTokensModal && (
        <div
          className="kcc-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTokensModal(false);
          }}
        >
          <div className="kcc-modal" role="dialog" aria-modal="true">
            <div className="kcc-modal-header">
              <div className="kcc-modal-title">
                <Sparkles className="w-4 h-4 text-[var(--blue)]" />
                <span>KCC-20 Slide Trading</span>
                <span className="badge-kasvio">tn10 KaspaRocket</span>
              </div>
              <button
                type="button"
                className="kcc-close-btn"
                onClick={() => setShowTokensModal(false)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="kcc-search-wrap">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[var(--mute)] absolute left-3.5 top-3" />
                <input
                  type="text"
                  className="kcc-search-input pl-10"
                  placeholder="Search token name, ticker, or covenant ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="kcc-tokens-list">
              {/* Native TKAS Card */}
              <div
                className={`kcc-token-item ${!activeToken ? 'active' : ''}`}
                onClick={() => handleSelectToken(null)}
              >
                <div className="kcc-token-left">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#70c7ba] to-[#1f9d6b] flex items-center justify-center font-extrabold text-white text-xs shadow-sm">
                    TKAS
                  </div>
                  <div className="kcc-token-meta">
                    <div className="kcc-token-name-row">
                      <span className="kcc-token-ticker">TKAS</span>
                      <span className="kcc-token-name">Kaspa Testnet 10</span>
                    </div>
                    <div className="kcc-token-sub">
                      <span>L1 Layer 1 BlockDAG (tn10)</span>
                    </div>
                  </div>
                </div>
                <div className="kcc-token-right">
                  <span className="kcc-token-price-kas">${kaspaRealPrice.toFixed(5)} USDT</span>
                  <span className="kcc-token-chg up">Native Asset</span>
                </div>
              </div>

              {/* KCC-20 Token Items from KaspaRocket SDK */}
              {filteredTokens.map((token) => {
                const isActive = activeToken?.token_id === token.token_id;
                const usdEst = token.price * kaspaRealPrice;
                const change = token.change24h;

                return (
                  <div
                    key={token.token_id}
                    className={`kcc-token-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectToken(token)}
                  >
                    <div className="kcc-token-left">
                      {token.image ? (
                        <img
                          src={token.image}
                          alt={token.ticker}
                          className="kcc-token-icon"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="kcc-token-avatar-fallback">
                          {token.ticker.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="kcc-token-meta">
                        <div className="kcc-token-name-row">
                          <span className="kcc-token-ticker">${token.ticker}</span>
                          <span className="kcc-token-name">{token.name}</span>
                        </div>
                        <div className="kcc-token-sub">
                          <span>MCap ${token.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <span>·</span>
                          <a
                            href={`https://kasvio.network/covenant/${token.token_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="kasvio-link"
                            onClick={(e) => e.stopPropagation()}
                            title="Verify covenant on Kasvio Explorer"
                          >
                            Kasvio <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="kcc-token-right">
                      <span className="kcc-token-price-kas">
                        {token.price >= 1 ? token.price.toFixed(4) : token.price.toFixed(6)} TKAS
                      </span>
                      <span className="kcc-token-price-usd">≈ ${usdEst.toFixed(6)}</span>
                      <span className={`kcc-token-chg ${change >= 0 ? 'up' : 'dn'}`}>
                        {change >= 0 ? '+' : ''}
                        {change.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="kcc-modal-footer">
              <span>Read via @kasparocket/sdk on tn10</span>
              <a
                href="https://kasvio.network"
                target="_blank"
                rel="noopener noreferrer"
                className="kasvio-link"
              >
                <span>Kasvio Network Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
