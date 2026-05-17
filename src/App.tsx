import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TreePine, Map, Calendar, Search, Filter, 
  Loader2, Wheat, ChevronRight, BarChart3, Database, Wand2,
  Tractor, Sprout, ArrowUpRight, ArrowDownRight, Info
} from "lucide-react";
import { api } from "./services/api";
import { Filters, SummaryData, TrendData, StateComparisonData, CropDistributionData } from "./types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ state: "All", crop: "All", year: "All" });
  const [states, setStates] = useState<string[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [stateComparison, setStateComparison] = useState<StateComparisonData[]>([]);
  const [cropDistribution, setCropDistribution] = useState<CropDistributionData[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 font-sans selection:bg-amber-200">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-amber-100/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
              <Sprout size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-amber-900">AgriData Explorer</h1>
              <p className="text-[10px] uppercase tracking-widest text-amber-600 font-bold opacity-70">Indian Agricultural Intelligence</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-amber-900/70 hover:text-amber-600 transition-colors">Dashboard</a>
            <a href="#" className="text-sm font-medium text-amber-900/70 hover:text-amber-600 transition-colors">Crop Analysis</a>
            <a href="#" className="text-sm font-medium text-amber-900/70 hover:text-amber-600 transition-colors">Market Trends</a>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-5">Get Started</Button>
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
              key="content"
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
                    className="p-6 rounded-[2.5rem] bg-white border border-amber-100 shadow-[0_8px_30px_rgb(253,251,241,0.5)] border-b-4 border-b-amber-200/50 relative overflow-hidden group"
                   >
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-${kpi.color}-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-all duration-500`} />
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{kpi.title}</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{kpi.unit}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600 border border-${kpi.color}-100`}>
                        <kpi.icon size={24} />
                      </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 relative z-10">
                      <Badge variant="secondary" className={`bg-${kpi.color}-50 text-${kpi.color}-700 border-none rounded-lg font-bold text-[10px]`}>
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
                  <TabsList className="bg-amber-100/50 p-1 rounded-2xl h-12 inline-flex border border-amber-100/80">
                    <TabsTrigger value="overview" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider transition-all">Overview</TabsTrigger>
                    <TabsTrigger value="states" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider transition-all">States</TabsTrigger>
                    <TabsTrigger value="yield" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wider transition-all">Yield Density</TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="rounded-xl border-amber-200 text-amber-700 h-10 px-4 hover:bg-amber-50"
                      onClick={handleGenerateAI}
                      disabled={generatingInsight}
                    >
                      {generatingInsight ? <Loader2 size={16} className="animate-spin mr-2" /> : <Wand2 size={16} className="mr-2" />}
                      Predictive Insight
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl text-amber-500 hover:bg-amber-50">
                      <Info size={20} />
                    </Button>
                  </div>
                </div>

                <TabsContent value="overview" className="space-y-6">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="rounded-[2.5rem] border-amber-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="pb-0 pt-8 px-8">
                          <CardTitle className="text-xl font-bold text-slate-900">Production Trendlines</CardTitle>
                          <CardDescription>Yearly aggregate production growth patterns</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px] p-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends}>
                              <defs>
                                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                cursor={{ stroke: '#F59E0B', strokeWidth: 2 }}
                              />
                              <Area type="monotone" dataKey="production" stroke="#F59E0B" strokeWidth={4} fillOpacity={1} fill="url(#colorProd)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="rounded-[2.5rem] border-amber-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="pb-0 pt-8 px-8 flex flex-row items-center justify-between space-y-0">
                          <div>
                            <CardTitle className="text-xl font-bold text-slate-900">Crop Distribution</CardTitle>
                            <CardDescription>Share of crops in regional production</CardDescription>
                          </div>
                   
                        </CardHeader>
                        <CardContent className="h-[350px] p-4">
                          <ResponsiveContainer width="100%" height="100%">
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
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                   </div>

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
                  <Card className="rounded-[2.5rem] border-amber-100 shadow-sm overflow-hidden bg-white">
                    <CardHeader className="pt-8 px-8">
                       <CardTitle className="text-xl font-bold">State-wise Production Breakdown</CardTitle>
                       <CardDescription>Comparative analysis of regional output metrics</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[450px] p-8">
                        <ResponsiveContainer width="100%" height="100%">
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
                     <Card className="rounded-[2.5rem] border-amber-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="pt-8 px-8">
                          <CardTitle className="text-xl font-bold">Yield Efficiency Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] p-6">
                          <ResponsiveContainer width="100%" height="100%">
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
