import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Bar, Line, CartesianGrid, Legend } from 'recharts';
import { Home, PieChart as PieChartIcon, TrendingUp, Settings, LogOut, ArrowUpRight, Plus, ChevronLeft, DollarSign, Edit2, Trash2, Activity, RefreshCw, Wallet, BarChart2, Briefcase, Coins, Landmark, Cpu, ArrowDownRight, Clock, Receipt, CheckCircle, MinusCircle, FileText, User } from 'lucide-react';

// Mock data for overall dashboard performance
const globalPerformanceData = [
    { name: 'Ene', value: 100000 },
    { name: 'Feb', value: 105000 },
    { name: 'Mar', value: 108000 },
    { name: 'Abr', value: 115000 },
    { name: 'May', value: 112000 },
    { name: 'Jun', value: 125000 },
    { name: 'Jul', value: 132000 },
    { name: 'Ago', value: 145000 },
    { name: 'Sep', value: 155000 },
];

const COLORS = ['#8baf88', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

export default function Dashboard({ session }) {
    const isInitialLoad = useRef(true);
    const syncTimeoutRef = useRef(null);
    const isSyncingRef = useRef(false);
    const lastSyncedRef = useRef("");
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingAssetId, setEditingAssetId] = useState(null);

    // Cash Transactions Modal State
    const [isCashModalOpen, setIsCashModalOpen] = useState(false);
    const [cashModalTab, setCashModalTab] = useState('register'); // 'register' or 'history'
    const [editingTransactionId, setEditingTransactionId] = useState(null);
    const [newTransaction, setNewTransaction] = useState({
        type: 'deposit',
        amount: '',
        commission: '',
        date: new Date().toISOString().split('T')[0],
        comment: ''
    });

    // Sell Modal State
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [sellAssetData, setSellAssetData] = useState({
        assetId: null, ticker: '', name: '', buyPrice: 0, quantity: '', sellPrice: '', date: new Date().toISOString().split('T')[0]
    });

    // Edit Closed Trade Modal State
    const [isEditClosedTradeModalOpen, setIsEditClosedTradeModalOpen] = useState(false);
    const [editingClosedTradeData, setEditingClosedTradeData] = useState({
        id: null, ticker: '', sellQuantity: '', buyPrice: '', sellPrice: '', date: new Date().toISOString().split('T')[0]
    });

    // Edit Buy History Modal State
    const [isEditBuyHistoryModalOpen, setIsEditBuyHistoryModalOpen] = useState(false);
    const [editingBuyHistoryData, setEditingBuyHistoryData] = useState({
        id: null, ticker: '', name: '', quantity: '', buyPrice: '', date: new Date().toISOString().split('T')[0]
    });

    // Real-time prices from Yahoo Finance
    const [livePrices, setLivePrices] = useState({});
    const [isFetchingPrices, setIsFetchingPrices] = useState(false);

    // TRM State
    const [trm, setTrm] = useState(3700.03);

    // State for the new/edit asset form
    const [newAsset, setNewAsset] = useState({
        ticker: '', name: '', quantity: '1', buyPrice: '', date: new Date().toISOString().split('T')[0],
        phone: '', address: '', interestRate: '',
        email: '', plazo: '1', score: '700', riesgo: 'Bajo', tipoDoc: 'CC'
    });

    // State for the portfolios
    const [portfolios, setPortfolios] = useState([
        { id: 1, name: 'Acciones', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
        { id: 2, name: 'PrÃ©stamos', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
        { id: 3, name: 'Cryptos', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
        { id: 4, name: 'Renta Fija', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
        { id: 5, name: 'Trading Manual', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
        { id: 6, name: 'Trading AlgorÃ­tmico', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
    ]);

    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

    // --- SUPABASE: Load data on mount ---
    useEffect(() => {
        if (!session?.user?.id) return;
        const userId = session.user.id;

        async function loadData() {
            const { data: dbPortfolios } = await supabase
                .from('portfolios').select('*').eq('user_id', userId).order('id');

            if (!dbPortfolios || dbPortfolios.length === 0) {
                isInitialLoad.current = false;
                return;
            }

            const portfolioIds = dbPortfolios.map(p => p.id);
            const [assetsRes, transRes, tradesRes, buyHistRes] = await Promise.all([
                supabase.from('assets').select('*').in('portfolio_id', portfolioIds),
                supabase.from('transactions').select('*').in('portfolio_id', portfolioIds),
                supabase.from('closed_trades').select('*').in('portfolio_id', portfolioIds),
                supabase.from('buy_history').select('*').in('portfolio_id', portfolioIds),
            ]);

            const mapped = dbPortfolios.map(p => ({
                id: p.id,
                name: p.name,
                initialCapital: Number(p.initial_capital) || 0,
                assets: (assetsRes.data || []).filter(a => a.portfolio_id === p.id).map(a => ({
                    id: a.id, ticker: a.ticker, name: a.name, quantity: Number(a.quantity),
                    buyPrice: Number(a.buy_price), totalValue: Number(a.total_value), date: a.date,
                    phone: a.phone || '', address: a.address || '', email: a.email || '',
                    interestRate: Number(a.interest_rate) || 0, plazo: a.plazo || '1',
                    score: a.score || '700', riesgo: a.riesgo || 'Bajo', tipoDoc: a.tipo_doc || 'CC'
                })),
                transactions: (transRes.data || []).filter(t => t.portfolio_id === p.id).map(t => ({
                    id: t.id, type: t.type, amount: Number(t.amount), commission: Number(t.commission) || 0,
                    date: t.date, comment: t.comment || ''
                })),
                closedTrades: (tradesRes.data || []).filter(t => t.portfolio_id === p.id).map(t => ({
                    id: t.id, assetId: t.asset_id, ticker: t.ticker, name: t.name,
                    sellQuantity: Number(t.sell_quantity), sellPrice: Number(t.sell_price),
                    buyPrice: Number(t.buy_price), realizedPnL: Number(t.realized_pnl), date: t.date
                })),
                buyHistory: (buyHistRes.data || []).filter(b => b.portfolio_id === p.id).map(b => ({
                    id: b.id, ticker: b.ticker, name: b.name, quantity: Number(b.quantity),
                    buyPrice: Number(b.buy_price), date: b.date
                })),
            }));
            setPortfolios(mapped);
            isInitialLoad.current = false;
        }
        loadData();
    }, [session]);

    // --- SUPABASE: Save data when portfolios change ---
    useEffect(() => {
        if (isInitialLoad.current || !session?.user?.id) return;
        const userId = session.user.id;

        // Debounce sync to avoid spamming Supabase and causing race conditions
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        syncTimeoutRef.current = setTimeout(async () => {
            const currentDataStr = JSON.stringify(portfolios);
            if (currentDataStr === lastSyncedRef.current || isSyncingRef.current) return;

            isSyncingRef.current = true;
            try {
                for (const p of portfolios) {
                    await supabase.from('portfolios').update({ initial_capital: p.initialCapital }).eq('id', p.id);

                    // Sync assets
                    await supabase.from('assets').delete().eq('portfolio_id', p.id);
                    if (p.assets.length > 0) {
                        await supabase.from('assets').insert(p.assets.map(a => ({
                            portfolio_id: p.id, user_id: userId, ticker: a.ticker, name: a.name,
                            quantity: a.quantity, buy_price: a.buyPrice, total_value: a.totalValue,
                            date: a.date, phone: a.phone, address: a.address, email: a.email,
                            interest_rate: a.interestRate, plazo: a.plazo, score: a.score,
                            riesgo: a.riesgo, tipo_doc: a.tipoDoc
                        })));
                    }

                    // Sync transactions
                    await supabase.from('transactions').delete().eq('portfolio_id', p.id);
                    if (p.transactions.length > 0) {
                        await supabase.from('transactions').insert(p.transactions.map(t => ({
                            portfolio_id: p.id, user_id: userId, type: t.type, amount: t.amount,
                            commission: t.commission, date: t.date, comment: t.comment
                        })));
                    }

                    // Sync closed trades
                    await supabase.from('closed_trades').delete().eq('portfolio_id', p.id);
                    if (p.closedTrades.length > 0) {
                        await supabase.from('closed_trades').insert(p.closedTrades.map(t => ({
                            portfolio_id: p.id, user_id: userId, asset_id: t.assetId, ticker: t.ticker,
                            name: t.name, sell_quantity: t.sellQuantity, sell_price: t.sellPrice,
                            buy_price: t.buyPrice, realized_pnl: t.realizedPnL, date: t.date
                        })));
                    }

                    // Sync buy history
                    await supabase.from('buy_history').delete().eq('portfolio_id', p.id);
                    if (p.buyHistory.length > 0) {
                        await supabase.from('buy_history').insert(p.buyHistory.map(b => ({
                            portfolio_id: p.id, user_id: userId, ticker: b.ticker, name: b.name,
                            quantity: b.quantity, buy_price: b.buyPrice, date: b.date
                        })));
                    }
                }
                lastSyncedRef.current = currentDataStr;
            } catch (err) {
                console.error("Sync error:", err);
            } finally {
                isSyncingRef.current = false;
            }
        }, 1500);

        return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
    }, [portfolios, session]);

    // Global calcs
    const totalCapital = portfolios.reduce((sum, p) => {
        const isCop = p.name === 'Préstamos';
        const netTrans = (p.transactions || []).reduce((s, t) => {
            const amt = parseFloat(t.amount) || 0;
            const com = parseFloat(t.commission) || 0;
            return s + (t.type === 'deposit' ? amt - com : -amt - com);
        }, 0);
        const realizedPnL = (p.closedTrades || []).reduce((s, t) => s + (t.realizedPnL || 0), 0);
        const realizedPnLUSD = isCop ? realizedPnL / trm : realizedPnL;
        return sum + p.initialCapital + netTrans + realizedPnLUSD;
    }, 0);

    const allocationData = portfolios.map(p => {
        const isCop = p.name === 'Préstamos';
        const netTrans = (p.transactions || []).reduce((s, t) => {
            const amt = parseFloat(t.amount) || 0;
            const com = parseFloat(t.commission) || 0;
            return s + (t.type === 'deposit' ? amt - com : -amt - com);
        }, 0);
        const realizedPnL = (p.closedTrades || []).reduce((s, t) => s + (t.realizedPnL || 0), 0);
        const realizedPnLUSD = isCop ? realizedPnL / trm : realizedPnL;
        const pTotal = p.initialCapital + netTrans + realizedPnLUSD;
        return {
            name: p.name,
            value: totalCapital > 0 ? parseFloat(((pTotal / totalCapital) * 100).toFixed(1)) : 0
        };
    }).filter(p => p.value > 0);

    // Helper for Sidebar Icons
    const getPortfolioIcon = (id) => {
        switch (id) {
            case 1: return <TrendingUp size={18} />;
            case 2: return <Briefcase size={18} />;
            case 3: return <Coins size={18} />;
            case 4: return <Landmark size={18} />;
            case 5: return <Activity size={18} />;
            case 6: return <Cpu size={18} />;
            default: return <BarChart2 size={18} />;
        }
    };

    // --- Fetch Yahoo Finance Prices ---
    const fetchPrices = async () => {
        if (!selectedPortfolio || selectedPortfolio.assets.length === 0) return;
        setIsFetchingPrices(true);

        const newPrices = { ...livePrices };
        for (const asset of selectedPortfolio.assets) {
            if (!asset.ticker) continue;
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${asset.ticker}`;
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const data = await response.json();
                    const yfData = JSON.parse(data.contents);
                    if (yfData.chart && yfData.chart.result && yfData.chart.result.length > 0) {
                        newPrices[asset.ticker] = yfData.chart.result[0].meta.regularMarketPrice;
                    }
                }
            } catch (error) {
                console.error("Error fetching price for", asset.ticker, error);
            }
        }
        setLivePrices(newPrices);
        setIsFetchingPrices(false);
    };

    useEffect(() => {
        if (selectedPortfolioId) {
            fetchPrices();
        }
    }, [selectedPortfolioId, portfolios]);

    useEffect(() => {
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(res => res.json())
            .then(data => {
                if (data && data.rates && data.rates.COP) {
                    setTrm(data.rates.COP);
                }
            })
            .catch(err => console.error("Error fetching TRM", err));
    }, []);

    // --- Derived Calculations for Selected Portfolio ---
    const isCopPortfolio = selectedPortfolio?.name === 'Préstamos';
    const netTransactions = selectedPortfolio ? (selectedPortfolio.transactions || []).reduce((s, t) => {
        const amt = parseFloat(t.amount) || 0;
        const com = parseFloat(t.commission) || 0;
        return s + (t.type === 'deposit' ? amt - com : -amt - com);
    }, 0) : 0;
    const totalFundedUSD = selectedPortfolio ? selectedPortfolio.initialCapital + netTransactions : 0;
    const totalFundedBase = isCopPortfolio ? totalFundedUSD * trm : totalFundedUSD;

    const totalRealizedPnL = selectedPortfolio ? (selectedPortfolio.closedTrades || []).reduce((s, t) => s + (t.realizedPnL || 0), 0) : 0;
    const investedCapital = selectedPortfolio ? selectedPortfolio.assets.reduce((sum, a) => sum + a.totalValue, 0) : 0;

    // Available Capital = Initial + Net Deposits/Withdrawals + Realized Profit/Loss - Currently Invested
    const availableCapital = totalFundedBase + totalRealizedPnL - investedCapital;

    const currentPortfolioValue = selectedPortfolio ? selectedPortfolio.assets.reduce((sum, a) => {
        const currentPrice = livePrices[a.ticker] || a.buyPrice;
        return sum + (a.quantity * currentPrice);
    }, 0) : 0;

    const totalPortfolioMarketValue = availableCapital + currentPortfolioValue;
    const pnl = currentPortfolioValue - investedCapital;

    // ROI calculated against the total funding (deposits - withdrawals)
    const totalPortfolioROI = totalFundedBase > 0 ? ((totalPortfolioMarketValue - totalFundedBase) / totalFundedBase) * 100 : 0;

    const totalCommissionsUSD = selectedPortfolio ? (selectedPortfolio.transactions || []).reduce((s, t) => s + (parseFloat(t.commission) || 0), 0) : 0;
    const totalCommissions = isCopPortfolio ? totalCommissionsUSD * trm : totalCommissionsUSD;

    // --- Distribution Chart Data ---
    const portfolioDistribution = selectedPortfolio?.assets.map(a => {
        const currentPrice = livePrices[a.ticker] || a.buyPrice;
        return { name: a.ticker, value: a.quantity * currentPrice };
    }) || [];
    if (availableCapital > 0) {
        portfolioDistribution.push({ name: 'Efectivo', value: availableCapital });
    }

    // --- PrÃ©stamos Dynamic Chart Data ---
    let loansChartData = [];
    let loansDistributionData = [];
    let loansTotalExpected = 0;
    
    if (isCopPortfolio && selectedPortfolio) {
        const monthlyData = {};
        selectedPortfolio.assets.forEach(asset => {
            const dateObj = new Date(asset.date);
            const monthYear = isNaN(dateObj.getTime()) ? 'N/A' : dateObj.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
            if (!monthlyData[monthYear]) monthlyData[monthYear] = { name: monthYear, prestado: 0, interes: 0, total: 0 };
            const interesAmt = asset.buyPrice * ((asset.interestRate || 0) / 100);
            monthlyData[monthYear].prestado += asset.buyPrice / 1000000;
            monthlyData[monthYear].interes += interesAmt / 1000000;
            monthlyData[monthYear].total += (asset.buyPrice + interesAmt) / 1000000;
        });
        loansChartData = Object.values(monthlyData);
        if (loansChartData.length === 0) {
            loansChartData = [{ name: 'Sin Datos', prestado: 0, interes: 0, total: 0 }];
        }

        const totalPrestado = selectedPortfolio.assets.reduce((sum, a) => sum + a.buyPrice, 0);
        const totalInteres = selectedPortfolio.assets.reduce((sum, a) => sum + (a.buyPrice * ((a.interestRate || 0) / 100)), 0);
        loansTotalExpected = totalPrestado + totalInteres;
        
        loansDistributionData = [
            { name: 'Capital Prestado', value: totalPrestado, color: '#f59e0b' },
            { name: 'Intereses Esperados', value: totalInteres, color: '#10b981' },
            { name: 'Capital Disponible', value: availableCapital > 0 ? availableCapital : 0, color: '#3b82f6' }
        ].filter(item => item.value > 0);
        
        if (loansDistributionData.length === 0) loansDistributionData = [{ name: 'Sin Activos', value: 1, color: '#64748b' }];
    }

    // --- Mock Historical Data ---
    const mockPortfolioHistory = selectedPortfolio ? [
        { date: 'Trim 3 2024', value: totalFundedBase * 0.95 },
        { date: 'Trim 4 2024', value: totalFundedBase * 0.98 },
        { date: 'Trim 1 2025', value: totalFundedBase * 1.05 },
        { date: 'Trim 2 2025', value: totalFundedBase * 1.10 },
        { date: 'Trim 3 2025', value: totalFundedBase * 1.02 },
        { date: 'Trim 4 2025', value: totalFundedBase * 1.08 },
        { date: 'Trim 1 2026', value: totalFundedBase * 1.15 },
        { date: 'Actual', value: totalPortfolioMarketValue > 0 ? totalPortfolioMarketValue : totalFundedBase },
    ] : [];

    // --- Handlers ---
    const handleInitialCapitalChange = (portfolioId, value) => {
        const numValue = parseFloat(value) || 0;
        setPortfolios(prev => prev.map(p => p.id === portfolioId ? { ...p, initialCapital: numValue } : p));
    };

    // Cash Handlers
    const openNewCashTransaction = () => {
        setEditingTransactionId(null);
        setNewTransaction({ type: 'deposit', amount: '', commission: '', date: new Date().toISOString().split('T')[0], comment: '' });
        setCashModalTab('register');
        setIsCashModalOpen(true);
    };

    const openEditCashTransaction = (tx) => {
        setEditingTransactionId(tx.id);
        setNewTransaction({
            type: tx.type,
            amount: tx.amount.toString(),
            commission: tx.commission ? tx.commission.toString() : '',
            date: tx.date,
            comment: tx.comment || ''
        });
        setCashModalTab('register');
    };

    const handleTransactionSave = (e) => {
        e.preventDefault();
        const amount = parseFloat(newTransaction.amount);
        const commission = parseFloat(newTransaction.commission) || 0;

        if (amount > 0) {
            const transactionRecord = {
                id: editingTransactionId || Date.now(),
                type: newTransaction.type,
                amount,
                commission,
                date: newTransaction.date,
                comment: newTransaction.comment
            };

            setPortfolios(prev => prev.map(p => {
                if (p.id === selectedPortfolioId) {
                    if (editingTransactionId) {
                        return { ...p, transactions: p.transactions.map(t => t.id === editingTransactionId ? transactionRecord : t) };
                    } else {
                        return { ...p, transactions: [...(p.transactions || []), transactionRecord] };
                    }
                }
                return p;
            }));
            setNewTransaction({ type: 'deposit', amount: '', commission: '', date: new Date().toISOString().split('T')[0], comment: '' });
            setEditingTransactionId(null);
            setCashModalTab('history');
        }
    };

    const handleDeleteTransaction = (transactionId) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, transactions: p.transactions.filter(t => t.id !== transactionId) };
            }
            return p;
        }));
    };

    const handleClearTransactionHistory = () => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, transactions: [] };
            }
            return p;
        }));
    };

    // Sell Handlers
    const openSellModal = (asset) => {
        setSellAssetData({
            assetId: asset.id,
            ticker: asset.ticker,
            name: asset.name || '',
            buyPrice: asset.buyPrice,
            quantity: asset.quantity.toString(),
            sellPrice: (livePrices[asset.ticker] || asset.buyPrice).toString(),
            date: new Date().toISOString().split('T')[0]
        });
        setIsSellModalOpen(true);
    };

    const handleSellAsset = (e) => {
        e.preventDefault();
        const sellQty = parseFloat(sellAssetData.quantity);
        const sellPr = parseFloat(sellAssetData.sellPrice);

        if (sellQty <= 0 || sellPr <= 0) return;

        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                const asset = p.assets.find(a => a.id === sellAssetData.assetId);
                if (!asset) return p;

                const actualSellQty = Math.min(sellQty, asset.quantity);
                const realizedPnL = (sellPr - asset.buyPrice) * actualSellQty;

                const newTrade = {
                    id: Date.now(),
                    assetId: asset.id,
                    ticker: asset.ticker,
                    name: asset.name,
                    sellQuantity: actualSellQty,
                    sellPrice: sellPr,
                    buyPrice: asset.buyPrice,
                    realizedPnL: realizedPnL,
                    date: sellAssetData.date
                };

                let updatedAssets = p.assets.map(a => {
                    if (a.id === asset.id) {
                        const remQty = a.quantity - actualSellQty;
                        return {
                            ...a,
                            quantity: remQty,
                            totalValue: remQty * a.buyPrice
                        };
                    }
                    return a;
                });

                updatedAssets = updatedAssets.filter(a => a.quantity > 0); // Remove if sold out

                return {
                    ...p,
                    assets: updatedAssets,
                    closedTrades: [...(p.closedTrades || []), newTrade]
                };
            }
            return p;
        }));
        setIsSellModalOpen(false);
    };

    // Asset Buy/Edit Handlers
    const openNewAssetModal = () => {
        setEditingAssetId(null);
        setNewAsset({ ticker: '', name: '', quantity: '1', buyPrice: '', date: new Date().toISOString().split('T')[0], phone: '', address: '', interestRate: '', email: '', plazo: '1', score: '700', riesgo: 'Bajo', tipoDoc: 'CC' });
        setIsAssetModalOpen(true);
    };

    const openEditAssetModal = (asset) => {
        setEditingAssetId(asset.id);
        setNewAsset({
            ticker: asset.ticker,
            name: asset.name || '',
            quantity: asset.quantity.toString(),
            buyPrice: asset.buyPrice.toString(),
            date: asset.date,
            phone: asset.phone || '',
            address: asset.address || '',
            interestRate: asset.interestRate ? asset.interestRate.toString() : '',
            email: asset.email || '',
            plazo: asset.plazo || '1',
            score: asset.score || '700',
            riesgo: asset.riesgo || 'Bajo',
            tipoDoc: asset.tipoDoc || 'CC'
        });
        setIsAssetModalOpen(true);
    };

    const handleDeleteAsset = (assetId) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, assets: p.assets.filter(a => a.id !== assetId) };
            }
            return p;
        }));
    };

    const handleClearSalesHistory = () => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, closedTrades: [] };
            }
            return p;
        }));
    };

    const openEditClosedTrade = (trade) => {
        setEditingClosedTradeData({
            id: trade.id,
            ticker: trade.ticker,
            sellQuantity: trade.sellQuantity.toString(),
            buyPrice: trade.buyPrice.toString(),
            sellPrice: trade.sellPrice.toString(),
            date: trade.date
        });
        setIsEditClosedTradeModalOpen(true);
    };

    const handleSaveClosedTradeEdit = (e) => {
        e.preventDefault();
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return {
                    ...p,
                    closedTrades: p.closedTrades.map(t => {
                        if (t.id === editingClosedTradeData.id) {
                            const newQty = parseFloat(editingClosedTradeData.sellQuantity);
                            const newSell = parseFloat(editingClosedTradeData.sellPrice);
                            const newBuy = parseFloat(editingClosedTradeData.buyPrice);
                            return {
                                ...t,
                                ticker: editingClosedTradeData.ticker.toUpperCase(),
                                sellQuantity: newQty,
                                buyPrice: newBuy,
                                sellPrice: newSell,
                                date: editingClosedTradeData.date,
                                realizedPnL: (newSell - newBuy) * newQty
                            };
                        }
                        return t;
                    })
                };
            }
            return p;
        }));
        setIsEditClosedTradeModalOpen(false);
    };

    const handleDeleteClosedTrade = (id) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, closedTrades: p.closedTrades.filter(t => t.id !== id) };
            }
            return p;
        }));
    };

    const openEditBuyHistory = (buy) => {
        setEditingBuyHistoryData({
            id: buy.id,
            ticker: buy.ticker,
            name: buy.name || '',
            quantity: buy.quantity.toString(),
            buyPrice: buy.buyPrice.toString(),
            date: buy.date
        });
        setIsEditBuyHistoryModalOpen(true);
    };

    const handleSaveBuyHistoryEdit = (e) => {
        e.preventDefault();
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return {
                    ...p,
                    buyHistory: p.buyHistory.map(b => {
                        if (b.id === editingBuyHistoryData.id) {
                            return {
                                ...b,
                                ticker: editingBuyHistoryData.ticker.toUpperCase(),
                                name: editingBuyHistoryData.name || editingBuyHistoryData.ticker.toUpperCase(),
                                quantity: parseFloat(editingBuyHistoryData.quantity),
                                buyPrice: parseFloat(editingBuyHistoryData.buyPrice),
                                date: editingBuyHistoryData.date
                            };
                        }
                        return b;
                    })
                };
            }
            return p;
        }));
        setIsEditBuyHistoryModalOpen(false);
    };

    const handleDeleteBuyHistory = (id) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, buyHistory: p.buyHistory.filter(b => b.id !== id) };
            }
            return p;
        }));
    };

    const handleSaveAsset = (e) => {
        e.preventDefault();
        if (selectedPortfolio?.name === 'Préstamos') {
            if (!newAsset.ticker || !newAsset.buyPrice || !newAsset.name || !newAsset.date) {
                alert('Por favor completa todos los campos obligatorios (*)');
                return;
            }
        } else {
            if (!newAsset.ticker || !newAsset.quantity || !newAsset.buyPrice) return;
        }

        const assetRecord = {
            id: editingAssetId || Date.now(),
            ticker: selectedPortfolio?.name === 'Préstamos' ? newAsset.ticker : newAsset.ticker.toUpperCase(),
            name: newAsset.name || (selectedPortfolio?.name === 'Préstamos' ? newAsset.ticker : newAsset.ticker.toUpperCase()),
            quantity: selectedPortfolio?.name === 'Préstamos' ? 1 : parseFloat(newAsset.quantity),
            buyPrice: parseFloat(newAsset.buyPrice),
            totalValue: selectedPortfolio?.name === 'Préstamos' ? parseFloat(newAsset.buyPrice) : parseFloat(newAsset.quantity) * parseFloat(newAsset.buyPrice),
            date: newAsset.date,
            phone: newAsset.phone || '',
            address: newAsset.address || '',
            interestRate: parseFloat(newAsset.interestRate) || 0,
            email: newAsset.email || '',
            plazo: newAsset.plazo || '1',
            score: newAsset.score || '700',
            riesgo: newAsset.riesgo || 'Bajo',
            tipoDoc: newAsset.tipoDoc || 'CC'
        };

        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                if (editingAssetId) {
                    return { ...p, assets: p.assets.map(a => a.id === editingAssetId ? assetRecord : a) };
                } else {
                    const newBuyHistoryRecord = { ...assetRecord, id: Date.now() + Math.random() };
                    const newBuyHistory = [...(p.buyHistory || []), newBuyHistoryRecord];

                    const existingAssetIndex = p.assets.findIndex(a => a.ticker === assetRecord.ticker);
                    if (existingAssetIndex >= 0) {
                        const existingAsset = p.assets[existingAssetIndex];
                        const totalQty = existingAsset.quantity + assetRecord.quantity;
                        const avgPrice = ((existingAsset.quantity * existingAsset.buyPrice) + (assetRecord.quantity * assetRecord.buyPrice)) / totalQty;

                        const updatedAssets = [...p.assets];
                        updatedAssets[existingAssetIndex] = {
                            ...existingAsset,
                            quantity: totalQty,
                            buyPrice: avgPrice,
                            totalValue: totalQty * avgPrice,
                            date: assetRecord.date
                        };
                        return { ...p, assets: updatedAssets, buyHistory: newBuyHistory };
                    } else {
                        return { ...p, assets: [...p.assets, assetRecord], buyHistory: newBuyHistory };
                    }
                }
            }
            return p;
        }));

        setIsAssetModalOpen(false);
    };

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                    <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="50" width="15" height="40" fill="var(--accent-gold)" />
                        <rect x="35" y="30" width="15" height="60" fill="var(--accent-gold)" />
                        <rect x="60" y="10" width="15" height="80" fill="var(--accent-gold)" />
                        <path d="M 0 90 Q 50 30 100 20" stroke="var(--bg-dark)" strokeWidth="6" fill="none" />
                        <path d="M 0 90 Q 50 30 100 20" stroke="var(--accent-gold)" strokeWidth="2" fill="none" />
                    </svg>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '1px', color: 'var(--text-primary)' }}>
                        FINTED <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>DASH</span>
                    </span>
                </div>

                <nav className="sidebar-nav">

                    <button
                        onClick={() => { setActiveTab('overview'); setSelectedPortfolioId(null); }}
                        className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`}
                        style={{ width: '100%', textAlign: 'left', background: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.05)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}
                    >
                        <Home size={20} /> Resumen General
                    </button>

                    <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', paddingLeft: '1rem' }}>
                        Tus Portafolios
                    </div>

                    {portfolios.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { setActiveTab('portfolios'); setSelectedPortfolioId(p.id); }}
                            className={`sidebar-link ${(activeTab === 'portfolios' && selectedPortfolioId === p.id) ? 'active' : ''}`}
                            style={{
                                width: '100%', textAlign: 'left',
                                background: (activeTab === 'portfolios' && selectedPortfolioId === p.id) ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem',
                                color: (activeTab === 'portfolios' && selectedPortfolioId === p.id) ? 'var(--accent-gold)' : 'var(--text-primary)'
                            }}
                        >
                            {getPortfolioIcon(p.id)} {p.name}
                        </button>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <button onClick={async () => await supabase.auth.signOut()} className="sidebar-link" style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem' }}>
                        <LogOut size={20} /> Cerrar SesiÃ³n
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="dashboard-content" style={{ position: 'relative' }}>
                <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem' }}>Bienvenido, Inversor</h1>
                        <p>Panel de administraciÃ³n de fondos</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>TRM Actual</div>
                            <div style={{ fontWeight: 600, color: '#10b981' }}>${trm.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ID Inversor</div>
                            <div style={{ fontWeight: 600 }}>#FNT-8492</div>
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#121c26', fontWeight: 'bold' }}>
                            IN
                        </div>
                    </div>
                </header>



                {/* --- PESTAÃ‘A: RESUMEN GENERAL --- */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in">
                        {/* Stats Grid */}
                        <div className="grid-3" style={{ marginBottom: '2rem' }}>
                            <div className="glass-panel stat-card">
                                <div className="stat-label">Capital Total Fondeado</div>
                                <div className="stat-value">${totalCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                <div className="trend-up"><ArrowUpRight size={16} /> Base + DepÃ³sitos</div>
                            </div>
                            <div className="glass-panel stat-card">
                                <div className="stat-label">Rendimiento Proyectado</div>
                                <div className="stat-value">+${(totalCapital * 0.068).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                <div className="trend-up"><ArrowUpRight size={16} /> +6.8% este mes</div>
                            </div>
                            <div className="glass-panel stat-card">
                                <div className="stat-label">Portafolios Activos</div>
                                <div className="stat-value">{portfolios.filter(p => p.initialCapital > 0 || (p.transactions && p.transactions.length > 0)).length} / 6</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nivel de diversificaciÃ³n</div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid-2">
                            <div className="glass-panel">
                                <h3 style={{ marginBottom: '1rem' }}>Crecimiento del Capital</h3>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={globalPerformanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                                itemStyle={{ color: 'var(--accent-gold)' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="var(--accent-gold)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="glass-panel">
                                <h3 style={{ marginBottom: '1rem' }}>DistribuciÃ³n de Activos</h3>
                                {totalCapital > 0 ? (
                                    <div className="chart-container" style={{ display: 'flex', alignItems: 'center' }}>
                                        <ResponsiveContainer width="60%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={allocationData}
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {allocationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {allocationData.map((item, index) => (
                                                <div key={item.name} className="flex items-center gap-4" style={{ fontSize: '0.875rem' }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[index] }}></div>
                                                    <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                                    <span style={{ marginLeft: 'auto', fontWeight: 600 }}>{item.value}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-secondary">
                                        No hay capital registrado para mostrar la distribuciÃ³n.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PESTAÃ‘A: REPORTE DE PORTAFOLIOS (GESTIÃ“N DETALLADA) --- */}
                {activeTab === 'portfolios' && selectedPortfolioId && selectedPortfolioId !== 2 && (
                    <div className="animate-slide-up">
                        <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                            <div className="flex items-center gap-4">
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--bg-surface-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)' }}>
                                    {getPortfolioIcon(selectedPortfolio.id)}
                                </div>
                                <h2>Reporte: Carteras / {selectedPortfolio.name}</h2>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={openNewCashTransaction} className="btn btn-outline flex items-center gap-2">
                                    <DollarSign size={16} /> Movimientos Efectivo
                                </button>
                                <button onClick={fetchPrices} className="btn btn-primary flex items-center gap-2" disabled={isFetchingPrices}>
                                    <RefreshCw size={16} className={isFetchingPrices ? "animate-spin" : ""} />
                                    {isFetchingPrices ? "Actualizando..." : "Mercado en Vivo"}
                                </button>
                            </div>
                        </div>

                        {/* Panel de Control (Indicadores Clave) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="glass-panel" style={{ padding: '1rem', borderTop: '2px solid var(--text-primary)' }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Efectivo Disponible</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${availableCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Fondeado (Base + Movs)</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${totalFundedBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Valor Final (Mercado+Cash)</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${totalPortfolioMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1rem', borderBottom: `2px solid ${totalPortfolioROI >= 0 ? '#10b981' : '#ef4444'}` }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Rentabilidad (TIR/ROI)</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalPortfolioROI >= 0 ? '#10b981' : '#ef4444' }}>
                                    {totalPortfolioROI >= 0 ? '+' : ''}{totalPortfolioROI.toFixed(2)}%
                                </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>PnL Activos Abiertos</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: pnl >= 0 ? '#10b981' : '#ef4444' }}>
                                    {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Comisiones Pagadas</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                                    -${totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        {/* GrÃ¡ficos */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                            {/* EvoluciÃ³n HistÃ³rica */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 600 }}>EvoluciÃ³n histÃ³rica de los activos (EstÃ¡ndar)</h3>
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={mockPortfolioHistory} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--accent-gold)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--accent-gold)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`} />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                                            <Area type="stepAfter" dataKey="value" stroke="var(--accent-gold)" strokeWidth={2} fillOpacity={1} fill="url(#historyGradient)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* DistribuciÃ³n de Activos */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 600 }}>DistribuciÃ³n de cartera</h3>
                                <div style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                                    {portfolioDistribution.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height="60%">
                                                <PieChart>
                                                    <Pie data={portfolioDistribution} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                                        {portfolioDistribution.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} contentStyle={{ backgroundColor: 'var(--bg-dark)', border: 'none', borderRadius: '4px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div style={{ flex: 1, overflowY: 'auto', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {portfolioDistribution.map((item, index) => (
                                                    <div key={item.name} className="flex justify-between items-center" style={{ fontSize: '0.75rem' }}>
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ width: '10px', height: '10px', backgroundColor: COLORS[index % COLORS.length], borderRadius: '2px' }}></div>
                                                            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                                                        </div>
                                                        <span style={{ fontWeight: 600 }}>{((item.value / totalPortfolioMarketValue) * 100).toFixed(2)}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-secondary" style={{ fontSize: '0.875rem' }}>
                                            Sin activos ni efectivo para distribuir.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Balance de Activos (Tabla Detallada) */}
                        <div className="glass-panel" style={{ marginBottom: '2rem' }}>
                            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Operaciones Abiertas (Posiciones)</h3>
                                <button className="btn btn-primary flex items-center gap-2" onClick={openNewAssetModal} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                                    <Plus size={16} /> Registrar Compra
                                </button>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px', fontSize: '0.875rem' }}>
                                    <thead>
                                        {selectedPortfolio?.name === 'Préstamos' ? (
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Nombre / Cliente</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>CÃ©dula / ID</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>TelÃ©fono</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>Monto Prestado</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>InterÃ©s Mensual</th>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                                            </tr>
                                        ) : (
                                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>NÂº tÃ­tulos</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Nombre</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>SÃ­mbolo</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>Precio Compra</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>Precio Mercado</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>Valor Actual</th>
                                                <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>Ganancia Abierta</th>
                                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {selectedPortfolio.assets.map(asset => {
                                            const currentPrice = livePrices[asset.ticker] || asset.buyPrice;
                                            const currentValue = asset.quantity * currentPrice;
                                            const assetPnlAmount = currentValue - asset.totalValue;
                                            const assetPnlPercent = (assetPnlAmount / asset.totalValue) * 100;
                                            const isProfit = assetPnlAmount >= 0;

                                            if (selectedPortfolio?.name === 'Préstamos') {
                                                return (
                                                    <tr key={asset.id} className="hover-bg" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                                                        <td style={{ padding: '1rem', color: 'var(--accent-gold)' }}>{asset.name}</td>
                                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{asset.ticker}</td>
                                                        <td style={{ padding: '1rem' }}>{asset.phone || '-'}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>${asset.buyPrice.toLocaleString('es-CO')}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                                                            {asset.interestRate ? `${asset.interestRate}% ($${(asset.buyPrice * (asset.interestRate / 100)).toLocaleString('es-CO')})` : '-'}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                                                <button onClick={() => openSellModal(asset)} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginRight: '0.25rem' }} title="Liquidar PrÃ©stamo">
                                                                    LIQUIDAR
                                                                </button>
                                                                <button onClick={() => openEditAssetModal(asset)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} title="Editar">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => handleDeleteAsset(asset.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} title="Eliminar">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={asset.id} className="hover-bg" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '1rem' }}>{asset.quantity}</td>
                                                    <td style={{ padding: '1rem', color: 'var(--accent-gold)' }}>{asset.name || asset.ticker}</td>
                                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{asset.ticker}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>${asset.buyPrice.toLocaleString()}</td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                                                        ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', color: isProfit ? '#10b981' : '#ef4444' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <span style={{ fontWeight: 600 }}>{isProfit ? 'â–²' : 'â–¼'} ${Math.abs(assetPnlAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                            <span style={{ fontSize: '0.75rem' }}>({isProfit ? '+' : ''}{assetPnlPercent.toFixed(2)}%)</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                                            <button onClick={() => openSellModal(asset)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginRight: '0.25rem' }} title="Vender Activo">
                                                                VENDER
                                                            </button>
                                                            <button onClick={() => openEditAssetModal(asset)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} title="Editar">
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button onClick={() => handleDeleteAsset(asset.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} title="Eliminar">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {selectedPortfolio.assets.length === 0 && (
                                            <tr>
                                                <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay operaciones abiertas. Registra una compra.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Seccion inferior: Historiales lado a lado */}
                        <div className="grid-2" style={{ marginTop: '2rem', alignItems: 'start' }}>
                            {/* Operaciones Cerradas (Historial de Ventas) */}
                            {selectedPortfolio.closedTrades && selectedPortfolio.closedTrades.length > 0 ? (
                                <div className="glass-panel" style={{ width: '100%' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Operaciones Cerradas</h3>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ventas realizadas (se suma al Efectivo).</p>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px', fontSize: '0.875rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Fecha Venta</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Activo</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Cant.</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>P. Compra</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>P. Venta</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>PnL</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPortfolio.closedTrades.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(trade => {
                                                    const isProfit = trade.realizedPnL >= 0;
                                                    return (
                                                        <tr key={trade.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                            <td style={{ padding: '1rem' }}>{trade.date}</td>
                                                            <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{trade.ticker}</td>
                                                            <td style={{ padding: '1rem' }}>{trade.sellQuantity}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>${trade.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>${trade.sellPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: isProfit ? '#10b981' : '#ef4444' }}>
                                                                {isProfit ? '+' : '-'}${Math.abs(trade.realizedPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                                    <button onClick={() => openEditClosedTrade(trade)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} title="Editar">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteClosedTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Eliminar">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : <div></div>}

                            {/* Historial de Compras Raw (Buy History) */}
                            {selectedPortfolio.buyHistory && selectedPortfolio.buyHistory.length > 0 ? (
                                <div className="glass-panel" style={{ width: '100%' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Historial de Compras</h3>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Registro de cada operaciÃ³n de compra realizada.</p>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px', fontSize: '0.875rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Fecha Compra</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Activo</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>Cantidad</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>P. Compra</th>
                                                    <th style={{ padding: '0.75rem 1rem', fontWeight: 500, textAlign: 'right' }}>Total Invertido</th>
                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPortfolio.buyHistory.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(buy => (
                                                    <tr key={buy.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <td style={{ padding: '1rem' }}>{buy.date}</td>
                                                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{buy.ticker}</td>
                                                        <td style={{ padding: '1rem' }}>{buy.quantity}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>${buy.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                                                            ${(buy.quantity * buy.buyPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                                <button onClick={() => openEditBuyHistory(buy)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} title="Editar">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => handleDeleteBuyHistory(buy.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }} title="Eliminar">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : <div></div>}
                        </div>
                    </div>
                )}

                {/* --- PESTAÃ‘A: DASHBOARD PRÃ‰STAMOS (CUSTOM UI) --- */}
                {activeTab === 'portfolios' && selectedPortfolio?.name === 'Préstamos' && (
                    <div className="animate-slide-up" style={{ paddingBottom: '2rem' }}>
                        {/* Top Cards Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '2px solid #10b981' }}>
                                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                        <ArrowUpRight size={16} />
                                    </div>
                                    <span style={{ fontWeight: 600 }}>Valor a cobrar</span>
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem', color: '#f8fafc' }}>
                                    ${loansTotalExpected.toLocaleString('es-CO')}
                                </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '2px solid #3b82f6' }}>
                                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <ArrowDownRight size={16} />
                                    </div>
                                    <span style={{ fontWeight: 600 }}>Valor a pagar</span>
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem', color: '#f8fafc' }}>
                                    ${totalCommissions.toLocaleString('es-CO')}
                                </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <DollarSign size={16} />
                                    </div>
                                    <span style={{ fontWeight: 600 }}>Balance</span>
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '1rem', color: '#f8fafc' }}>
                                    ${totalPortfolioMarketValue.toLocaleString('es-CO')}
                                </div>
                            </div>
                            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139, 175, 136, 0.3)' }}>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Cupo disponible preaprobado</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                                        ${availableCapital.toLocaleString('es-CO')}
                                    </div>
                                </div>
                                <button onClick={openNewAssetModal} style={{ background: '#8baf88', color: '#121c26', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }} className="hover:scale-105">
                                    Solicitar
                                </button>
                            </div>
                        </div>

                        {/* Success Banner */}
                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            <CheckCircle size={18} color="#10b981" />
                            <span>Tus niveles de facturaciÃ³n son saludables y tendrÃ¡s un saldo neto de <strong>${(availableCapital * 0.05).toLocaleString('es-CO')}</strong> la siguiente semana (Ene-w5).</span>
                        </div>

                        {/* Middle Section: Chart & Distribution */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            {/* Chart */}
                            <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                                <div style={{ height: '350px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={loansChartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                            <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}M`} dx={-10} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                                            <Bar dataKey="prestado" name="Capital Prestado" fill="#293d5c" radius={[4, 4, 0, 0]} barSize={18} />
                                            <Bar dataKey="interes" name="Intereses" fill="#8baf88" radius={[4, 4, 0, 0]} barSize={18} />
                                            <Line type="monotone" dataKey="total" name="Total" stroke="#f8fafc" strokeWidth={3} dot={{ fill: '#f8fafc', r: 5, strokeWidth: 0 }} activeDot={{ r: 7 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Distribution */}
                            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>DistribuciÃ³n</h3>
                                    <select style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}>
                                        <option>Ãšlt. mes</option>
                                    </select>
                                </div>
                                <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={loansDistributionData} innerRadius={70} outerRadius={85} dataKey="value" stroke="none" paddingAngle={3}>
                                                {loansDistributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                                            ${(loansDistributionData.reduce((s, i) => s + (i.name !== 'Sin Activos' ? i.value : 0), 0) / 1000000).toFixed(1)}M
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total</div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                                    {loansDistributionData.map(item => (
                                        <div key={item.name} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: item.color }}></div>
                                                <span style={{color:'var(--text-secondary)'}}>{item.name}</span>
                                            </div>
                                            <span style={{fontWeight: 600}}>${item.value.toLocaleString('es-CO')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Table & Top Clients */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                            {/* Table */}
                            <div>
                                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Cuentas por cobrar</h3>
                                    <div className="flex items-center gap-3">
                                        <select style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none' }}>
                                            <option>Febrero 1 al 8</option>
                                        </select>
                                        <button style={{ background: '#8baf88', color: '#121c26', border: 'none', padding: '0.4rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Ver todas</button>
                                    </div>
                                </div>
                                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)' }}>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Proveedor</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Valor</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Estado</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>Vence</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPortfolio.assets.slice(0, 5).map((asset, i) => (
                                                <tr key={asset.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div className="flex items-center gap-3">
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc' }}>
                                                                {asset.name.charAt(0)}
                                                            </div>
                                                            <span style={{ fontWeight: 500 }}>{asset.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#f8fafc' }}>${asset.buyPrice.toLocaleString('es-CO')}</td>
                                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}><MinusCircle size={16} /></td>
                                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{asset.date}</td>
                                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>#{asset.ticker}</td>
                                                </tr>
                                            ))}
                                            {selectedPortfolio.assets.length === 0 && (
                                                <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay cuentas por cobrar</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Top Clients */}
                            <div>
                                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Principales clientes</h3>
                                    <select style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}>
                                        <option>Clientes</option>
                                    </select>
                                </div>
                                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {selectedPortfolio.assets.slice(0, 4).map((asset, i) => (
                                        <div key={asset.id} className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem', color: '#f8fafc' }}>
                                                    {asset.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>{asset.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {asset.ticker}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
                                                ${asset.buyPrice.toLocaleString('es-CO')}
                                            </div>
                                        </div>
                                    ))}
                                    {selectedPortfolio.assets.length === 0 && (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>No hay clientes registrados</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Historial y Movimientos de Efectivo */}
                {isCashModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                        <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '600px', background: 'var(--bg-surface)', padding: '2rem' }}>
                            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                                <h2>Movimientos de Efectivo</h2>
                                <button onClick={() => setIsCashModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
                            </div>

                            {/* Modal Tabs */}
                            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                                <button
                                    onClick={() => setCashModalTab('register')}
                                    style={{
                                        background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 500,
                                        color: cashModalTab === 'register' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                        borderBottom: cashModalTab === 'register' ? '2px solid var(--accent-gold)' : '2px solid transparent'
                                    }}
                                >
                                    {editingTransactionId ? 'Editar Movimiento' : 'Registrar Movimiento'}
                                </button>
                                <button
                                    onClick={() => { setCashModalTab('history'); setEditingTransactionId(null); }}
                                    style={{
                                        background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 500,
                                        color: cashModalTab === 'history' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                        borderBottom: cashModalTab === 'history' ? '2px solid var(--accent-gold)' : '2px solid transparent'
                                    }}
                                >
                                    Historial
                                </button>
                            </div>

                            {/* Tab 1: Registrar Movimiento */}
                            {cashModalTab === 'register' && (
                                <form onSubmit={handleTransactionSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tipo de Movimiento</label>
                                            <select
                                                value={newTransaction.type}
                                                onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                            >
                                                <option value="deposit">DepÃ³sito</option>
                                                <option value="withdrawal">Retiro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fecha</label>
                                            <input
                                                type="date" required
                                                value={newTransaction.date}
                                                onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid-2" style={{ gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Monto Bruto (USD)</label>
                                            <input
                                                type="number" step="0.01" required min="0.01"
                                                value={newTransaction.amount}
                                                onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                                placeholder="Ej. 5000"
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1.1rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Comisiones (USD)</label>
                                            <input
                                                type="number" step="0.01" min="0"
                                                value={newTransaction.commission}
                                                onChange={e => setNewTransaction({ ...newTransaction, commission: e.target.value })}
                                                placeholder="Ej. 15.50"
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1.1rem' }}
                                            />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>Gastos de transferencia/broker</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Comentarios / Referencia</label>
                                        <input
                                            type="text"
                                            value={newTransaction.comment}
                                            onChange={e => setNewTransaction({ ...newTransaction, comment: e.target.value })}
                                            placeholder="Ej. Aporte de capital mensual..."
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                        />
                                    </div>

                                    {newTransaction.amount && (
                                        <div style={{ padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem', borderLeft: `3px solid ${newTransaction.type === 'deposit' ? '#10b981' : '#ef4444'}` }}>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {newTransaction.type === 'deposit' ? 'Efectivo neto que ingresa al fondo:' : 'Efectivo total que se descuenta del fondo:'}
                                            </div>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: newTransaction.type === 'deposit' ? '#10b981' : '#ef4444' }}>
                                                {newTransaction.type === 'deposit' ? '+' : '-'}$
                                                {newTransaction.type === 'deposit'
                                                    ? (parseFloat(newTransaction.amount) - (parseFloat(newTransaction.commission) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                    : (parseFloat(newTransaction.amount) + (parseFloat(newTransaction.commission) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-4" style={{ marginTop: '0.5rem' }}>
                                        <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsCashModalOpen(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                            {editingTransactionId ? 'Guardar Cambios' : (newTransaction.type === 'deposit' ? 'Confirmar DepÃ³sito' : 'Confirmar Retiro')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Tab 2: Historial */}
                            {cashModalTab === 'history' && (
                                <div>
                                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                        {(!selectedPortfolio?.transactions || selectedPortfolio?.transactions.length === 0) ? (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                <Clock size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                                <p>No hay depÃ³sitos ni retiros registrados aÃºn.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-end" style={{ marginBottom: '1rem' }}>
                                                    <button onClick={handleClearTransactionHistory} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                        <Trash2 size={16} /> Vaciar Todo El Historial
                                                    </button>
                                                </div>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                            <th style={{ padding: '0.75rem', fontWeight: 500 }}>Fecha</th>
                                                            <th style={{ padding: '0.75rem', fontWeight: 500 }}>Tipo</th>
                                                            <th style={{ padding: '0.75rem', fontWeight: 500 }}>Comentario</th>
                                                            <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Monto Bruto</th>
                                                            <th style={{ padding: '0.75rem', fontWeight: 500, textAlign: 'right' }}>ComisiÃ³n</th>
                                                            <th style={{ padding: '0.75rem' }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedPortfolio?.transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => (
                                                            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                <td style={{ padding: '0.75rem' }}>{tx.date}</td>
                                                                <td style={{ padding: '0.75rem' }}>
                                                                    <span style={{
                                                                        padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600,
                                                                        background: tx.type === 'deposit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                        color: tx.type === 'deposit' ? '#10b981' : '#ef4444'
                                                                    }}>
                                                                        {tx.type === 'deposit' ? 'DepÃ³sito' : 'Retiro'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{tx.comment || '-'}</td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                                                                    ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                                                    ${(tx.commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </td>
                                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                                        <button onClick={() => openEditCashTransaction(tx)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Editar">
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button onClick={() => handleDeleteTransaction(tx.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Eliminar">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ marginTop: '1rem', padding: '1rem', borderTop: '2px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                                        <span>Fondeado Total (Base + Movs):</span>
                                        <span>${totalFundedBase.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Modal: Vender Activo */}
                {isSellModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                        <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-surface)' }}>
                            <h2 style={{ marginBottom: '1.5rem', color: '#ef4444' }}>
                                Vender PosiciÃ³n: {sellAssetData.ticker}
                            </h2>

                            <form onSubmit={handleSellAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cantidad a vender (Max: {selectedPortfolio.assets.find(a => a.id === sellAssetData.assetId)?.quantity})</label>
                                    <input
                                        type="number" step="0.0001" required max={selectedPortfolio.assets.find(a => a.id === sellAssetData.assetId)?.quantity}
                                        value={sellAssetData.quantity} onChange={e => setSellAssetData({ ...sellAssetData, quantity: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Precio de Venta (USD)</label>
                                    <input
                                        type="number" step="0.01" required
                                        value={sellAssetData.sellPrice} onChange={e => setSellAssetData({ ...sellAssetData, sellPrice: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fecha de OperaciÃ³n</label>
                                    <input
                                        type="date" required
                                        value={sellAssetData.date} onChange={e => setSellAssetData({ ...sellAssetData, date: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                    />
                                </div>

                                {sellAssetData.quantity && sellAssetData.sellPrice && (
                                    <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Retorno al efectivo:</span>
                                            <strong style={{ color: 'white' }}>${(parseFloat(sellAssetData.quantity) * parseFloat(sellAssetData.sellPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>PnL Estimado:</span>
                                            <strong style={{ color: (parseFloat(sellAssetData.sellPrice) - sellAssetData.buyPrice) >= 0 ? '#10b981' : '#ef4444' }}>
                                                ${((parseFloat(sellAssetData.sellPrice) - sellAssetData.buyPrice) * parseFloat(sellAssetData.quantity)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </strong>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsSellModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn" style={{ flex: 1, background: '#ef4444', color: 'white' }}>
                                        Confirmar Venta
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Editar Venta (OperaciÃ³n Cerrada) */}
                {isEditClosedTradeModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                        <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-surface)' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>
                                Editar Venta: {editingClosedTradeData.ticker}
                            </h2>

                            <form onSubmit={handleSaveClosedTradeEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cantidad Vendida</label>
                                    <input
                                        type="number" step="0.0001" required
                                        value={editingClosedTradeData.sellQuantity} onChange={e => setEditingClosedTradeData({ ...editingClosedTradeData, sellQuantity: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                    />
                                </div>

                                <div className="grid-2" style={{ gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Precio Compra</label>
                                        <input
                                            type="number" step="0.01" required
                                            value={editingClosedTradeData.buyPrice} onChange={e => setEditingClosedTradeData({ ...editingClosedTradeData, buyPrice: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Precio Venta</label>
                                        <input
                                            type="number" step="0.01" required
                                            value={editingClosedTradeData.sellPrice} onChange={e => setEditingClosedTradeData({ ...editingClosedTradeData, sellPrice: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fecha de OperaciÃ³n</label>
                                    <input
                                        type="date" required
                                        value={editingClosedTradeData.date} onChange={e => setEditingClosedTradeData({ ...editingClosedTradeData, date: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                    />
                                </div>

                                <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditClosedTradeModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Editar Historial de Compra */}
                {isEditBuyHistoryModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                        <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-surface)' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>
                                Editar Registro de Compra
                            </h2>

                            <form onSubmit={handleSaveBuyHistoryEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>SÃ­mbolo (Ticker)</label>
                                    <input
                                        type="text" required
                                        value={editingBuyHistoryData.ticker} onChange={e => setEditingBuyHistoryData({ ...editingBuyHistoryData, ticker: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                    />
                                </div>
                                <div className="grid-2" style={{ gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Cantidad</label>
                                        <input
                                            type="number" step="0.0001" required
                                            value={editingBuyHistoryData.quantity} onChange={e => setEditingBuyHistoryData({ ...editingBuyHistoryData, quantity: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Precio Compra</label>
                                        <input
                                            type="number" step="0.01" required
                                            value={editingBuyHistoryData.buyPrice} onChange={e => setEditingBuyHistoryData({ ...editingBuyHistoryData, buyPrice: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fecha de OperaciÃ³n</label>
                                    <input
                                        type="date" required
                                        value={editingBuyHistoryData.date} onChange={e => setEditingBuyHistoryData({ ...editingBuyHistoryData, date: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                    />
                                </div>

                                <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditBuyHistoryModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Comprar/Editar AcciÃ³n/Activo */}
                {isAssetModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                        <div className="glass-panel animate-slide-up" style={{ width: '100%', maxWidth: selectedPortfolio?.name === 'Préstamos' ? '650px' : '500px', background: 'var(--bg-surface)' }}>
                            <h2 style={{ marginBottom: '1.5rem' }}>
                                {editingAssetId ? 'Editar OperaciÃ³n' : 'Registrar Compra'} - {selectedPortfolio?.name}
                            </h2>

                            <form onSubmit={handleSaveAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {selectedPortfolio?.name === 'Préstamos' ? (
                                    <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        {/* Section 1: Cliente */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                            <div className="flex items-center gap-2" style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                                                <User size={18} />
                                                <h3 style={{ fontSize: '1rem', margin: 0 }}>InformaciÃ³n del Cliente</h3>
                                            </div>
                                            <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tipo Documento</label>
                                                    <select
                                                        value={newAsset.tipoDoc} onChange={e => setNewAsset({ ...newAsset, tipoDoc: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    >
                                                        <option value="CC">CÃ©dula de CiudadanÃ­a</option>
                                                        <option value="CE">CÃ©dula de ExtranjerÃ­a</option>
                                                        <option value="NIT">NIT (Empresa)</option>
                                                        <option value="Pasaporte">Pasaporte</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>NÃºmero de Documento *</label>
                                                    <input
                                                        type="text" required placeholder="Ej. 10234567"
                                                        value={newAsset.ticker} onChange={e => setNewAsset({ ...newAsset, ticker: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nombre Completo / RazÃ³n Social *</label>
                                                <input
                                                    type="text" required placeholder="Ej. Juan PÃ©rez"
                                                    value={newAsset.name} onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                />
                                            </div>
                                            <div className="grid-2" style={{ gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>TelÃ©fono</label>
                                                    <input
                                                        type="text" placeholder="Ej. +57 300 000 0000"
                                                        value={newAsset.phone} onChange={e => setNewAsset({ ...newAsset, phone: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Correo ElectrÃ³nico</label>
                                                    <input
                                                        type="email" placeholder="cliente@correo.com"
                                                        value={newAsset.email} onChange={e => setNewAsset({ ...newAsset, email: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: PrÃ©stamo */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                            <div className="flex items-center gap-2" style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                                                <FileText size={18} />
                                                <h3 style={{ fontSize: '1rem', margin: 0 }}>Detalles del CrÃ©dito</h3>
                                            </div>
                                            <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Monto Solicitado (COP) *</label>
                                                    <input
                                                        type="number" step="0.01" required placeholder="0.00"
                                                        value={newAsset.buyPrice} onChange={e => setNewAsset({ ...newAsset, buyPrice: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white', fontSize: '1.1rem', fontWeight: 600 }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tasa de InterÃ©s Mensual (%)</label>
                                                    <input
                                                        type="number" step="0.01" placeholder="Ej. 2.5"
                                                        value={newAsset.interestRate} onChange={e => setNewAsset({ ...newAsset, interestRate: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>NÃºmero de Cuotas (Meses)</label>
                                                    <input
                                                        type="number" min="1" placeholder="Ej. 12"
                                                        value={newAsset.plazo} onChange={e => setNewAsset({ ...newAsset, plazo: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Fecha de Desembolso *</label>
                                                    <input
                                                        type="date" required
                                                        value={newAsset.date} onChange={e => setNewAsset({ ...newAsset, date: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    />
                                                </div>
                                            </div>
                                            
                                            {parseFloat(newAsset.buyPrice) > 0 && parseInt(newAsset.plazo, 10) > 0 && (
                                                <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Valor de Cuota Mensual Estimada:</span>
                                                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                                                            ${(() => {
                                                                const p = parseFloat(newAsset.buyPrice) || 0;
                                                                const r = (parseFloat(newAsset.interestRate) || 0) / 100;
                                                                const n = parseInt(newAsset.plazo, 10) || 1;
                                                                const cuota = (p / n) + (p * r);
                                                                return cuota.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section 3: Risk */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                            <div className="flex items-center gap-2" style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                                                <Activity size={18} />
                                                <h3 style={{ fontSize: '1rem', margin: 0 }}>EvaluaciÃ³n de Riesgo</h3>
                                            </div>
                                            <div className="grid-2" style={{ gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Score Crediticio</label>
                                                    <input
                                                        type="number" placeholder="Ej. 750"
                                                        value={newAsset.score} onChange={e => setNewAsset({ ...newAsset, score: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nivel de Riesgo</label>
                                                    <select
                                                        value={newAsset.riesgo} onChange={e => setNewAsset({ ...newAsset, riesgo: e.target.value })}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                    >
                                                        <option value="Bajo">Riesgo Bajo</option>
                                                        <option value="Medio">Riesgo Medio</option>
                                                        <option value="Alto">Riesgo Alto</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid-2" style={{ gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>SÃ­mbolo (Ticker)</label>
                                                <input
                                                    type="text" required placeholder="Ej. AAPL"
                                                    value={newAsset.ticker} onChange={e => setNewAsset({ ...newAsset, ticker: e.target.value.toUpperCase() })}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre de la Empresa</label>
                                                <input
                                                    type="text" placeholder="Ej. Apple Inc."
                                                    value={newAsset.name} onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid-2" style={{ gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>NÂº de tÃ­tulos (Cantidad)</label>
                                                <input
                                                    type="number" step="0.0001" required
                                                    value={newAsset.quantity} onChange={e => setNewAsset({ ...newAsset, quantity: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Precio de Compra (USD)</label>
                                                <input
                                                    type="number" step="0.01" required
                                                    value={newAsset.buyPrice} onChange={e => setNewAsset({ ...newAsset, buyPrice: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Fecha de OperaciÃ³n</label>
                                            <input
                                                type="date" required
                                                value={newAsset.date} onChange={e => setNewAsset({ ...newAsset, date: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'white' }}
                                            />
                                        </div>

                                        {newAsset.quantity && newAsset.buyPrice && (
                                            <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(139, 175, 136, 0.1)', borderRadius: '0.5rem', border: '1px solid var(--accent-gold)' }}>
                                                Costo total de la operaciÃ³n: <strong style={{ color: 'var(--accent-gold)' }}>${(parseFloat(newAsset.quantity) * parseFloat(newAsset.buyPrice)).toLocaleString()} USD</strong>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsAssetModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        {editingAssetId ? 'Guardar Cambios' : 'Guardar Compra'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
