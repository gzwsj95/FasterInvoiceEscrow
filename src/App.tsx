import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
  useMediaQuery
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  AlertTriangle as DisputeIcon,
  ArrowRight,
  BadgeCheck,
  CheckCircle as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
  CircleDollarSign as DollarIcon,
  Coins,
  ExternalLink as LinkIcon,
  FilePlus2,
  FileCheck2,
  Globe as GlobeIcon,
  Handshake,
  Info as InfoIcon,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw as RefreshIcon,
  RotateCcw as CancelIcon,
  Search,
  ShieldAlert as ShieldIcon,
  ShieldCheck,
  Sparkles,
  Wallet as WalletIcon
} from "lucide-react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  isAddress,
  keccak256,
  parseUnits,
  toHex,
  type Address,
  type Hex
} from "viem";
import { fasterInvoiceEscrowAbi, erc20Abi } from "./abi/FasterInvoiceEscrow";
import {
  ARC_CHAIN_ID,
  ARC_RPC_URL,
  ARC_USDC_ADDRESS,
  ESCROW_ADDRESS,
  arcNetworkParams,
  arcTestnet,
  explorerAddressUrl,
  explorerTxUrl
} from "./config/arc";
import { deployments } from "./config/deployments";
import { copy, getHtmlLang, getInitialLanguage, getStatusLabel, languageOptions, type Language } from "./i18n";
import { formatDate, formatUsdc, shortAddress } from "./lib/format";
import { type Invoice, type Summary, statusName } from "./lib/invoice";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const PRODUCT_NAME = "Faster Invoice Escrow";
const PRODUCT_ACRONYM = "FIE";

type TxState = {
  label: string;
  hash?: Hex;
};

type CreateForm = {
  payer: string;
  reviewer: string;
  resolver: string;
  amount: string;
  dueDate: string;
  title: string;
  metadataURI: string;
  terms: string;
};

type PanelKey = "create" | "invoices" | "detail";
type AppView = "home" | "workspace";

const statusFilters = ["All", "Created", "Funded", "Approved", "Disputed", "Released", "Refunded", "Cancelled"];
const networkOptions = [
  { name: "Arc Testnet", available: true },
  { name: "Arc Mainnet", available: false },
  { name: "Base", available: false },
  { name: "Ethereum", available: false },
  { name: "Polygon", available: false }
];

const initialForm: CreateForm = {
  payer: "",
  reviewer: "",
  resolver: "",
  amount: "25.00",
  dueDate: "",
  title: "Arc Testnet invoice",
  metadataURI: "demo://arc-invoice-001",
  terms: "Standard demo service terms"
};

const emptySummary: Summary = {
  totalCreated: 0n,
  totalFunded: 0n,
  totalReleased: 0n,
  totalRefunded: 0n,
  totalDisputed: 0n
};

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#22d3ee",
      light: "#8cf7ff",
      dark: "#087f87"
    },
    secondary: {
      main: "#8b5cf6",
      light: "#c4b5fd"
    },
    success: {
      main: "#34d399",
      light: "#a7f3d0"
    },
    warning: {
      main: "#f4b84d",
      light: "#ffe2a8"
    },
    error: {
      main: "#fb7185",
      light: "#fecdd3"
    },
    background: {
      default: "#030b0c",
      paper: "#0a1c1e"
    },
    text: {
      primary: "#f5fffd",
      secondary: "#93aaa8"
    },
    divider: "rgba(125, 241, 237, 0.16)"
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: {
      fontSize: "clamp(2rem, 4vw, 3.75rem)",
      fontWeight: 900,
      letterSpacing: 0
    },
    h5: {
      fontWeight: 850,
      letterSpacing: 0
    },
    h6: {
      fontWeight: 800,
      letterSpacing: 0
    },
    button: {
      fontWeight: 800,
      letterSpacing: 0,
      textTransform: "none"
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          minHeight: 40
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none"
        },
        rounded: {
          borderRadius: 8
        }
      }
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(8, 28, 30, 0.78)",
          border: "1px solid rgba(125, 241, 237, 0.16)",
          borderRadius: 8,
          overflow: "hidden",
          "&:before, &:after": {
            display: "none"
          },
          "&:hover": {
            backgroundColor: "rgba(12, 41, 44, 0.88)"
          },
          "&.Mui-focused": {
            backgroundColor: "rgba(12, 41, 44, 0.96)",
            borderColor: "#22d3ee",
            boxShadow: "0 0 0 3px rgba(34, 211, 238, 0.12)"
          }
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: "rgba(7, 22, 24, 0.96)",
          border: "1px solid rgba(125, 241, 237, 0.18)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.48)",
          backdropFilter: "blur(22px)"
        }
      }
    }
  }
});

function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = copy[language];
  const [account, setAccount] = useState<Address>();
  const [walletChainId, setWalletChainId] = useState<number>();
  const [balance, setBalance] = useState<bigint>(0n);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedId, setSelectedId] = useState<bigint>();
  const [statusFilter, setStatusFilter] = useState("All");
  const [activePanel, setActivePanel] = useState<PanelKey>("invoices");
  const [form, setForm] = useState<CreateForm>(initialForm);
  const [disputeReason, setDisputeReason] = useState("Delivery needs review");
  const [pending, setPending] = useState<TxState>();
  const [lastTx, setLastTx] = useState<Hex>();
  const [error, setError] = useState<string>();
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const [networkAnchor, setNetworkAnchor] = useState<null | HTMLElement>(null);
  const [view, setView] = useState<AppView>(() =>
    typeof window !== "undefined" && window.location.hash === "#workspace" ? "workspace" : "home"
  );

  const isMobile = useMediaQuery("(max-width: 899px)");

  useEffect(() => {
    window.localStorage.setItem("fie-language", language);
    document.documentElement.lang = getHtmlLang(language);
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targetHash = view === "workspace" ? "#workspace" : "";
    if (window.location.hash === targetHash) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${targetHash}`);
  }, [view]);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: arcTestnet,
        transport: http(ARC_RPC_URL)
      }),
    []
  );

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedId) || invoices[0];
  const hasEscrowAddress = Boolean(deployments.escrowAddress && isAddress(deployments.escrowAddress));
  const onArc = walletChainId === ARC_CHAIN_ID;
  const canUseContract = Boolean(account && onArc && hasEscrowAddress);
  const connectedLabel = account ? shortAddress(account) : t.connect;
  const networkLabel = onArc ? "Arc Testnet" : walletChainId ? `Chain ${walletChainId}` : t.unknown;

  const filteredInvoices = invoices.filter((invoice) => {
    if (statusFilter === "All") return true;
    return statusName(invoice.status) === statusFilter;
  });

  const walletClient = useCallback(() => {
    if (!window.ethereum || !account) {
      throw new Error(t.connectFirst);
    }
    return createWalletClient({
      account,
      chain: arcTestnet,
      transport: custom(window.ethereum)
    });
  }, [account, t.connectFirst]);

  const refreshWallet = useCallback(async () => {
    if (!window.ethereum) return undefined;
    const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as Address[];
    const chain = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    setAccount(accounts[0]);
    setWalletChainId(Number.parseInt(chain, 16));
    return accounts[0];
  }, []);

  const refreshData = useCallback(async () => {
    setError(undefined);
    const activeAccount = await refreshWallet();

    if (!hasEscrowAddress) {
      setInvoices([]);
      setSummary(emptySummary);
      return;
    }

    try {
      const [totalCreated, totalFunded, totalReleased, totalRefunded, totalDisputed] = await Promise.all([
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: fasterInvoiceEscrowAbi,
          functionName: "totalCreated"
        }),
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: fasterInvoiceEscrowAbi,
          functionName: "totalFunded"
        }),
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: fasterInvoiceEscrowAbi,
          functionName: "totalReleased"
        }),
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: fasterInvoiceEscrowAbi,
          functionName: "totalRefunded"
        }),
        publicClient.readContract({
          address: ESCROW_ADDRESS,
          abi: fasterInvoiceEscrowAbi,
          functionName: "totalDisputed"
        })
      ]);

      const ids = await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: fasterInvoiceEscrowAbi,
        functionName: "listInvoiceIds",
        args: [1n, 100n]
      });

      const records = await Promise.all(
        ids.map((id) =>
          publicClient.readContract({
            address: ESCROW_ADDRESS,
            abi: fasterInvoiceEscrowAbi,
            functionName: "getInvoice",
            args: [id]
          })
        )
      );

      const sortedRecords = (records as Invoice[]).sort((a, b) => Number(b.id - a.id));
      setSummary({
        totalCreated,
        totalFunded,
        totalReleased,
        totalRefunded,
        totalDisputed
      });
      setInvoices(sortedRecords);
      setSelectedId((current) => current || sortedRecords[0]?.id);

      const balanceAccount = activeAccount || account;
      if (balanceAccount) {
        const tokenBalance = await publicClient.readContract({
          address: ARC_USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [balanceAccount]
        });
        setBalance(tokenBalance);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.refreshFailed);
    }
  }, [account, hasEscrowAddress, publicClient, refreshWallet, t.refreshFailed]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const handleWalletChange = () => void refreshData();
    window.ethereum?.on?.("accountsChanged", handleWalletChange);
    window.ethereum?.on?.("chainChanged", handleWalletChange);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleWalletChange);
      window.ethereum?.removeListener?.("chainChanged", handleWalletChange);
    };
  }, [refreshData]);

  async function connectWallet() {
    setError(undefined);
    if (!window.ethereum) {
      setError(t.noWallet);
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await refreshData();
    setView("workspace");
  }

  async function switchToArc() {
    setError(undefined);
    if (!window.ethereum) {
      setError(t.noWallet);
      return;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: arcNetworkParams.chainId }]
      });
    } catch {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [arcNetworkParams]
      });
    }
    await refreshWallet();
  }

  async function runWrite(label: string, action: () => Promise<Hex>) {
    setError(undefined);
    setLastTx(undefined);
    setPending({ label });
    try {
      const hash = await action();
      setPending({ label: t.waitingConfirm, hash });
      await publicClient.waitForTransactionReceipt({ hash });
      setLastTx(hash);
      await refreshData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.txFailed);
    } finally {
      setPending(undefined);
    }
  }

  function ensureReady() {
    if (!account) throw new Error(t.connectFirst);
    if (!hasEscrowAddress) throw new Error(t.setEscrowFirst);
    if (!onArc) throw new Error(t.switchFirst);
  }

  async function createInvoice() {
    ensureReady();
    if (!isAddress(form.payer)) throw new Error(t.payerInvalid);
    if (form.reviewer && !isAddress(form.reviewer)) throw new Error(t.reviewerInvalid);
    if (form.resolver && !isAddress(form.resolver)) throw new Error(t.resolverInvalid);
    const amount = parseUnits(form.amount || "0", 6);
    if (amount <= 0n) throw new Error(t.amountInvalid);
    const dueAt = form.dueDate ? BigInt(Math.floor(new Date(form.dueDate).getTime() / 1000)) : 0n;
    const metadataURI = form.metadataURI || `demo://${form.title || "invoice"}`;
    const termsHash = keccak256(toHex(form.terms || "Standard demo terms"));

    await runWrite(t.creatingInvoice, () =>
      walletClient().writeContract({
        address: ESCROW_ADDRESS,
        abi: fasterInvoiceEscrowAbi,
        functionName: "createInvoice",
        args: [
          form.payer as Address,
          form.reviewer ? (form.reviewer as Address) : ZERO_ADDRESS,
          form.resolver ? (form.resolver as Address) : ZERO_ADDRESS,
          amount,
          dueAt,
          metadataURI,
          termsHash
        ]
      })
    );
    setActivePanel("invoices");
  }

  async function approveUsdc(invoice: Invoice) {
    ensureReady();
    await runWrite(t.approvingUsdc, () =>
      walletClient().writeContract({
        address: ARC_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [ESCROW_ADDRESS, invoice.amount]
      })
    );
  }

  async function invoiceAction(
    label: string,
    functionName: "fundInvoice" | "approveDelivery" | "releaseInvoice" | "cancelInvoice",
    id: bigint
  ) {
    ensureReady();
    await runWrite(label, () =>
      walletClient().writeContract({
        address: ESCROW_ADDRESS,
        abi: fasterInvoiceEscrowAbi,
        functionName,
        args: [id]
      })
    );
  }

  async function openDispute(invoice: Invoice) {
    ensureReady();
    const reasonHash = keccak256(toHex(disputeReason || "Manual review requested"));
    await runWrite(t.openingDispute, () =>
      walletClient().writeContract({
        address: ESCROW_ADDRESS,
        abi: fasterInvoiceEscrowAbi,
        functionName: "openDispute",
        args: [invoice.id, reasonHash]
      })
    );
  }

  async function resolveDispute(invoice: Invoice, resolution: 0 | 1) {
    ensureReady();
    await runWrite(resolution === 0 ? t.resolvingRelease : t.resolvingRefund, () =>
      walletClient().writeContract({
        address: ESCROW_ADDRESS,
        abi: fasterInvoiceEscrowAbi,
        functionName: "resolveDispute",
        args: [invoice.id, resolution]
      })
    );
  }

  const activeStatus = selectedInvoice ? statusName(selectedInvoice.status) : "Unknown";
  const userRole = getUserRole(account, selectedInvoice);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          background:
            "linear-gradient(180deg, #030b0c 0%, #051516 46%, #071112 100%)",
          color: "text.primary"
        }}
      >
        <AppHeader
          connectedLabel={connectedLabel}
          hasEscrowAddress={hasEscrowAddress}
          isMobile={isMobile}
          language={language}
          langAnchor={langAnchor}
          networkAnchor={networkAnchor}
          networkLabel={networkLabel}
          onConnect={() => void connectWallet()}
          onCloseLanguage={() => setLangAnchor(null)}
          onCloseNetwork={() => setNetworkAnchor(null)}
          onHome={() => setView("home")}
          onLanguageMenu={(target) => setLangAnchor(target)}
          onLanguageSelect={(value) => {
            setLanguage(value);
            setLangAnchor(null);
          }}
          onNetworkMenu={(target) => setNetworkAnchor(target)}
          onRefresh={() => void refreshData()}
          onSwitchNetwork={() => {
            setNetworkAnchor(null);
            void switchToArc();
          }}
          onWorkspace={() => setView("workspace")}
          onArc={onArc}
          pending={Boolean(pending)}
          t={t}
          view={view}
        />

        {view === "home" ? (
          <LandingHome
            account={account}
            balance={balance}
            hasEscrowAddress={hasEscrowAddress}
            networkLabel={networkLabel}
            onConnect={() => void connectWallet()}
            onLaunch={() => setView("workspace")}
            summary={summary}
            t={t}
          />
        ) : (
          <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2.5, lg: 3 }, py: { xs: 2, md: 3 } }}>
            <HeroBand hasEscrowAddress={hasEscrowAddress} t={t} />

            <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))"
              },
              gap: 1.25,
              mb: 2
            }}
          >
            <MetricCard label={t.wallet} value={account ? shortAddress(account) : t.disconnected} tone="teal" />
            <MetricCard label={t.network} value={networkLabel} tone={onArc ? "blue" : "amber"} />
            <MetricCard
              label={t.escrow}
              value={hasEscrowAddress ? shortAddress(ESCROW_ADDRESS) : t.notDeployed}
              tone={hasEscrowAddress ? "teal" : "amber"}
            />
            <MetricCard label={t.usdcBalance} value={`${formatUsdc(balance)} USDC`} tone="green" />
            <MetricCard label={t.invoices} value={summary.totalCreated.toString()} tone="ink" />
            </Box>

            <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(320px, 360px) minmax(0, 1fr)",
                xl: "minmax(320px, 360px) minmax(360px, 430px) minmax(0, 1fr)"
              },
              gridTemplateAreas: {
                xs: `"tabs" "mobilePanel"`,
                md: `"create detail" "invoices detail"`,
                xl: `"create invoices detail"`
              },
              alignItems: "start",
              gap: 1.5
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                gridArea: "tabs",
                display: { xs: "block", md: "none" },
                overflow: "hidden"
              }}
            >
              <Tabs
                value={activePanel}
                variant="fullWidth"
                onChange={(_, value: PanelKey) => setActivePanel(value)}
                aria-label="Workspace sections"
              >
                <Tab value="invoices" label={t.invoicesTab} />
                <Tab value="create" label={t.createTab} />
                <Tab value="detail" label={t.detailTab} />
              </Tabs>
            </Paper>

            <Box sx={{ gridArea: { xs: "mobilePanel", md: "create" }, display: panelDisplay(activePanel, "create") }}>
              <CreateInvoicePanel
                canUseContract={canUseContract}
                form={form}
                onCreate={() => {
                  createInvoice().catch((cause) => setError(cause instanceof Error ? cause.message : t.createFailed));
                }}
                pending={Boolean(pending)}
                setForm={setForm}
                t={t}
              />
            </Box>

            <Box sx={{ gridArea: { xs: "mobilePanel", md: "invoices" }, display: panelDisplay(activePanel, "invoices") }}>
              <InvoiceListPanel
                activeId={selectedInvoice?.id}
                filteredInvoices={filteredInvoices}
                language={language}
                onFilter={setStatusFilter}
                onSelect={(id) => {
                  setSelectedId(id);
                  if (isMobile) setActivePanel("detail");
                }}
                statusFilter={statusFilter}
                t={t}
              />
            </Box>

            <Box sx={{ gridArea: { xs: "mobilePanel", md: "detail" }, display: panelDisplay(activePanel, "detail") }}>
              <InvoiceDetailPanel
                activeStatus={activeStatus}
                canUseContract={canUseContract}
                disputeReason={disputeReason}
                invoice={selectedInvoice}
                language={language}
                onApproveDelivery={(invoice) => void invoiceAction(t.approvingDelivery, "approveDelivery", invoice.id)}
                onApproveUsdc={(invoice) => void approveUsdc(invoice)}
                onCancel={(invoice) => void invoiceAction(t.cancellingInvoice, "cancelInvoice", invoice.id)}
                onDispute={(invoice) => void openDispute(invoice)}
                onFund={(invoice) => void invoiceAction(t.fundingInvoice, "fundInvoice", invoice.id)}
                onRelease={(invoice) => void invoiceAction(t.releasingInvoice, "releaseInvoice", invoice.id)}
                onResolveRefund={(invoice) => void resolveDispute(invoice, 1)}
                onResolveRelease={(invoice) => void resolveDispute(invoice, 0)}
                pending={Boolean(pending)}
                setDisputeReason={setDisputeReason}
                t={t}
                userRole={userRole}
              />
            </Box>
            </Box>
          </Container>
        )}

        <AppFooter t={t} />

        <Snackbar open={Boolean(pending)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert
            severity="info"
            icon={<CircularProgress size={20} />}
            sx={{ alignItems: "center", width: "100%" }}
          >
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {pending?.label}
            </Typography>
            {pending?.hash && (
              <Typography variant="caption" sx={{ display: "block" }}>
                {shortAddress(pending.hash)}
              </Typography>
            )}
          </Alert>
        </Snackbar>

        <Snackbar open={Boolean(lastTx)} autoHideDuration={6000} onClose={() => setLastTx(undefined)}>
          <Alert
            severity="success"
            onClose={() => setLastTx(undefined)}
            action={
              lastTx ? (
                <Button color="inherit" href={explorerTxUrl(lastTx)} size="small" target="_blank">
                  {t.viewArcScan}
                </Button>
              ) : undefined
            }
          >
            {t.txConfirmed}
          </Alert>
        </Snackbar>

        <Snackbar open={Boolean(error)} autoHideDuration={8000} onClose={() => setError(undefined)}>
          <Alert severity="error" onClose={() => setError(undefined)}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

function AppHeader({
  connectedLabel,
  hasEscrowAddress,
  isMobile,
  language,
  langAnchor,
  networkAnchor,
  networkLabel,
  onArc,
  onCloseLanguage,
  onCloseNetwork,
  onConnect,
  onHome,
  onLanguageMenu,
  onLanguageSelect,
  onNetworkMenu,
  onRefresh,
  onSwitchNetwork,
  onWorkspace,
  pending,
  t,
  view
}: {
  connectedLabel: string;
  hasEscrowAddress: boolean;
  isMobile: boolean;
  language: Language;
  langAnchor: HTMLElement | null;
  networkAnchor: HTMLElement | null;
  networkLabel: string;
  onArc: boolean;
  onCloseLanguage: () => void;
  onCloseNetwork: () => void;
  onConnect: () => void;
  onHome: () => void;
  onLanguageMenu: (target: HTMLElement) => void;
  onLanguageSelect: (value: Language) => void;
  onNetworkMenu: (target: HTMLElement) => void;
  onRefresh: () => void;
  onSwitchNetwork: () => void;
  onWorkspace: () => void;
  pending: boolean;
  t: typeof copy.en;
  view: AppView;
}) {
  const navButtonSx = {
    color: "text.primary",
    flex: "0 0 auto",
    borderRadius: 1.6,
    minHeight: 38,
    px: { xs: 1.25, md: 1.7 },
    whiteSpace: "nowrap"
  };

  return (
    <AppBar
      elevation={0}
      position="sticky"
      sx={{
        bgcolor: alpha("#02090a", 0.9),
        borderBottom: "1px solid",
        borderColor: "divider",
        backdropFilter: "blur(16px)",
        color: "text.primary"
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2.5, lg: 3 } }}>
        <Toolbar
          disableGutters
          sx={{
            alignItems: "center",
            display: "grid",
            gap: { xs: 1, lg: 2 },
            gridTemplateAreas: {
              xs: `"brand actions" "nav nav"`,
              lg: `"brand nav actions"`
            },
            gridTemplateColumns: { xs: "minmax(0, 1fr) auto", lg: "auto minmax(0, 1fr) auto" },
            py: { xs: 1, md: 1.05 }
          }}
        >
          <Stack direction="row" spacing={1.1} sx={{ alignItems: "center", gridArea: "brand", minWidth: 0 }}>
            <FieLogo size={isMobile ? 46 : 52} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: "1.02rem", sm: "1.12rem" },
                  lineHeight: 1.05,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {isMobile ? PRODUCT_ACRONYM : PRODUCT_NAME}
              </Typography>
              <Typography color="text.secondary" variant="caption" sx={{ display: { xs: "none", sm: "block" } }}>
                {PRODUCT_ACRONYM} · USDC Escrow
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              alignItems: "center",
              bgcolor: alpha("#030b0c", 0.82),
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 999,
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02), 0 12px 40px rgba(0,0,0,0.22)",
              display: "flex",
              gap: 0.35,
              gridArea: "nav",
              justifySelf: { xs: "stretch", lg: "center" },
              maxWidth: "100%",
              minWidth: 0,
              overflow: { xs: "auto hidden", lg: "visible" },
              p: 0.55,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": {
                display: "none"
              }
            }}
          >
            <Button
              onClick={onHome}
              size="small"
              startIcon={<Sparkles size={16} />}
              sx={{
                ...navButtonSx,
                bgcolor: view === "home" ? alpha(theme.palette.primary.main, 0.16) : "transparent",
                border: "1px solid",
                borderColor: view === "home" ? alpha(theme.palette.primary.main, 0.48) : "transparent"
              }}
            >
              {t.homeNav}
            </Button>
            <Button
              onClick={onWorkspace}
              size="small"
              startIcon={<LayoutDashboard size={16} />}
              sx={{
                ...navButtonSx,
                bgcolor: view === "workspace" ? alpha(theme.palette.primary.main, 0.16) : "transparent",
                border: "1px solid",
                borderColor: view === "workspace" ? alpha(theme.palette.primary.main, 0.48) : "transparent"
              }}
            >
              {t.workspaceNav}
            </Button>
            <Button
              component="a"
              disabled={!hasEscrowAddress}
              href={hasEscrowAddress ? explorerAddressUrl(ESCROW_ADDRESS) : "#"}
              size="small"
              startIcon={<LinkIcon size={16} />}
              sx={navButtonSx}
              target="_blank"
            >
              {t.contractNav}
            </Button>
            <Button
              onClick={(event) => onNetworkMenu(event.currentTarget)}
              size="small"
              startIcon={<ShieldIcon size={16} />}
              sx={{
                ...navButtonSx,
                border: "1px solid",
                borderColor: onArc ? alpha(theme.palette.primary.main, 0.42) : alpha(theme.palette.warning.main, 0.42),
                display: { xs: "inline-flex", sm: "none" }
              }}
            >
              Arc
            </Button>
            <Button
              onClick={(event) => onLanguageMenu(event.currentTarget)}
              size="small"
              startIcon={<GlobeIcon size={16} />}
              sx={{
                ...navButtonSx,
                border: "1px solid",
                borderColor: "divider",
                display: { xs: "inline-flex", sm: "none" }
              }}
            >
              {language.toUpperCase()}
            </Button>
          </Box>

          <Stack
            direction="row"
            spacing={0.8}
            sx={{
              alignItems: "center",
              display: { xs: "none", sm: "flex" },
              flexWrap: "nowrap",
              gap: { xs: 0.75, md: 0 },
              gridArea: "actions",
              justifyContent: "flex-end",
              minWidth: 0
            }}
          >
            <Tooltip title={languageOptions.find((option) => option.code === language)?.label || "Language"}>
              <IconButton
                aria-label="Language"
                onClick={(event) => onLanguageMenu(event.currentTarget)}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha("#ffffff", 0.04)
                }}
              >
                <GlobeIcon size={18} />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={onCloseLanguage}>
              {languageOptions.map((option) => (
                <MenuItem
                  key={option.code}
                  onClick={() => onLanguageSelect(option.code)}
                  selected={language === option.code}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>

            <Tooltip title={t.refresh}>
              <IconButton
                aria-label={t.refresh}
                onClick={onRefresh}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha("#ffffff", 0.04),
                  display: { xs: "none", sm: "inline-flex" }
                }}
              >
                <RefreshIcon className={pending ? "spin" : ""} size={18} />
              </IconButton>
            </Tooltip>

            <Button
              aria-label={t.networkMenu}
              endIcon={<ChevronDownIcon size={15} />}
              onClick={(event) => onNetworkMenu(event.currentTarget)}
              size="small"
              startIcon={<ShieldIcon size={16} />}
              sx={{
                bgcolor: onArc ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.warning.main, 0.1),
                border: "1px solid",
                borderColor: onArc ? alpha(theme.palette.primary.main, 0.45) : alpha(theme.palette.warning.main, 0.42),
                color: "text.primary",
                display: { xs: "none", sm: "inline-flex" },
                minWidth: { xs: 44, sm: 146 },
                px: { xs: 1.1, sm: 1.5 },
                whiteSpace: "nowrap",
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } },
                "& .MuiButton-endIcon": { ml: { xs: 0.25, sm: 0.75 } }
              }}
              variant="outlined"
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {isMobile ? "Arc Testnet" : t.switchNetwork}
              </Box>
            </Button>
            <Menu anchorEl={networkAnchor} open={Boolean(networkAnchor)} onClose={onCloseNetwork}>
              <Box sx={{ minWidth: 260, px: 1.5, py: 1 }}>
                <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 900, textTransform: "uppercase" }}>
                  {t.currentWalletNetwork}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 850 }}>
                  {networkLabel}
                </Typography>
              </Box>
              <Divider />
              {networkOptions.map((option) => (
                <MenuItem
                  disabled={!option.available}
                  key={option.name}
                  onClick={option.available ? onSwitchNetwork : undefined}
                  selected={option.available && onArc}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center", justifyContent: "space-between", minWidth: 230, width: "100%" }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {option.available ? <ShieldCheck size={17} /> : <LockKeyhole size={17} />}
                      <Typography variant="body2" sx={{ fontWeight: 850 }}>
                        {option.name}
                      </Typography>
                    </Stack>
                    <Chip
                      color={option.available ? "success" : "default"}
                      label={option.available ? t.networkReady : t.networkInSupport}
                      size="small"
                      variant={option.available ? "filled" : "outlined"}
                    />
                  </Stack>
                </MenuItem>
              ))}
            </Menu>

            <Button
              onClick={onConnect}
              size="small"
              startIcon={<WalletIcon size={16} />}
              sx={{
                background: "linear-gradient(135deg, #22d3ee 0%, #0f8f88 100%)",
                color: "#041010",
                display: { xs: "none", sm: "inline-flex" },
                maxWidth: { xs: 44, sm: "none" },
                minWidth: { xs: 44, sm: 150 },
                overflow: "hidden",
                px: { xs: 1.1, sm: 1.6 },
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } }
              }}
              variant="contained"
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {connectedLabel}
              </Box>
            </Button>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

function AppFooter({ t }: { t: typeof copy.en }) {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: alpha("#02090a", 0.86),
        mt: { xs: 3, md: 5 },
        px: { xs: 1.5, sm: 2.5, lg: 3 },
        py: 2.2
      }}
    >
      <Container maxWidth="xl" disableGutters>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <FieLogo size={30} />
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
              {t.footerText}
            </Typography>
          </Stack>
          <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 800 }}>
            Arc Testnet · USDC Escrow
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

function LandingHome({
  account,
  balance,
  hasEscrowAddress,
  networkLabel,
  onConnect,
  onLaunch,
  summary,
  t
}: {
  account?: Address;
  balance: bigint;
  hasEscrowAddress: boolean;
  networkLabel: string;
  onConnect: () => void;
  onLaunch: () => void;
  summary: Summary;
  t: typeof copy.en;
}) {
  const proofItems = [
    { label: t.network, value: networkLabel },
    { label: t.usdcBalance, value: `${formatUsdc(balance)} USDC` },
    { label: t.invoices, value: summary.totalCreated.toString() }
  ];
  const featureItems = [
    {
      body: t.featureStablecoinBody,
      icon: <Coins size={21} />,
      title: t.featureStablecoin
    },
    {
      body: t.featureRolesBody,
      icon: <Handshake size={21} />,
      title: t.featureRoles
    },
    {
      body: t.featureDisputesBody,
      icon: <ShieldCheck size={21} />,
      title: t.featureDisputes
    },
    {
      body: t.featureStaticDeployBody,
      icon: <FileCheck2 size={21} />,
      title: t.featureStaticDeploy
    }
  ];
  const flowSteps = [t.stepCreate, t.stepFund, t.stepSettle, t.stepResolve];

  return (
    <Box component="main" sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: { xs: "auto", lg: "calc(100vh - 86px)" },
          position: "relative",
          "&::before": {
            backgroundImage:
              "linear-gradient(rgba(125, 241, 237, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 241, 237, 0.055) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            content: '""',
            inset: 0,
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.92), rgba(0,0,0,0.08))",
            pointerEvents: "none",
            position: "absolute"
          },
          "&::after": {
            background:
              "linear-gradient(135deg, rgba(34, 211, 238, 0.18) 0%, transparent 42%), linear-gradient(235deg, rgba(139, 92, 246, 0.13) 0%, transparent 38%)",
            content: '""',
            inset: 0,
            pointerEvents: "none",
            position: "absolute"
          }
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            px: { xs: 1.5, sm: 2.5, lg: 3 },
            py: { xs: 5, md: 8, xl: 10 },
            position: "relative",
            zIndex: 1
          }}
        >
          <Box
            sx={{
              alignItems: "center",
              display: "grid",
              gap: { xs: 4, lg: 6 },
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.95fr) minmax(420px, 0.78fr)" }
            }}
          >
            <Box sx={{ maxWidth: 860 }}>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 2.5 }}>
                <Chip
                  icon={<BadgeCheck size={16} />}
                  label={t.heroBadge}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.14),
                    border: "1px solid",
                    borderColor: alpha(theme.palette.primary.main, 0.42),
                    color: "primary.light"
                  }}
                  variant="outlined"
                />
                <Chip
                  label={hasEscrowAddress ? t.liveContract : t.notDeployed}
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, hasEscrowAddress ? 0.12 : 0.04),
                    border: "1px solid",
                    borderColor: alpha(hasEscrowAddress ? theme.palette.success.main : theme.palette.warning.main, 0.35)
                  }}
                  variant="outlined"
                />
              </Stack>

              <Typography
                component="h1"
                variant="h1"
                sx={{
                  fontSize: { xs: "2.5rem", sm: "4.5rem", xl: "5.8rem" },
                  lineHeight: 0.94,
                  maxWidth: 860,
                  overflowWrap: "anywhere",
                  textShadow: "0 0 32px rgba(34, 211, 238, 0.2)"
                }}
              >
                <Box component="span" sx={{ display: "block" }}>
                  Faster Invoice
                </Box>
                <Box component="span" sx={{ color: "primary.main", display: "block" }}>
                  Escrow
                </Box>
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  fontSize: { xs: "1rem", md: "1.25rem" },
                  lineHeight: 1.7,
                  maxWidth: 720,
                  mt: 2.25,
                  overflowWrap: "anywhere"
                }}
              >
                {t.heroSubtitle}
              </Typography>

              <Box
                sx={{
                  alignItems: "center",
                  bgcolor: alpha("#031112", 0.8),
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                  mt: 3.5,
                  maxWidth: 720,
                  p: 0.8
                }}
              >
                <Stack direction="row" spacing={1.3} sx={{ alignItems: "center", minWidth: 0, px: 1.1 }}>
                  <Search size={20} color={theme.palette.primary.main} />
                  <Typography color="text.secondary" noWrap sx={{ minWidth: 0 }} variant="body1">
                    {t.heroSearchPlaceholder}
                  </Typography>
                  <Chip label="USDC" size="small" variant="outlined" />
                </Stack>
                <Button endIcon={<ArrowRight size={18} />} onClick={onLaunch} size="large" variant="contained">
                  {t.launchWorkspace}
                </Button>
              </Box>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.1} sx={{ mt: 2 }}>
                <Button
                  onClick={account ? onLaunch : onConnect}
                  size="large"
                  startIcon={<WalletIcon size={18} />}
                  sx={{
                    background: "linear-gradient(135deg, #22d3ee 0%, #34d399 100%)",
                    color: "#031112"
                  }}
                  variant="contained"
                >
                  {account ? t.launchWorkspace : t.connect}
                </Button>
                <Button
                  component="a"
                  disabled={!hasEscrowAddress}
                  href={hasEscrowAddress ? explorerAddressUrl(ESCROW_ADDRESS) : "#"}
                  size="large"
                  startIcon={<LinkIcon size={18} />}
                  sx={{ borderColor: alpha(theme.palette.primary.main, 0.35) }}
                  target="_blank"
                  variant="outlined"
                >
                  {t.viewContract}
                </Button>
              </Stack>
            </Box>

            <Box
              sx={{
                justifySelf: "center",
                maxWidth: 560,
                position: "relative",
                width: "100%"
              }}
            >
              <Box
                sx={{
                  bgcolor: alpha("#092426", 0.78),
                  border: "1px solid",
                  borderColor: alpha(theme.palette.primary.main, 0.28),
                  borderRadius: 3,
                  boxShadow: "0 30px 120px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.03) inset",
                  overflow: "hidden",
                  p: { xs: 2, sm: 2.7 }
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1.2, sm: 0 }}
                  sx={{ alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", mb: 2 }}
                >
                  <Stack direction="row" spacing={1.2} sx={{ alignItems: "center" }}>
                    <FieLogo size={50} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }}>
                        {PRODUCT_ACRONYM}
                      </Typography>
                      <Typography variant="h6">{t.heroInvoiceLocked}</Typography>
                    </Box>
                  </Stack>
                  <Chip
                    color="success"
                    icon={<CheckIcon size={15} />}
                    label={t.heroInvoiceReady}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: alpha(theme.palette.primary.main, 0.24),
                    borderRadius: 2,
                    p: { xs: 1.5, sm: 2 },
                    background:
                      "linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(52, 211, 153, 0.06))"
                  }}
                >
                  <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 900 }}>
                    demo://fie-arc-001
                  </Typography>
                  <Typography sx={{ fontSize: { xs: "2.2rem", sm: "3rem" }, fontWeight: 950, lineHeight: 1 }}>
                    25.00 <Box component="span" sx={{ color: "primary.main", fontSize: "0.48em" }}>USDC</Box>
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 0.7 }}>
                    {t.heroInvoiceReady}
                  </Typography>
                </Box>

                <Box sx={{ mt: 2.2 }}>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1,
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      position: "relative"
                    }}
                  >
                    {flowSteps.map((step, index) => (
                      <Box key={step} sx={{ minWidth: 0, position: "relative", textAlign: "center" }}>
                        <Box
                          sx={{
                            alignItems: "center",
                            bgcolor: index < 3 ? "primary.main" : alpha(theme.palette.primary.main, 0.16),
                            border: "1px solid",
                            borderColor: index < 3 ? "primary.main" : alpha(theme.palette.primary.main, 0.42),
                            borderRadius: "50%",
                            color: index < 3 ? "#031112" : "primary.light",
                            display: "inline-flex",
                            height: 34,
                            justifyContent: "center",
                            mb: 0.8,
                            width: 34
                          }}
                        >
                          {index < 3 ? <CheckIcon size={16} /> : <LockKeyhole size={15} />}
                        </Box>
                        <Typography noWrap variant="caption" sx={{ display: "block", fontWeight: 850 }}>
                          {step}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Divider sx={{ my: 2.2 }} />
                <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
                  <InfoTile label={t.wallet} value={account ? shortAddress(account) : t.disconnected} />
                  <InfoTile
                    label={t.escrow}
                    value={hasEscrowAddress ? shortAddress(ESCROW_ADDRESS) : t.notDeployed}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2.5, lg: 3 }, py: { xs: 4, md: 6 } }}>
        <Box
          sx={{
            display: "grid",
            gap: 1.4,
            gridTemplateColumns: { xs: "1fr", md: "0.85fr 1.15fr" },
            mb: 4
          }}
        >
          <Box>
            <Typography color="primary.main" variant="caption" sx={{ fontWeight: 950, textTransform: "uppercase" }}>
              {t.proofTitle}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 950, mt: 0.6 }}>
              {t.whyFie}
            </Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.7, mt: 1 }} variant="body1">
              {t.proofBody}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }
            }}
          >
            {proofItems.map((item) => (
              <MetricCard key={item.label} label={item.label} tone="teal" value={item.value} />
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 1.4,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }
          }}
        >
          {featureItems.map((item) => (
            <Box
              key={item.title}
              sx={{
                bgcolor: alpha("#0a1c1e", 0.82),
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                minHeight: 190,
                p: 2.2,
                transition: "transform 160ms ease, border-color 160ms ease, background 160ms ease",
                "&:hover": {
                  bgcolor: alpha("#0d2a2d", 0.9),
                  borderColor: alpha(theme.palette.primary.main, 0.36),
                  transform: "translateY(-2px)"
                }
              }}
            >
              <Box
                sx={{
                  alignItems: "center",
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  border: "1px solid",
                  borderColor: alpha(theme.palette.primary.main, 0.28),
                  borderRadius: 2,
                  color: "primary.main",
                  display: "flex",
                  height: 44,
                  justifyContent: "center",
                  mb: 2,
                  width: 44
                }}
              >
                {item.icon}
              </Box>
              <Typography variant="h6">{item.title}</Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.65, mt: 1 }} variant="body2">
                {item.body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

function HeroBand({ hasEscrowAddress, t }: { hasEscrowAddress: boolean; t: typeof copy.en }) {
  const steps = [
    [t.stepCreate, t.stepCreateBody],
    [t.stepFund, t.stepFundBody],
    [t.stepSettle, t.stepSettleBody],
    [t.stepResolve, t.stepResolveBody]
  ];

  return (
    <Paper
      variant="outlined"
      sx={{
        background:
          "linear-gradient(135deg, rgba(10, 28, 30, 0.95) 0%, rgba(9, 42, 45, 0.92) 52%, rgba(17, 21, 44, 0.9) 100%)",
        borderColor: alpha(theme.palette.primary.main, 0.18),
        mb: 2,
        overflow: "hidden",
        p: { xs: 1.5, md: 2 }
      }}
    >
      <Box
        sx={{
          alignItems: "stretch",
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(260px, 0.65fr) minmax(0, 1.35fr)" }
        }}
      >
        <Box>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.8, mb: 1.5 }}>
            <Chip color={hasEscrowAddress ? "success" : "warning"} label={hasEscrowAddress ? t.liveContract : t.notDeployed} size="small" />
            <Chip label={t.testnetOnly} size="small" variant="outlined" />
            <Chip label={t.roleReady} size="small" variant="outlined" />
          </Stack>
          <Typography variant="h5">{t.stepsTitle}</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 620, mt: 0.75 }} variant="body2">
            {t.subtitle}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }
          }}
        >
          {steps.map(([title, body], index) => (
            <Box
              key={title}
              sx={{
                bgcolor: alpha("#071719", 0.72),
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.16),
                borderRadius: 2,
                minHeight: { xs: 88, md: 108 },
                minWidth: 0,
                p: { xs: 1.25, md: 1.5 }
              }}
            >
              <Typography color="secondary.main" variant="caption" sx={{ fontWeight: 900 }}>
                {String(index + 1).padStart(2, "0")}
              </Typography>
              <Typography sx={{ fontWeight: 900, mt: 0.75 }} variant="subtitle1">
                {title}
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ overflowWrap: "anywhere" }}>
                {body}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}

function CreateInvoicePanel({
  canUseContract,
  form,
  onCreate,
  pending,
  setForm,
  t
}: {
  canUseContract: boolean;
  form: CreateForm;
  onCreate: () => void;
  pending: boolean;
  setForm: (value: CreateForm) => void;
  t: typeof copy.en;
}) {
  return (
    <Panel title={t.createInvoice} eyebrow={t.merchantFlow} description={t.createHint} icon={<FilePlus2 size={20} />}>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
        <Stack spacing={1.35}>
          <TextField
            fullWidth
            label={t.payerAddress}
            onChange={(event) => setForm({ ...form, payer: event.target.value })}
            placeholder={t.addressPlaceholder}
            size="small"
            value={form.payer}
            variant="filled"
          />
          <TextField
            fullWidth
            label={t.reviewerAddress}
            onChange={(event) => setForm({ ...form, reviewer: event.target.value })}
            placeholder={t.optionalBlank}
            size="small"
            value={form.reviewer}
            variant="filled"
          />
          <TextField
            fullWidth
            label={t.resolverAddress}
            onChange={(event) => setForm({ ...form, resolver: event.target.value })}
            placeholder={t.optionalBlank}
            size="small"
            value={form.resolver}
            variant="filled"
          />
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
            <TextField
              fullWidth
              label={t.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              placeholder="25.00"
              size="small"
              value={form.amount}
              variant="filled"
            />
            <Stack spacing={0.4}>
              <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 800 }}>
                {t.dueDate}
              </Typography>
              <TextField
                fullWidth
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                size="small"
                type="date"
                value={form.dueDate}
                variant="filled"
              />
            </Stack>
          </Box>
          <TextField
            fullWidth
            label={t.invoiceTitle}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            size="small"
            value={form.title}
            variant="filled"
          />
          <TextField
            fullWidth
            label={t.metadataUri}
            onChange={(event) => setForm({ ...form, metadataURI: event.target.value })}
            size="small"
            value={form.metadataURI}
            variant="filled"
          />
          <TextField
            fullWidth
            label={t.terms}
            multiline
            onChange={(event) => setForm({ ...form, terms: event.target.value })}
            rows={3}
            size="small"
            value={form.terms}
            variant="filled"
          />
          <Button disabled={!canUseContract || pending} startIcon={<FilePlus2 size={18} />} type="submit" variant="contained">
            {t.createInvoice}
          </Button>
        </Stack>
      </Box>
    </Panel>
  );
}

function InvoiceListPanel({
  activeId,
  filteredInvoices,
  language,
  onFilter,
  onSelect,
  statusFilter,
  t
}: {
  activeId?: bigint;
  filteredInvoices: Invoice[];
  language: Language;
  onFilter: (status: string) => void;
  onSelect: (id: bigint) => void;
  statusFilter: string;
  t: typeof copy.en;
}) {
  return (
    <Panel title={t.invoices} eyebrow={t.contractState} description={t.filterHint}>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
        {statusFilters.map((filter) => (
          <Chip
            color={statusFilter === filter ? "primary" : "default"}
            key={filter}
            label={getStatusLabel(language, filter)}
            onClick={() => onFilter(filter)}
            size="small"
            variant={statusFilter === filter ? "filled" : "outlined"}
          />
        ))}
      </Stack>

      <Stack spacing={1} sx={{ maxHeight: { md: 430, xl: "calc(100vh - 390px)" }, overflow: "auto", pr: 0.3 }}>
        {filteredInvoices.length === 0 ? (
          <EmptyState title={t.noInvoices} body={t.deployFirst} />
        ) : (
          filteredInvoices.map((invoice) => (
            <Card
              key={invoice.id.toString()}
              variant="outlined"
              sx={{
                bgcolor: activeId === invoice.id ? alpha(theme.palette.primary.main, 0.14) : alpha("#081b1d", 0.86),
                borderColor: activeId === invoice.id ? alpha(theme.palette.primary.main, 0.52) : "divider",
                transition: "border-color 150ms ease, transform 150ms ease",
                "&:hover": {
                  borderColor: alpha(theme.palette.primary.main, 0.36),
                  transform: "translateY(-1px)"
                }
              }}
            >
              <CardActionArea onClick={() => onSelect(invoice.id)}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                      #{invoice.id.toString()}
                    </Typography>
                    <Chip
                      label={getStatusLabel(language, statusName(invoice.status))}
                      size="small"
                      sx={{ height: 24 }}
                      variant="outlined"
                    />
                  </Stack>
                  <Typography sx={{ fontWeight: 900, mt: 0.75 }} variant="body1">
                    {formatUsdc(invoice.amount)} USDC
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Typography color="text.secondary" noWrap variant="caption">
                      {invoice.metadataURI || t.empty}
                    </Typography>
                    <ChevronRightIcon size={16} />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))
        )}
      </Stack>
    </Panel>
  );
}

function InvoiceDetailPanel({
  activeStatus,
  canUseContract,
  disputeReason,
  invoice,
  language,
  onApproveDelivery,
  onApproveUsdc,
  onCancel,
  onDispute,
  onFund,
  onRelease,
  onResolveRefund,
  onResolveRelease,
  pending,
  setDisputeReason,
  t,
  userRole
}: {
  activeStatus: string;
  canUseContract: boolean;
  disputeReason: string;
  invoice?: Invoice;
  language: Language;
  onApproveDelivery: (invoice: Invoice) => void;
  onApproveUsdc: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
  onDispute: (invoice: Invoice) => void;
  onFund: (invoice: Invoice) => void;
  onRelease: (invoice: Invoice) => void;
  onResolveRefund: (invoice: Invoice) => void;
  onResolveRelease: (invoice: Invoice) => void;
  pending: boolean;
  setDisputeReason: (value: string) => void;
  t: typeof copy.en;
  userRole: string | null;
}) {
  if (!invoice) {
    return (
      <Panel title={t.noInvoice} eyebrow={t.selectedInvoice}>
        <EmptyState title={t.noInvoice} body={t.deployFirst} />
      </Panel>
    );
  }

  const status = statusName(invoice.status);
  const actionDisabled = !canUseContract || pending;
  const canCreateStage = status === "Created";
  const canFundStage = status === "Funded";
  const canApproveStage = status === "Approved";
  const canDisputeStage = status === "Funded" || status === "Approved";
  const canResolveStage = status === "Disputed";

  return (
    <Panel
      title={`#${invoice.id.toString()}`}
      eyebrow={t.selectedInvoice}
      description={`${formatUsdc(invoice.amount)} USDC · ${getStatusLabel(language, activeStatus)}`}
      trailing={<Chip color="primary" label={getStatusLabel(language, activeStatus)} size="small" variant="outlined" />}
    >
      <Box sx={{ mb: 2.5 }}>
        <Stepper activeStep={getActiveStep(invoice.status)} alternativeLabel sx={{ display: { xs: "none", sm: "flex" } }}>
          {[t.stepCreate, t.stepFund, t.stepSettle, t.stepResolve].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {userRole && (
        <Alert severity={userRole === "Observer" ? "info" : "success"} sx={{ mb: 2 }}>
          {t.roleReady}: <strong>{userRole}</strong>
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
          mb: 2
        }}
      >
        <InfoTile label={t.amount} value={`${formatUsdc(invoice.amount)} USDC`} strong />
        <InfoTile label={t.due} value={formatDate(invoice.dueAt)} />
        <InfoTile label={t.metadata} value={invoice.metadataURI || t.empty} />
        <AddressTile label={t.merchant} value={invoice.merchant} />
        <AddressTile label={t.payer} value={invoice.payer} />
        <AddressTile label={t.reviewer} value={invoice.reviewer} />
        <AddressTile label={t.resolver} value={invoice.resolver} />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
        {t.actions}
      </Typography>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}>
        <Button
          disabled={actionDisabled || !canCreateStage}
          onClick={() => onApproveUsdc(invoice)}
          startIcon={<CheckIcon size={18} />}
          variant="outlined"
        >
          {t.approveUsdc}
        </Button>
        <Button
          disabled={actionDisabled || !canCreateStage}
          onClick={() => onFund(invoice)}
          startIcon={<DollarIcon size={18} />}
          variant="contained"
        >
          {t.fund}
        </Button>
        <Button
          disabled={actionDisabled || !canFundStage}
          onClick={() => onApproveDelivery(invoice)}
          startIcon={<CheckIcon size={18} />}
          variant="outlined"
        >
          {t.approveDelivery}
        </Button>
        <Button
          disabled={actionDisabled || !canApproveStage}
          onClick={() => onRelease(invoice)}
          startIcon={<LinkIcon size={18} />}
          variant="contained"
        >
          {t.release}
        </Button>
        <Button
          color="warning"
          disabled={actionDisabled || !canCreateStage}
          onClick={() => onCancel(invoice)}
          startIcon={<CancelIcon size={18} />}
          variant="outlined"
        >
          {t.cancel}
        </Button>
      </Box>

      <Box
        sx={{
          bgcolor: alpha(theme.palette.error.main, 0.08),
          border: "1px solid",
          borderColor: alpha(theme.palette.error.main, 0.32),
          borderRadius: 2,
          mt: 2,
          p: 1.5
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
          <DisputeIcon size={17} />
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
            {t.openDispute}
          </Typography>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            fullWidth
            onChange={(event) => setDisputeReason(event.target.value)}
            placeholder={t.disputeReason}
            size="small"
            value={disputeReason}
          />
          <Button
            color="error"
            disabled={actionDisabled || !canDisputeStage}
            onClick={() => onDispute(invoice)}
            variant="contained"
          >
            {t.openDispute}
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
          <Button
            disabled={actionDisabled || !canResolveStage}
            onClick={() => onResolveRelease(invoice)}
            variant="outlined"
          >
            {t.resolveRelease}
          </Button>
          <Button
            disabled={actionDisabled || !canResolveStage}
            onClick={() => onResolveRefund(invoice)}
            variant="outlined"
          >
            {t.resolveRefund}
          </Button>
        </Stack>
      </Box>
    </Panel>
  );
}

function Panel({
  children,
  description,
  eyebrow,
  icon,
  title,
  trailing
}: {
  children: React.ReactNode;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        bgcolor: alpha("#0a1c1e", 0.88),
        borderColor: alpha(theme.palette.primary.main, 0.16),
        boxShadow: "0 18px 55px rgba(0, 0, 0, 0.28)",
        overflow: "hidden"
      }}
    >
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: "flex-start",
          borderBottom: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.13),
          justifyContent: "space-between",
          p: 1.75
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {eyebrow && (
            <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 900, textTransform: "uppercase" }}>
              {eyebrow}
            </Typography>
          )}
          <Typography noWrap variant="h6">
            {title}
          </Typography>
          {description && (
            <Typography color="text.secondary" variant="body2">
              {description}
            </Typography>
          )}
        </Box>
        {trailing || icon}
      </Stack>
      <Box sx={{ p: 1.75 }}>{children}</Box>
    </Paper>
  );
}

function MetricCard({ label, tone, value }: { label: string; tone: "teal" | "green" | "blue" | "amber" | "ink"; value: string }) {
  const colorMap = {
    amber: theme.palette.warning.main,
    blue: theme.palette.secondary.main,
    green: "#0a8f68",
    ink: "#f5fffd",
    teal: theme.palette.primary.main
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: 86,
        overflow: "hidden",
        p: 1.5,
        position: "relative",
        bgcolor: alpha("#0a1c1e", 0.86),
        borderColor: alpha(colorMap[tone], 0.28),
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.2)"
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(90deg, ${colorMap[tone]} 0%, ${alpha(colorMap[tone], 0.1)} 100%)`,
          height: 4,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0
        }}
      />
      <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 900 }}>
        {label}
      </Typography>
      <Typography sx={{ color: colorMap[tone], fontWeight: 950, mt: 0.5, overflowWrap: "anywhere" }} variant="h6">
        {value}
      </Typography>
    </Paper>
  );
}

function InfoTile({ label, strong, value }: { label: string; strong?: boolean; value: string }) {
  return (
    <Box
      sx={{
        bgcolor: alpha("#071719", 0.78),
        border: "1px solid",
        borderColor: alpha(theme.palette.primary.main, 0.14),
        borderRadius: 2,
        minHeight: 76,
        p: 1.25
      }}
    >
      <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 900 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: strong ? 950 : 800, overflowWrap: "anywhere" }} variant="body2">
        {value}
      </Typography>
    </Box>
  );
}

function AddressTile({ label, value }: { label: string; value: Address }) {
  const isEmpty = value === ZERO_ADDRESS;
  return (
    <Box
      sx={{
        bgcolor: alpha("#071719", 0.78),
        border: "1px solid",
        borderColor: alpha(theme.palette.primary.main, 0.14),
        borderRadius: 2,
        minHeight: 76,
        p: 1.25
      }}
    >
      <Typography color="text.secondary" variant="caption" sx={{ fontWeight: 900 }}>
        {label}
      </Typography>
      {isEmpty ? (
        <Typography sx={{ fontWeight: 800 }} variant="body2">
          None
        </Typography>
      ) : (
        <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
          <Typography sx={{ fontWeight: 850 }} variant="body2">
            {shortAddress(value)}
          </Typography>
          <IconButton href={explorerAddressUrl(value)} size="small" target="_blank">
            <LinkIcon size={13} />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <Box
      sx={{
        alignItems: "center",
        border: "1px dashed",
        borderColor: alpha(theme.palette.primary.main, 0.24),
        borderRadius: 2,
        color: "text.secondary",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        justifyContent: "center",
        minHeight: 180,
        p: 3,
        textAlign: "center"
      }}
    >
      <InfoIcon size={34} />
      <Typography color="text.primary" variant="subtitle1" sx={{ fontWeight: 900 }}>
        {title}
      </Typography>
      <Typography variant="body2">{body}</Typography>
    </Box>
  );
}

function FieLogo({ size }: { size: number }) {
  return (
    <Box
      aria-label={`${PRODUCT_NAME} logo`}
      component="svg"
      role="img"
      sx={{ flex: "0 0 auto", height: size, width: size }}
      viewBox="0 0 64 64"
    >
      <defs>
        <linearGradient id="fieLogoSurface" x1="10" x2="56" y1="8" y2="58">
          <stop offset="0" stopColor="#0d6f68" />
          <stop offset="0.56" stopColor="#2d6cdf" />
          <stop offset="1" stopColor="#d8a335" />
        </linearGradient>
        <linearGradient id="fieLogoPaper" x1="22" x2="48" y1="14" y2="48">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#edf7f5" />
        </linearGradient>
      </defs>
      <rect fill="url(#fieLogoSurface)" height="56" rx="12" width="56" x="4" y="4" />
      <path d="M16 20h8M14 30h10M18 40h6" stroke="#d7f7f2" strokeLinecap="round" strokeWidth="3.2" />
      <path
        d="M28 13h15l8 8v28a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4V17a4 4 0 0 1 4-4Z"
        fill="url(#fieLogoPaper)"
      />
      <path d="M43 13v8h8" fill="#cce8f7" />
      <path d="M32 26h12M32 34h14M32 42h8" stroke="#0b5f58" strokeLinecap="round" strokeWidth="3" />
      <path
        d="M25 49c8-1 15-5 22-13"
        fill="none"
        stroke="#d6a038"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <circle cx="45" cy="42" fill="#123f3d" r="8" />
      <path d="M41.5 41h7M45 37.5v9" stroke="#ffffff" strokeLinecap="round" strokeWidth="2.3" />
    </Box>
  );
}

function getActiveStep(status: number) {
  const name = statusName(status);
  if (name === "Created") return 0;
  if (name === "Funded") return 1;
  if (name === "Approved") return 2;
  if (name === "Disputed" || name === "Released" || name === "Refunded") return 3;
  return 0;
}

function getUserRole(account?: Address, invoice?: Invoice) {
  if (!account || !invoice) return null;
  const current = account.toLowerCase();
  if (current === invoice.merchant.toLowerCase()) return "Merchant";
  if (current === invoice.payer.toLowerCase()) return "Payer";
  if (current === invoice.reviewer.toLowerCase()) return "Reviewer";
  if (current === invoice.resolver.toLowerCase()) return "Resolver";
  return "Observer";
}

function panelDisplay(activePanel: PanelKey, panel: PanelKey) {
  return {
    xs: activePanel === panel ? "block" : "none",
    md: "block"
  };
}

export default App;
