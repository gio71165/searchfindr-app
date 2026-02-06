'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Building2, 
  Eye, 
  Edit2, 
  MessageSquare, 
  TrendingUp,
  TrendingDown,
  Star,
  Calendar,
  Mail,
  Phone,
  Users,
  FileText,
  ArrowUpDown,
  X
} from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { BrokerDetailModal } from './BrokerDetailModal';
import { AddBrokerModal } from './AddBrokerModal';
import { LogInteractionModal } from './LogInteractionModal';

interface Broker {
  id: string;
  name: string;
  firm: string | null;
  email: string | null;
  phone: string | null;
  quality_rating: 'excellent' | 'good' | 'average' | 'poor' | null;
  notes: string | null;
  deals_received?: number;
  deals_proceeded?: number;
  deals_won?: number;
  avg_deal_quality?: number | null;
  last_contact_date?: string | null;
  preferred_contact_method?: string | null;
  tags?: string[];
  rating?: number | null;
  deal_count?: number;
}

type SortField = 'name' | 'firm' | 'deals_received' | 'proceed_rate' | 'win_rate' | 'avg_deal_quality' | 'last_contact_date';
type SortDirection = 'asc' | 'desc';

export function BrokerDashboard() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadBrokers();
  }, []);

  const loadBrokers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/brokers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to load brokers');
      }

      const data = await res.json();
      setBrokers(data.brokers || []);
    } catch (error) {
      console.error('Error loading brokers:', error);
      showToast('Failed to load brokers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateProceedRate = (broker: Broker): number => {
    if (!broker.deals_received || broker.deals_received === 0) return 0;
    return Math.round((broker.deals_proceeded || 0) / broker.deals_received * 100);
  };

  const calculateWinRate = (broker: Broker): number => {
    if (!broker.deals_received || broker.deals_received === 0) return 0;
    return Math.round((broker.deals_won || 0) / broker.deals_received * 100);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedBrokers = [...brokers].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'firm':
        aValue = (a.firm || '').toLowerCase();
        bValue = (b.firm || '').toLowerCase();
        break;
      case 'deals_received':
        aValue = a.deals_received || 0;
        bValue = b.deals_received || 0;
        break;
      case 'proceed_rate':
        aValue = calculateProceedRate(a);
        bValue = calculateProceedRate(b);
        break;
      case 'win_rate':
        aValue = calculateWinRate(a);
        bValue = calculateWinRate(b);
        break;
      case 'avg_deal_quality':
        aValue = a.avg_deal_quality || 0;
        bValue = b.avg_deal_quality || 0;
        break;
      case 'last_contact_date':
        aValue = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0;
        bValue = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return <span className="text-slate-400 text-sm">Not rated</span>;
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                }`}
              />
            ))}
            <span className="text-sm text-slate-500 ml-1">({rating})</span>
      </div>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Brokers</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and manage your broker relationships
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedBroker(null);
            setShowDetailModal(true);
          }}
          className="btn-primary flex items-center gap-2"
          aria-label="Add new broker"
        >
          <Users className="w-4 h-4" />
          Add Broker
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400">Total Brokers</div>
          <div className="text-2xl font-bold text-slate-50 mt-1">{brokers.length}</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400">Total Deals</div>
          <div className="text-2xl font-bold text-slate-50 mt-1">
            {brokers.reduce((sum, b) => sum + (b.deals_received || 0), 0)}
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400">Avg Proceed Rate</div>
          <div className="text-2xl font-bold text-slate-50 mt-1">
            {brokers.length > 0
              ? Math.round(
                  brokers.reduce((sum, b) => sum + calculateProceedRate(b), 0) / brokers.length
                )
              : 0}%
          </div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400">Avg Win Rate</div>
          <div className="text-2xl font-bold text-slate-50 mt-1">
            {brokers.length > 0
              ? Math.round(
                  brokers.reduce((sum, b) => sum + calculateWinRate(b), 0) / brokers.length
                )
              : 0}%
          </div>
        </div>
      </div>

      {/* Brokers Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-slate-50"
                  >
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  <button
                    onClick={() => handleSort('firm')}
                    className="flex items-center gap-1 hover:text-slate-50"
                  >
                    Company
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">
                  <button
                    onClick={() => handleSort('deals_received')}
                    className="flex items-center gap-1 hover:text-slate-50 ml-auto"
                  >
                    Deals Received
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">
                  <button
                    onClick={() => handleSort('proceed_rate')}
                    className="flex items-center gap-1 hover:text-slate-50 ml-auto"
                  >
                    Proceed Rate
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">
                  <button
                    onClick={() => handleSort('win_rate')}
                    className="flex items-center gap-1 hover:text-slate-50 ml-auto"
                  >
                    Win Rate
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
                  <button
                    onClick={() => handleSort('avg_deal_quality')}
                    className="flex items-center gap-1 hover:text-slate-50 mx-auto"
                  >
                    Avg Quality
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                  <button
                    onClick={() => handleSort('last_contact_date')}
                    className="flex items-center gap-1 hover:text-slate-50"
                  >
                    Last Contact
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedBrokers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No brokers found. Add brokers from deal pages.
                  </td>
                </tr>
              ) : (
                sortedBrokers.map((broker) => (
                  <tr key={broker.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-50">{broker.name}</div>
                      {broker.rating && (
                        <div className="mt-1">{renderStars(broker.rating)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {broker.firm || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-50">
                      {broker.deals_received || 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {calculateProceedRate(broker)}%
                        {calculateProceedRate(broker) >= 50 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {calculateWinRate(broker)}%
                        {calculateWinRate(broker) >= 30 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {broker.avg_deal_quality ? renderStars(Math.round(broker.avg_deal_quality)) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(broker.last_contact_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedBroker(broker);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBroker(broker);
                            setShowInteractionModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Log Interaction"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showDetailModal && !selectedBroker && (
        <AddBrokerModal
          onClose={() => setShowDetailModal(false)}
          onSuccess={() => {
            setShowDetailModal(false);
            loadBrokers();
          }}
        />
      )}
      {showDetailModal && selectedBroker && (
        <BrokerDetailModal
          broker={selectedBroker}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBroker(null);
          }}
          onRefresh={loadBrokers}
        />
      )}

      {showInteractionModal && selectedBroker && (
        <LogInteractionModal
          broker={selectedBroker}
          onClose={() => {
            setShowInteractionModal(false);
            setSelectedBroker(null);
          }}
          onSuccess={() => {
            loadBrokers();
            setShowInteractionModal(false);
            setSelectedBroker(null);
          }}
        />
      )}
    </div>
  );
}
