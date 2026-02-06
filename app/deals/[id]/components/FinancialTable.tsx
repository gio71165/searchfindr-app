'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, Download, Search, X } from 'lucide-react';

export interface FinancialTableData {
  table_name: string;
  table_type: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'other';
  years: string[];
  rows: Array<{
    account_name: string;
    account_category: string | null;
    values_by_year: Record<string, number | null>;
    unit: string;
    notes: string | null;
  }>;
}

interface FinancialTableProps {
  table: FinancialTableData;
}

type SortField = 'account_name' | 'year';
type SortDirection = 'asc' | 'desc';

export function FinancialTable({ table }: FinancialTableProps) {
  const [sortField, setSortField] = useState<SortField>('account_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // Format number with unit
  const formatValue = (value: number | null, unit: string): string => {
    if (value === null || value === undefined) return '—';
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue)) return '—';
    
    const unitLower = unit.toLowerCase();
    
    // Format based on unit
    if (unitLower.includes('thousand') || unitLower.includes('k')) {
      // If already in thousands, don't divide
      if (Math.abs(numValue) < 1000) {
        return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`;
      }
      return `$${(numValue / 1000).toFixed(1)}K`;
    } else if (unitLower.includes('million') || unitLower.includes('m')) {
      // If already in millions, don't divide
      if (Math.abs(numValue) < 1000000) {
        return `$${(numValue / 1000000).toFixed(2)}M`;
      }
      return `$${(numValue / 1000000).toFixed(2)}M`;
    } else {
      // Default: format as currency
      return `$${numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let filtered = table.rows;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.account_name.toLowerCase().includes(query) ||
          (row.account_category && row.account_category.toLowerCase().includes(query))
      );
    }

    // Apply year filter (if a specific year is selected, show only rows with data for that year)
    if (selectedYear) {
      filtered = filtered.filter((row) => {
        const value = row.values_by_year[selectedYear];
        return value !== null && value !== undefined;
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'account_name') {
        comparison = a.account_name.localeCompare(b.account_name);
      } else if (sortField === 'year') {
        // Sort by first available year value (descending by default for years)
        const aValue = table.years
          .map((year) => a.values_by_year[year])
          .find((v) => v !== null && v !== undefined);
        const bValue = table.years
          .map((year) => b.values_by_year[year])
          .find((v) => v !== null && v !== undefined);
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        comparison = (bValue as number) - (aValue as number);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [table.rows, table.years, searchQuery, selectedYear, sortField, sortDirection]);

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Account Name', 'Category', ...table.years, 'Unit', 'Notes'];
    const rows = filteredAndSortedRows.map((row) => [
      row.account_name,
      row.account_category || '',
      ...table.years.map((year) => {
        const value = row.values_by_year[year];
        return value !== null && value !== undefined ? String(value) : '';
      }),
      row.unit,
      row.notes || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${table.table_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate year-over-year change percentage
  const calculateYoYChange = (currentYear: string, previousYear: string | null, row: FinancialTableData['rows'][0]): string | null => {
    if (!previousYear) return null;
    const current = row.values_by_year[currentYear];
    const previous = row.values_by_year[previousYear];
    
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    if (previous === 0) return current > 0 ? '∞' : null;
    
    const change = ((current - previous) / Math.abs(previous)) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const sortedYears = [...table.years].sort((a, b) => {
    const yearA = parseInt(a);
    const yearB = parseInt(b);
    if (!isNaN(yearA) && !isNaN(yearB)) return yearB - yearA; // Most recent first
    return b.localeCompare(a); // Fallback to string comparison
  });

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">{table.table_name}</h3>
          <p className="text-sm text-slate-400 capitalize">{table.table_type.replace('_', ' ')}</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 py-2 pl-10 pr-4 text-sm text-slate-50 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Year Filter */}
        <select
          value={selectedYear || ''}
          onChange={(e) => setSelectedYear(e.target.value || null)}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Years</option>
          {sortedYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-900/50">
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('account_name')}
                  className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-300 hover:text-slate-50"
                >
                  Account Name
                  <ArrowUpDown className={`h-3 w-3 ${sortField === 'account_name' ? 'text-emerald-400' : 'text-slate-400'}`} />
                </button>
              </th>
              {sortedYears.map((year, idx) => {
                const prevYear = idx < sortedYears.length - 1 ? sortedYears[idx + 1] : null;
                return (
                  <th key={year} className="px-4 py-3 text-right">
                    <div className="text-xs font-semibold uppercase text-slate-300">{year}</div>
                    {prevYear && (
                      <div className="text-xs font-normal text-slate-500">vs {prevYear}</div>
                    )}
                  </th>
                );
              })}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-300">Unit</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={sortedYears.length + 2} className="px-4 py-8 text-center text-sm text-slate-500">
                  No accounts found matching your search.
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-50">{row.account_name}</div>
                    {row.account_category && (
                      <div className="text-xs text-slate-500">{row.account_category}</div>
                    )}
                  </td>
                  {sortedYears.map((year, yearIdx) => {
                    const prevYear = yearIdx < sortedYears.length - 1 ? sortedYears[yearIdx + 1] : null;
                    const value = row.values_by_year[year];
                    const yoYChange = prevYear ? calculateYoYChange(year, prevYear, row) : null;
                    
                    return (
                      <td key={year} className="px-4 py-3 text-right">
                        <div className="font-medium text-slate-50">
                          {formatValue(value as number | null, row.unit)}
                        </div>
                        {yoYChange && (
                          <div className={`text-xs ${yoYChange.startsWith('+') ? 'text-emerald-400' : yoYChange.startsWith('-') ? 'text-red-400' : 'text-slate-500'}`}>
                            {yoYChange}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{row.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-slate-500">
        Showing {filteredAndSortedRows.length} of {table.rows.length} accounts
        {searchQuery && ` matching "${searchQuery}"`}
        {selectedYear && ` with data for ${selectedYear}`}
      </div>
    </div>
  );
}
