import React, { useState, useEffect, useRef } from "react";
import * as Papa from "papaparse";
import * as XLSX from "xlsx";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TreePine, Map, Calendar, Search, Filter, 
  Loader2, Wheat, ChevronRight, BarChart3, Database, Wand2,
  Tractor, Sprout, ArrowUpRight, ArrowDownRight, Info,
  TrendingDown, PieChart as PieIcon, LineChart as LineIcon,
  BookOpen, Lightbulb, CheckCircle2, Moon, Sun, Settings as SettingsIcon,
  Upload, Trash2, RefreshCw, Eye
} from "lucide-react";
import { api } from "./services/api";
import { Filters, SummaryData, TrendData, StateComparisonData, CropDistributionData } from "./types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

type View = "dashboard" | "crop-analysis" | "market-trends" | "settings";

export default function App() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });
  const [insightsEnabled, setInsightsEnabled] = useState(true);
  const [chartsEnabled, setChartsEnabled] = useState(true);
  
  const [filters, setFilters] = useState<Filters>({ state: "All", crop: "All", year: "All" });
  const [states, setStates] = useState<string[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [stateComparison, setStateComparison] = useState<StateComparisonData[]>([]);
  const [cropDistribution, setCropDistribution] = useState<CropDistributionData[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  
  const [uploadProgress, setUploadProgress] = useState<{status: string, message: string} | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    Promise.all([api.getStates(), api.getCrops()]).then(([s, c]) => {
      setStates(s);
      setCrops(c);
      loadData();
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, tr, sc, cd] = await Promise.all([
        api.getSummary(filters),
        api.getTrends(filters),
        api.getStateComparison(filters),
        api.getCropDistribution(filters),
      ]);
      setSummary(sum);
      setTrends(tr);
      setStateComparison(sc);
      setCropDistribution(cd);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!summary) return;
    setGeneratingInsight(true);
    try {
      const summaryText = `Total Production: ${(summary.totalProduction / 1e6).toFixed(2)}M Tons, Avg Yield: ${summary.avgYield.toFixed(2)} T/Ha, Total Area: ${(summary.totalArea / 1e6).toFixed(2)}M Ha for ${filters.crop} in ${filters.state}`;
      const res = await api.generateAIInsight(summaryText);
      setAiInsight(res.insight);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingInsight(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadProgress({ status: "loading", message: "Parsing file..." });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const bstr = e.target?.result;
      let data: any[] = [];

      try {
        if (file.name.endsWith(".csv")) {
          const results = Papa.parse(bstr as string, { header: true });
          data = results.data;
        } else {
          const workbook = XLSX.read(bstr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }

        // Validate columns
        const required = ["State", "Crop", "Year", "Production", "Area"];
        const headers = Object.keys(data[0] || {});
        const missing = required.filter(r => !headers.some(h => h.toLowerCase() === r.toLowerCase()));

        if (missing.length > 0) {
          throw new Error(`Missing required columns: ${missing.join(", ")}`);
        }

        setPreviewData(data.slice(0, 5));
        setUploadProgress({ status: "success", message: `Found ${data.length} records. Ready to upload.` });
        (window as any).pendingUploadData = data;
      } catch (err: any) {
        setUploadProgress({ status: "error", message: err.message });
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const executeUpload = async (mode: 'replace' | 'merge') => {
    const data = (window as any).pendingUploadData;
    if (!data) return;

    setUploadProgress({ status: "loading", message: "Uploading to server..." });
    try {
      await api.uploadData(data, mode);
      setUploadProgress({ status: "done", message: "Dataset updated successfully!" });
      setPreviewData(null);
      loadData();
      // Refresh states/crops
      const [s, c] = await Promise.all([api.getStates(), api.getCrops()]);
      setStates(s);
      setCrops(c);
    } catch (err) {
      setUploadProgress({ status: "error", message: "Failed to sync with server" });
    }
  };

  const resetToDefault = async () => {
    setLoading(true);
    try {
      await api.resetData();
      await loadData();
      const [s, c] = await Promise.all([api.getStates(), api.getCrops()]);
      setStates(s);
      setCrops(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f1115] text-slate-100' : 'bg-[#FFFDF5] text-slate-900'} font-sans selection:bg-amber-200`}>
      {/* Header */}
      <nav className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/70 border-amber-100/50'} backdrop-blur-xl border-b px-6 py-4`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveView("dashboard")}>
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Sprout size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-900">AgriData Explorer</h1>
              <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold opacity-70">Indian Agricultural Intelligence</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => setActiveView("dashboard")}
              className={`text-sm font-medium transition-colors ${activeView === "dashboard" ? "text-amber-600" : "text-amber-900/70 hover:text-amber-600"}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveView("crop-analysis")}
              className={`text-sm font-medium transition-colors ${activeView === "crop-analysis" ? "text-amber-600" : "text-amber-900/70 hover:text-amber-600"}`}
            >
              Crop Analysis
            </button>
            <button 
              onClick={() => setActiveView("market-trends")}
              className={`text-sm font-medium transition-colors ${activeView === "market-trends" ? "text-amber-600" : "text-amber-900/70 hover:text-amber-600"}`}
            >
              Market Trends
            </button>
            
            <button 
              onClick={() => setActiveView("settings")}
              className={`p-2 rounded-xl transition-colors ${activeView === "settings" ? "bg-amber-100 text-amber-600" : "text-amber-900/70 hover:bg-amber-50"}`}
            >
              <SettingsIcon size={20} />
            </button>

            <button 
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-800 text-amber-400' : 'bg-amber-50 text-amber-600'}`}
            >
              {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <Dialog>
              <DialogTrigger render={<Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-5" />}>
                Get Started
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-amber-100 bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-amber-900 flex items-center gap-2">
                    <Sprout className="text-amber-500" />
                    Welcome to AgriData
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 pt-2">
                    Start exploring Indian agricultural intelligence with these 3 easy steps:
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  {[
                    { icon: Filter, title: "Apply Regional Filters", desc: "Select a specific State or Crop from the top bar to narrow down the dataset." },
                    { icon: BarChart3, title: "Analyze Overviews", desc: "Use the Dashboard to see high-level production, area, and yield metrics." },
                    { icon: Wand2, title: "Get AI Insights", desc: "Click 'Predictive Insight' to generate a Gemini-powered analysis of the current data." }
                  ].map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
                        <step.icon size={20} />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900">{step.title}</h5>
                        <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                  <DialogClose render={<Button className="w-full bg-amber-500 hover:bg-amber-600 rounded-xl h-12 font-bold mt-4" />}>
                    Explore Dashboard
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="h-[60vh] flex flex-col items-center justify-center gap-4"
            >
              <Loader2 className="animate-spin text-amber-500" size={48} />
              <p className="text-amber-700/60 font-medium animate-pulse">Gathering field data...</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 p-3 rounded-2xl border border-amber-100 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-3 px-3">
                  <Filter className="text-amber-500" size={18} />
                  <span className="text-sm font-bold text-amber-900/60">Filters</span>
                </div>
                <Select value={filters.state} onValueChange={(v) => setFilters(prev => ({ ...prev, state: v }))}>
                  <SelectTrigger className="bg-white/80 border-none rounded-xl h-12 text-sm shadow-sm ring-amber-100 focus:ring-2 focus:ring-amber-400 transition-all">
                    <div className="flex items-center gap-2">
                       <Map size={16} className="text-amber-400" />
                       <SelectValue placeholder="All States" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-amber-100">
                    <SelectItem value="All">All States</SelectItem>
                    {states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.crop} onValueChange={(v) => setFilters(prev => ({ ...prev, crop: v }))}>
                  <SelectTrigger className="bg-white/80 border-none rounded-xl h-12 text-sm shadow-sm ring-amber-100 focus:ring-2 focus:ring-amber-400 transition-all">
                    <div className="flex items-center gap-2">
                       <Wheat size={16} className="text-amber-400" />
                       <SelectValue placeholder="All Crops" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-amber-100">
                    <SelectItem value="All">All Crops</SelectItem>
                    {crops.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.year} onValueChange={(v) => setFilters(prev => ({ ...prev, year: v }))}>
                  <SelectTrigger className="bg-white/80 border-none rounded-xl h-12 text-sm shadow-sm ring-amber-100 focus:ring-2 focus:ring-amber-400 transition-all">
                    <div className="flex items-center gap-2">
                       <Calendar size={16} className="text-amber-400" />
                       <SelectValue placeholder="All Years" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-amber-100">
                    <SelectItem value="All">All Years</SelectItem>
                    {[2018, 2019, 2020, 2021, 2022, 2023].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {activeView === "dashboard" && (
                <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: "Total Production", value: `${(summary?.totalProduction! / 1e6).toFixed(2)}M`, unit: "Metric Tons", icon: Database, color: "amber", trend: "+2.4%" },
                    { title: "Average Yield", value: summary?.avgYield.toFixed(2), unit: "Tons / Hectare", icon: TrendingUp, color: "emerald", trend: "+1.2%" },
                    { title: "Total Area", value: `${(summary?.totalArea! / 1e6).toFixed(2)}M`, unit: "Hectares", icon: Map, color: "blue", trend: "-0.5%" },
                  ].map((kpi, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -5 }}
                      className={`p-6 rounded-[2.5rem] border shadow-sm border-b-4 relative overflow-hidden group transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 border-b-amber-900/50' : 'bg-white border-amber-100 border-b-amber-200/50'}`}
                    >
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-${kpi.color}-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-all duration-500`} />
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{kpi.title}</p>
                          <h3 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{kpi.value}</h3>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{kpi.unit}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${theme === 'dark' ? 'bg-slate-800 text-amber-500 border-slate-700' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          <kpi.icon size={24} />
                        </div>
                      </div>
                      <div className="mt-6 flex items-center gap-2 relative z-10">
                        <Badge variant="secondary" className={`${theme === 'dark' ? 'bg-slate-800 text-amber-400' : 'bg-amber-50 text-amber-700'} border-none rounded-lg font-bold text-[10px]`}>
                          {kpi.trend.startsWith('+') ? <ArrowUpRight size={10} className="mr-1 inline" /> : <ArrowDownRight size={10} className="mr-1 inline" />}
                          {kpi.trend} vs LY
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-medium">Growth trajectory</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Main Analytics Tabs */}
                <Tabs defaultValue="overview" className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <TabsList className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-amber-100/50 border-amber-100/80'} p-1 rounded-2xl h-12 inline-flex border`}>
                      <TabsTrigger value="overview" className={`rounded-xl px-6 data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider transition-all ${theme === 'dark' ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400' : 'data-[state=active]:bg-white data-[state=active]:text-amber-700'}`}>Overview</TabsTrigger>
                      <TabsTrigger value="states" className={`rounded-xl px-6 data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider transition-all ${theme === 'dark' ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400' : 'data-[state=active]:bg-white data-[state=active]:text-amber-700'}`}>States</TabsTrigger>
                      <TabsTrigger value="yield" className={`rounded-xl px-6 data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider transition-all ${theme === 'dark' ? 'data-[state=active]:bg-slate-700 data-[state=active]:text-amber-400' : 'data-[state=active]:bg-white data-[state=active]:text-amber-700'}`}>Yield Density</TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                      {insightsEnabled && (
                        <Button 
                          variant="outline" 
                          className={`rounded-xl h-10 px-4 transition-all ${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                          onClick={handleGenerateAI}
                          disabled={generatingInsight}
                        >
                          {generatingInsight ? <Loader2 size={16} className="animate-spin mr-2" /> : <Wand2 size={16} className="mr-2" />}
                          Predictive Insight
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="rounded-xl text-amber-500 hover:bg-amber-50">
                        <Info size={20} />
                      </Button>
                    </div>
                  </div>

                  <TabsContent value="overview" className="space-y-6">
                    {chartsEnabled ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className={`rounded-[2.5rem] shadow-sm overflow-hidden min-h-[450px] ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-100'}`}>
                          <CardHeader className="pb-0 pt-8 px-8">
                            <CardTitle className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Production Trendlines</CardTitle>
                            <CardDescription>Yearly aggregate production growth patterns</CardDescription>
                          </CardHeader>
                          <CardContent className="h-[350px] p-4 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#1e293b" : "#F1F5F9"} />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                  cursor={{ stroke: '#F59E0B', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="production" stroke="#F59E0B" strokeWidth={4} fillOpacity={1} fill="url(#colorProd)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card className={`rounded-[2.5rem] shadow-sm overflow-hidden min-h-[450px] ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-100'}`}>
                          <CardHeader className="pb-0 pt-8 px-8 flex flex-row items-center justify-between space-y-0">
                            <div>
                              <CardTitle className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Crop Distribution</CardTitle>
                              <CardDescription>Share of crops in regional production</CardDescription>
                            </div>
                          </CardHeader>
                          <CardContent className="h-[350px] p-4 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                              <PieChart>
                                <Pie
                                  data={cropDistribution}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={80}
                                  outerRadius={120}
                                  paddingAngle={5}
                                  dataKey="production"
                                  nameKey="crop"
                                  animationBegin={0}
                                  animationDuration={1000}
                                >
                                  {cropDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                    </div>
                    ) : (
                      <div className={`p-12 rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-amber-200 text-amber-700/50'}`}>
                        <BarChart3 size={48} className="mb-4 opacity-20" />
                        <h3 className="text-xl font-bold">Charts are hidden</h3>
                        <p className="text-sm">Enable them in the Settings page to visualize your data.</p>
                      </div>
                    )}

                    {aiInsight && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 rounded-[3rem] bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xl shadow-amber-200"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <Wand2 size={24} />
                          </div>
                          <h4 className="text-xl font-bold">Predictive Field Insights</h4>
                        </div>
                        <div className="space-y-4 text-amber-50 opacity-90 leading-relaxed font-medium">
                          {aiInsight.split("\n").map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/60">
                          <span>Powered by Gemini 1.5 Flash</span>
                          <span>Generated on {new Date().toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    )}
                  </TabsContent>

                  <TabsContent value="states" className="space-y-6">
                    <Card className="rounded-[2.5rem] border-amber-100 shadow-sm overflow-hidden bg-white min-h-[550px]">
                      <CardHeader className="pt-8 px-8">
                        <CardTitle className="text-xl font-bold">State-wise Production Breakdown</CardTitle>
                        <CardDescription>Comparative analysis of regional output metrics</CardDescription>
                      </CardHeader>
                      <CardContent className="h-[450px] p-8 w-full">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={stateComparison} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                              <XAxis type="number" hide />
                              <YAxis dataKey="state" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 600}} width={120} />
                              <Tooltip 
                                cursor={{fill: '#FFFBEB'}}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                              <Bar dataKey="production" fill="#F59E0B" radius={[0, 20, 20, 0]} barSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="yield" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div className="p-8 rounded-[2.5rem] bg-indigo-600 text-white">
                            <h4 className="text-2xl font-bold mb-2">Yield Optimization</h4>
                            <p className="text-indigo-100/70 text-sm mb-6">Current data suggests a steady 2.5% increase in yield density across northern states.</p>
                            <ul className="space-y-3">
                                {[
                                  "Increase in fertilizer efficiency",
                                  "Advancements in pest control",
                                  "Stable monsoon patterns",
                                  "New high-yield crop variants"
                                ].map((item, i) => (
                                  <li key={i} className="flex items-center gap-3 text-sm font-medium">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                    {item}
                                  </li>
                                ))}
                            </ul>
                          </div>
                      </div>
                      <Card className="rounded-[2.5rem] border-amber-100 shadow-sm overflow-hidden bg-white min-h-[400px]">
                          <CardHeader className="pt-8 px-8">
                            <CardTitle className="text-xl font-bold">Yield Efficiency Trend</CardTitle>
                          </CardHeader>
                          <CardContent className="h-[300px] p-6 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                              <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Line type="monotone" dataKey="yield" stroke="#10B981" strokeWidth={4} dot={{ r: 6, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 8 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
                </>
              )}

              {activeView === "settings" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                      <SettingsIcon size={24} />
                    </div>
                    <div>
                      <h2 className={`text-3xl font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-amber-900'}`}>System Settings</h2>
                      <p className="text-slate-500 font-medium">Manage datasets, interface, and AI preferences</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <Card className={`rounded-[2.5rem] p-8 border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-100'}`}>
                        <div className="flex items-center gap-2 mb-6">
                          <Database className="text-amber-500" size={20} />
                          <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Dataset Management</h4>
                        </div>
                        
                        <div className="space-y-8">
                          <div className={`p-8 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${theme === 'dark' ? 'border-slate-800 bg-slate-800/20' : 'border-amber-100 bg-amber-50/30'}`}>
                            <Upload className="text-amber-400 mb-4" size={40} />
                            <h5 className="font-bold text-lg">Import Custom Data</h5>
                            <p className="text-sm text-slate-500 mb-6 font-medium">Supported formats: .CSV, .XLSX</p>
                            
                            <input 
                              type="file" 
                              ref={fileInputRef} 
                              onChange={handleFileUpload} 
                              className="hidden" 
                              accept=".csv, .xlsx" 
                            />
                            
                            <Button 
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-amber-500 hover:bg-amber-600 rounded-xl px-8"
                            >
                              Choose File
                            </Button>
                          </div>

                          {uploadProgress && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 rounded-2xl border flex items-center gap-4 ${
                                uploadProgress.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
                                uploadProgress.status === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 
                                'bg-amber-50 border-amber-100 text-amber-800'
                              }`}
                            >
                              {uploadProgress.status === 'loading' ? <Loader2 className="animate-spin text-amber-500" /> : <Info />}
                              <div className="flex-1">
                                <p className="text-sm font-bold">{uploadProgress.message}</p>
                              </div>
                              {uploadProgress.status === 'success' && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="bg-white" onClick={() => executeUpload('merge')}>Merge</Button>
                                  <Button size="sm" className="bg-amber-500" onClick={() => executeUpload('replace')}>Replace All</Button>
                                </div>
                              )}
                            </motion.div>
                          )}

                          {previewData && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                                <Eye size={12} />
                                Preview (First 5 Rows)
                              </div>
                              <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-slate-800' : 'border-amber-100'}`}>
                                <Table>
                                  <TableHeader className={theme === 'dark' ? 'bg-slate-800' : 'bg-amber-50'}>
                                    <TableRow>
                                      <TableHead className="text-[10px]">State</TableHead>
                                      <TableHead className="text-[10px]">Crop</TableHead>
                                      <TableHead className="text-[10px]">Year</TableHead>
                                      <TableHead className="text-[10px]">Prod</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {previewData.map((row, i) => (
                                      <TableRow key={i}>
                                        <TableCell className="text-xs font-bold">{row.State || row.state}</TableCell>
                                        <TableCell className="text-xs">{row.Crop || row.crop}</TableCell>
                                        <TableCell className="text-xs">{row.Year || row.year}</TableCell>
                                        <TableCell className="text-xs">{row.Production || row.production}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}

                          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                              <h5 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Reset to Default Dataset</h5>
                              <p className="text-xs text-slate-500">Restore factory state dataset and trends</p>
                            </div>
                            <Button 
                              variant="outline" 
                              onClick={resetToDefault}
                              className="rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50"
                            >
                              <RefreshCw size={16} className="mr-2" /> Reset Data
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="space-y-6">
                      <Card className={`rounded-[2.5rem] p-8 border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-100'}`}>
                        <div className="flex items-center gap-2 mb-6">
                          <Eye className="text-amber-500" size={20} />
                          <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Interface Prefs</h4>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-bold">Dark Mode</Label>
                              <p className="text-xs text-slate-500">Enable high contrast dark theme</p>
                            </div>
                            <Switch checked={theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-bold">Predictive Insights</Label>
                              <p className="text-xs text-slate-500">Show AI analysis buttons</p>
                            </div>
                            <Switch checked={insightsEnabled} onCheckedChange={setInsightsEnabled} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-bold">Visual Analytics</Label>
                              <p className="text-xs text-slate-500">Toggle charts and graphs</p>
                            </div>
                            <Switch checked={chartsEnabled} onCheckedChange={setChartsEnabled} />
                          </div>
                        </div>
                      </Card>

                      <Card className={`rounded-[2.5rem] p-8 border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-100'}`}>
                         <h5 className="font-bold mb-2">Usage Summary</h5>
                         <div className="space-y-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Custom Records</span>
                              <span className="font-bold">0</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Last Sync</span>
                              <span className="font-bold">Just now</span>
                            </div>
                         </div>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeView === "market-trends" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-black text-amber-900 leading-tight">Market & Economic Trends</h2>
                      <p className="text-slate-500 font-medium mt-1">Macro-level shifts in agricultural output value</p>
                    </div>
                    <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 border border-blue-200">
                      <TrendingUp size={32} />
                    </div>
                  </div>

                  <Card className="rounded-[2.5rem] border-blue-100 shadow-sm bg-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-50" />
                    <div className="relative z-10">
                      <h4 className="text-xl font-bold mb-8">Inter-Year Production Value Volatility</h4>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <AreaChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2FF" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area type="stepBefore" dataKey="production" stroke="#2563EB" fill="#DBEafe" strokeWidth={3} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { icon: BookOpen, title: "Export Potential", desc: "Production surplus in Northern states indicates high export capability.", color: "bg-blue-50 text-blue-600" },
                      { icon: Lightbulb, title: "Policy Impact", desc: "MSP updates in 2023 favored Oilseeds, showing a 15% area shift.", color: "bg-amber-50 text-amber-600" },
                      { icon: CheckCircle2, title: "Sustainable Growth", desc: "Yield maintains a stable 2% CAGR over the last 5 tracking years.", color: "bg-emerald-50 text-emerald-600" },
                    ].map((item, i) => (
                      <Card key={i} className="p-6 rounded-3xl border-slate-100 shadow-sm bg-white hover:border-amber-200 transition-all">
                        <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4`}>
                          <item.icon size={24} />
                        </div>
                        <h5 className="font-bold text-slate-900 mb-2">{item.title}</h5>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-100 bg-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Sprout className="text-amber-500" size={20} />
            <span className="font-bold text-amber-900 tracking-tight">AgriData Explorer</span>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">&copy; 2026 MINISTRY OF AGRI-INTELLIGENCE. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Privacy</a>
            <a href="#" className="text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors uppercase tracking-widest">API Docs</a>
            <a href="#" className="text-xs font-bold text-slate-400 hover:text-amber-500 transition-colors uppercase tracking-widest">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
