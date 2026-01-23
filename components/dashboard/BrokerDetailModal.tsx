'use client';

import { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, Star, Calendar, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import Link from 'next/link';

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
}

interface Interaction {
  id: string;
  interaction_type: string;
  interaction_date: string;
  notes: string | null;
}

interface Deal {
  id: string;
  company_name: string | null;
  verdict: string | null;
  final_tier: string | null;
  created_at: string;
}

export function BrokerDetailModal({
  broker,
  onClose,
  onRefresh,
}: {
  broker: Broker;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [broker.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) return;

      // Load interactions
      const interactionsRes = await fetch(`/api/brokers/${broker.id}/interactions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (interactionsRes.ok) {
        const interactionsData = await interactionsRes.json();
        setInteractions(interactionsData.interactions || []);
      }

      // Load deals
      const dealsRes = await fetch(`/api/brokers/${broker.id}/deals`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (dealsRes.ok) {
        const dealsData = await dealsRes.json();
        setDeals(dealsData.deals || []);
      }
    } catch (error) {
      console.error('Error loading broker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return <span className="text-slate-400">Not rated</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'deal_received':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const proceedRate = broker.deals_received && broker.deals_received > 0
    ? Math.round((broker.deals_proceeded || 0) / broker.deals_received * 100)
    : 0;

  const winRate = broker.deals_received && broker.deals_received > 0
    ? Math.round((broker.deals_won || 0) / broker.deals_received * 100)
    : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{broker.name}</h2>
            {broker.firm && (
              <p className="text-sm text-slate-600 mt-1">{broker.firm}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {broker.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <a href={`mailto:${broker.email}`} className="text-blue-600 hover:underline">
                    {broker.email}
                  </a>
                </div>
              )}
              {broker.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <a href={`tel:${broker.phone}`} className="text-blue-600 hover:underline">
                    {broker.phone}
                  </a>
                </div>
              )}
              {broker.preferred_contact_method && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Preferred: {broker.preferred_contact_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600">Deals Received</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {broker.deals_received || 0}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600">Proceed Rate</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {proceedRate}%
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600">Win Rate</div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {winRate}%
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-600">Avg Quality</div>
                <div className="mt-1">
                  {broker.avg_deal_quality ? renderStars(Math.round(broker.avg_deal_quality)) : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Rating & Tags */}
          {(broker.rating || broker.tags?.length) && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Rating & Tags</h3>
              <div className="flex items-center gap-4">
                {broker.rating && (
                  <div>
                    <div className="text-xs text-slate-600 mb-1">Rating</div>
                    {renderStars(broker.rating)}
                  </div>
                )}
                {broker.tags && broker.tags.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-600 mb-1">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {broker.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {broker.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                {broker.notes}
              </p>
            </div>
          )}

          {/* Deals */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Deals ({deals.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : deals.length === 0 ? (
              <p className="text-sm text-slate-500">No deals from this broker</p>
            ) : (
              <div className="space-y-2">
                {deals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="block p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">
                          {deal.company_name || 'Unnamed Deal'}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          {formatDate(deal.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deal.verdict && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                            {deal.verdict}
                          </span>
                        )}
                        {deal.final_tier && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            Tier {deal.final_tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Interactions Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Interaction History ({interactions.length})
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : interactions.length === 0 ? (
              <p className="text-sm text-slate-500">No interactions recorded</p>
            ) : (
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <div className="p-2 bg-slate-100 rounded">
                      {getInteractionIcon(interaction.interaction_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-slate-900 capitalize">
                          {interaction.interaction_type.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDate(interaction.interaction_date)}
                        </div>
                      </div>
                      {interaction.notes && (
                        <p className="text-sm text-slate-600 mt-1">{interaction.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
