'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  MapPin,
  Search, 
  BarChart3, 
  PieChart, 
  ArrowUpRight,
  Loader2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Network
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Mission {
  country: string;
  city: string;
  type: string;
  name: string;
  region: string;
  status: string;
  notes: string;
  costOfLiving?: string;
}

export default function MissionsDashboard() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/missions');
        const result = await response.json();
        if (result.success) {
          setMissions(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to fetch mission data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const total = missions.length;
    const resident = missions.filter(m => m.status === 'Resident').length;
    const regions = [...new Set(missions.map(m => m.region))].filter(Boolean);
    const types = [...new Set(missions.map(m => m.type))].filter(Boolean);
    
    const embassies = missions.filter(m => m.type?.toLowerCase().includes('embassy')).length;
    const highCommissions = missions.filter(m => m.type?.toLowerCase().includes('high commission')).length;
    const consulates = missions.filter(m => m.type?.toLowerCase().includes('consulate')).length;
    
    return {
      total,
      resident,
      concurrent: total - resident,
      regionsCount: regions.length,
      typesCount: types.length,
      embassies,
      highCommissions,
      consulates
    };
  }, [missions]);

  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      const matchesSearch = 
        m.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = regionFilter === 'All' || m.region === regionFilter;
      const matchesType = typeFilter === 'All' || m.type === typeFilter;
      return matchesSearch && matchesRegion && matchesType;
    });
  }, [missions, searchTerm, regionFilter, typeFilter]);

  const regionData = useMemo(() => {
    const counts: Record<string, number> = {};
    missions.forEach(m => {
      if (m.region) {
        counts[m.region] = (counts[m.region] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [missions]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    missions.forEach(m => {
      if (m.type) {
        counts[m.type] = (counts[m.type] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [missions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">Initializing Global Data Hub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-destructive">
        <AlertCircle className="w-12 h-12" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Data Synchronization Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Global Indian Missions Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Live Command Center for India's Diplomatic Footprint
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm p-1 rounded-lg border border-border/50">
          <div className="px-3 py-1 bg-primary/10 rounded-md">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Sync Status</span>
          </div>
          <div className="flex items-center gap-1.5 px-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">Real-time Data</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Missions" 
          value={stats.total} 
          icon={<Globe className="w-5 h-5" />} 
          label="Global Nodes"
          color="blue"
        />
        <StatCard 
          title="Resident Missions" 
          value={stats.resident} 
          icon={<ShieldCheck className="w-5 h-5" />} 
          label="Diplomatic Presence"
          color="emerald"
        />
        <StatCard 
          title="Concurrent Missions" 
          value={stats.concurrent} 
          icon={<Network className="w-5 h-5" />} 
          label="Non-Resident Accreditation"
          color="amber"
        />
        <StatCard 
          title="Global Regions" 
          value={stats.regionsCount} 
          icon={<MapPin className="w-5 h-5" />} 
          label="Geographic Spread"
          color="purple"
        />
      </div>

      {/* Sub-grid for detailed mission breakdown */}
      <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-card border border-border mt-2 shadow-sm">
        <div className="flex flex-col items-center justify-center border-r border-border/50">
          <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">{stats.embassies}</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Embassies</span>
        </div>
        <div className="flex flex-col items-center justify-center border-r border-border/50">
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">{stats.highCommissions}</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">High Commissions</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-600 bg-clip-text text-transparent">{stats.consulates}</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Consulates</span>
        </div>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title="Missions by Region" icon={<PieChart className="w-5 h-5" />}>
          <DonutChart data={regionData} total={stats.total} />
        </ChartCard>

        <ChartCard title="Missions by Classification" icon={<BarChart3 className="w-5 h-5" />}>
          <ModernBarChart data={typeData} />
        </ChartCard>
      </div>

      {/* Database Explorer */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Mission Registry Explorer
          </h2>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search Country, City or Mission..." 
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="bg-card border border-border rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="All">All Regions</option>
              {regionData.map(([region]) => <option key={region} value={region}>{region}</option>)}
            </select>
            <select 
              className="bg-card border border-border rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              {typeData.map(([type]) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">Country & Mission</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Region</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Lifestyle</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMissions.map((m, idx) => (
                  <tr key={`${m.country}-${m.city}-${idx}`} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{m.country}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          {m.city}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-tight whitespace-nowrap",
                        m.type?.toLowerCase().includes('embassy') ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                        m.type?.toLowerCase().includes('high commission') ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                        m.type?.toLowerCase().includes('consulate') ? "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" :
                        "bg-muted/50 text-muted-foreground border-border"
                      )}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-muted-foreground">{m.region}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit",
                        m.status === 'Resident' 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", m.status === 'Resident' ? "bg-emerald-500" : "bg-amber-500")} />
                        {m.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {m.costOfLiving ? (
                        <div className={cn(
                          "flex flex-col gap-0.5",
                          parseFloat(m.costOfLiving) < 25 ? "text-emerald-500" :
                          parseFloat(m.costOfLiving) < 50 ? "text-cyan-500" :
                          parseFloat(m.costOfLiving) < 75 ? "text-amber-500" :
                          "text-rose-500"
                        )}>
                          <span className="text-xs font-bold">{m.costOfLiving}</span>
                          <span className="text-[10px] opacity-70 uppercase tracking-tighter font-semibold">
                            {parseFloat(m.costOfLiving) < 25 ? "Affordable" :
                             parseFloat(m.costOfLiving) < 50 ? "Moderate" :
                             parseFloat(m.costOfLiving) < 75 ? "High" :
                             "Premium"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground uppercase italic tracking-tighter">Pending Data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-primary/20 rounded-lg transition-all text-primary group/btn">
                        <ExternalLink className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredMissions.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No missions found matching your search.</p>
              <button 
                onClick={() => { setSearchTerm(''); setRegionFilter('All'); setTypeFilter('All'); }}
                className="mt-4 text-primary font-semibold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
          <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-bold text-foreground">{filteredMissions.length}</span> of <span className="font-bold text-foreground">{missions.length}</span> Diplomatic Entities
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Global Missions Command Center v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, label, color }: { title: string, value: number, icon: React.ReactNode, label: string, color: 'blue' | 'emerald' | 'amber' | 'purple' }) {
  const colors = {
    blue: "from-blue-500/20 to-indigo-500/5 text-blue-500 border-blue-500/20",
    emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-500 border-emerald-500/20",
    amber: "from-amber-500/20 to-orange-500/5 text-amber-500 border-amber-500/20",
    purple: "from-purple-500/20 to-fuchsia-500/5 text-purple-500 border-purple-500/20"
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-sm transition-all hover:shadow-md group",
      colors[color]
    )}>
      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
            {icon}
          </div>
          <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-all -translate-y-1 translate-x-1" />
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground/90">{title}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{label}</span>
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-lg shadow-black/5 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="font-bold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
          Breakdown View
        </button>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

function ModernBarChart({ data }: { data: [string, number][] }) {
  const max = Math.max(...data.map(d => d[1]));
  
  return (
    <div className="flex flex-col justify-end h-[300px] w-full gap-2 mt-4">
      <div className="flex items-end justify-between h-full gap-2">
        {data.slice(0, 8).map(([label, value], i) => { // show top 8
          const heightPct = Math.max((value / max) * 100, 2);
          const colorClass = [
            "from-indigo-500 to-purple-500",
            "from-cyan-500 to-blue-500",
            "from-emerald-500 to-teal-500",
            "from-amber-500 to-orange-500",
            "from-rose-500 to-pink-500"
          ][i % 5];
          
          return (
            <div key={label} className="relative flex flex-col items-center flex-1 group h-full justify-end">
              <div 
                className={cn("w-full rounded-t-sm transition-all duration-1000 ease-in-out bg-gradient-to-t opacity-90 group-hover:opacity-100 group-hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]", colorClass)}
                style={{ height: `${heightPct}%`, minHeight: '10%' }}
              />
              <div className="absolute top-0 -translate-y-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                <span className="font-bold">{value}</span> {label}
              </div>
              <span className="text-[10px] text-muted-foreground mt-2 truncate w-full text-center group-hover:text-foreground transition-colors" title={label}>
                {label.length > 10 ? label.substring(0, 8) + '..' : label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({ data, total }: { data: [string, number][], total: number }) {
  // SVG Donut calculation
  let currentAngle = 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  const colors = [
    '#6366f1', // indigo 500
    '#06b6d4', // cyan 500
    '#f59e0b', // amber 500
    '#10b981', // emerald 500
    '#ec4899', // pink 500
    '#8b5cf6', // violet 500
    '#f43f5e', // rose 500
    '#3b82f6', // blue 500
  ];
  
  return (
    <div className="flex flex-col md:flex-row items-center gap-8 h-full justify-center mt-4">
      <div className="relative w-48 h-48 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          {data.map(([label, value], i) => {
            const percentage = value / total;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const strokeDashoffset = currentAngle;
            currentAngle -= percentage * circumference;
            
            return (
              <circle
                key={label}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={colors[i % colors.length]}
                strokeWidth="16"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-in-out hover:opacity-80"
                style={{ strokeLinecap: 'butt' }}
              >
                <title>{`${label}: ${value} (${(percentage * 100).toFixed(1)}%)`}</title>
              </circle>
            );
          })}
          <circle cx="60" cy="60" r={radius - 8} fill="var(--background)" className="fill-card" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">{total}</span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">Total</span>
        </div>
      </div>
      
      <div className="flex-1 w-full max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-3">
          {data.map(([label, value], i) => (
            <div key={label} className="flex items-center justify-between group cursor-default">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full transition-transform group-hover:scale-125" 
                  style={{ backgroundColor: colors[i % colors.length] }} 
                />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{value}</span>
                <span className="text-[10px] text-muted-foreground w-8 text-right opacity-50 group-hover:opacity-100">
                  {((value / total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
