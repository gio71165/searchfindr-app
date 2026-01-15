// app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../supabaseClient";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatCard } from "@/components/ui/StatCard";
import { ActionButton } from "@/components/ui/ActionButton";
import { DealCard } from "@/components/ui/DealCard";
import { DealListView } from "@/components/ui/DealListView";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDashboardStats } from "./hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Building2,
  TrendingUp,
  FileCheck,
  AlertCircle,
  Upload,
  DollarSign,
  X,
  Filter,
  RefreshCw,
  LogOut,
  Grid3x3,
  List,
  Bookmark,
  Chrome,
  Search as SearchIcon,
  FileText,
} from "lucide-react";

type ConfidenceLevel = "low" | "medium" | "high";

type AIConfidence = {
  level?: ConfidenceLevel | null;
  icon?: "⚠️" | "◑" | "●" | null;
  summary?: string | null;
  signals?: Array<{ label: string; value: string }> | null;
  source?: string | null;
  updated_at?: string | null;
} | null;

type Company = {
  id: string;
  company_name: string | null;
  location_city: string | null;
  location_state: string | null;
  industry: string | null;
  source_type: string | null;
  score: number | null;
  final_tier: string | null;
  created_at: string | null;
  listing_url: string | null;
  is_saved: boolean | null;
  passed_at: string | null;
  owner_name?: string | null;
  ai_summary?: string | null;
  ai_confidence_json?: AIConfidence;
};

const US_STATES = [
  { abbr: "AL", name: "Alabama" },
  { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },
  { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },
  { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

const OFFMARKET_INDUSTRIES = [
  "HVAC",
  "Electrical",
  "Plumbing",
  "Roofing",
  "Landscaping",
  "Pest Control",
  "Commercial Cleaning",
  "Auto Repair",
  "Home Health",
  "Dental / Medical",
  "Logistics / Trucking",
  "Light Manufacturing",
  "Specialty Construction",
];

const ALLOWED_RADIUS = [5, 10, 15, 25, 50, 75, 100];

function isAllowedFinancialFile(file: File) {
  const name = (file.name || "").toLowerCase();
  const mime = file.type || "";
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isCsv = mime === "text/csv" || mime === "application/csv" || name.endsWith(".csv");
  const isXlsx =
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls");
  return isPdf || isCsv || isXlsx;
}

function stripExt(filename: string) {
  return filename.replace(/\.(pdf|csv|xlsx|xls)$/i, "");
}

type SavedFilter = "all" | "saved" | "unsaved";
type SortKey = "newest" | "oldest" | "confidence_high" | "confidence_low" | "name_az" | "name_za";

function tierRank(tier: string | null | undefined): number {
  const t = (tier || "").toUpperCase();
  if (t === "A") return 1;
  if (t === "B") return 2;
  if (t === "C") return 3;
  return 999;
}

function normalizeName(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

function getConfidenceLevel(deal: Company): ConfidenceLevel | null {
  return deal.ai_confidence_json?.level || null;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [loadingDeals, setLoadingDeals] = useState(true);
  const [deals, setDeals] = useState<Company[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Unified filtering (replaces tabs)
  const [searchQuery, setSearchQuery] = useState("");
  // Initialize activeTab from URL parameter if present
  const viewParam = searchParams.get('view');
  const initialTab = (viewParam && ["saved", "on_market", "off_market", "cim_pdf", "financials"].includes(viewParam))
    ? viewParam as "saved" | "on_market" | "off_market" | "cim_pdf" | "financials"
    : "saved";
  const [activeTab, setActiveTab] = useState<"saved" | "on_market" | "off_market" | "cim_pdf" | "financials">(initialTab);
  const [savedFilter, setSavedFilter] = useState<SavedFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [activeStatFilter, setActiveStatFilter] = useState<"none" | "new_today" | "saved" | "high_confidence">("none");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // CIM upload state
  const [cimFile, setCimFile] = useState<File | null>(null);
  const cimInputRef = useRef<HTMLInputElement | null>(null);
  const [cimUploadStatus, setCimUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");

  // Financials upload state
  const [finFile, setFinFile] = useState<File | null>(null);
  const finInputRef = useRef<HTMLInputElement | null>(null);
  const [finUploadStatus, setFinUploadStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [finUploadMsg, setFinUploadMsg] = useState<string | null>(null);

  // Off-market search state
  const [offIndustries, setOffIndustries] = useState<string[]>([]);
  const [offIndustryToAdd, setOffIndustryToAdd] = useState<string>(OFFMARKET_INDUSTRIES[0] ?? "HVAC");
  const [offCity, setOffCity] = useState("");
  const [offState, setOffState] = useState("TX");
  const [offRadiusMiles, setOffRadiusMiles] = useState<number>(10);
  const [offSearching, setOffSearching] = useState(false);
  const [offSearchStatus, setOffSearchStatus] = useState<string | null>(null);

  // Stats
  const stats = useDashboardStats(deals);

  const refreshDeals = useCallback(async () => {
    if (!workspaceId) return;

    setErrorMsg(null);
    setRefreshing(true);

    const { data, error } = await supabase
      .from("companies")
      .select(
        `
          id,
          company_name,
          location_city,
          location_state,
          industry,
          source_type,
          score,
          final_tier,
          listing_url,
          created_at,
          is_saved,
          passed_at,
          owner_name,
          ai_summary,
          ai_confidence_json
        `
      )
      .eq("workspace_id", workspaceId)
      .is("passed_at", null)
      .order("created_at", { ascending: false });

    setRefreshing(false);

    if (error) {
      console.error("refreshDeals error:", error);
      setErrorMsg("Failed to refresh deals.");
      return;
    }

    setDeals((data ?? []) as Company[]);
  }, [workspaceId]);

  // Sync activeTab with URL view parameter
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ["saved", "on_market", "off_market", "cim_pdf", "financials"].includes(viewParam)) {
      setActiveTab(viewParam as "saved" | "on_market" | "off_market" | "cim_pdf" | "financials");
    }
  }, [searchParams]);

  // Auth + initial deals load
  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/");
          return;
        }

        setEmail(user.email ?? null);
        setUserId(user.id);

        setCheckingAuth(false);
        setLoadingDeals(true);
        setErrorMsg(null);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("workspace_id")
          .eq("id", user.id)
          .single();

        if (profileError || !profile?.workspace_id) {
          console.error("profileError:", profileError);
          setErrorMsg("Missing workspace. Please contact support.");
          return;
        }

        setWorkspaceId(profile.workspace_id);

        // Log query details for debugging
        console.log("Fetching deals with:", {
          table: "companies",
          workspace_id: profile.workspace_id,
          filters: {
            workspace_id: profile.workspace_id,
            passed_at: null
          }
        });

        const { data, error } = await supabase
          .from("companies")
          .select(
            `
              id,
              company_name,
              location_city,
              location_state,
              industry,
              source_type,
              score,
              final_tier,
              listing_url,
              created_at,
              is_saved,
              passed_at,
              owner_name,
              ai_summary,
              ai_confidence_json
            `
          )
          .eq("workspace_id", profile.workspace_id)
          .is("passed_at", null)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Full error:", JSON.stringify(error, null, 2));
          console.error("Error code:", error?.code);
          console.error("Error message:", error?.message);
          console.error("Error details:", error?.details);
          console.error("Error hint:", error?.hint);
          console.error("Deal fetch error:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            query: {
              table: "companies",
              workspace_id: profile.workspace_id,
              filters: "workspace_id eq, passed_at is null"
            }
          });
          setErrorMsg(`Failed to load deals: ${error.message || 'Unknown error'}`);
          return;
        }

        setDeals((data ?? []) as Company[]);
      } finally {
        setLoadingDeals(false);
      }
    };

    init();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // Filtering and sorting
  const filteredAndSortedDeals = useMemo(() => {
    let filtered = [...deals];

    // Tab filter
    if (activeTab === "saved") {
      filtered = filtered.filter((deal) => deal.is_saved === true);
    } else if (activeTab === "cim_pdf") {
      filtered = filtered.filter((deal) => deal.source_type === "cim_pdf");
    } else if (activeTab === "financials") {
      filtered = filtered.filter((deal) => deal.source_type === "financials");
    } else if (activeTab === "on_market" || activeTab === "off_market" || activeTab === "cim_pdf") {
      filtered = filtered.filter((deal) => deal.source_type === activeTab);
    }

    // Stat filter
    if (activeStatFilter === "new_today") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter((deal) => {
        if (!deal.created_at) return false;
        return new Date(deal.created_at) >= oneDayAgo;
      });
    } else if (activeStatFilter === "saved") {
      filtered = filtered.filter((deal) => deal.is_saved === true);
    } else if (activeStatFilter === "high_confidence") {
      filtered = filtered.filter((deal) => deal.ai_confidence_json?.level === "high");
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deal) =>
          deal.company_name?.toLowerCase().includes(query) ||
          deal.industry?.toLowerCase().includes(query) ||
          deal.location_city?.toLowerCase().includes(query) ||
          deal.location_state?.toLowerCase().includes(query) ||
          deal.ai_summary?.toLowerCase().includes(query)
      );
    }

    // Saved filter
    if (savedFilter === "saved") {
      filtered = filtered.filter((deal) => deal.is_saved === true);
    } else if (savedFilter === "unsaved") {
      filtered = filtered.filter((deal) => deal.is_saved !== true);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortKey === "newest" || sortKey === "oldest") {
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortKey === "newest" ? bd - ad : ad - bd;
      }

      if (sortKey === "confidence_high" || sortKey === "confidence_low") {
        const aLevel = getConfidenceLevel(a);
        const bLevel = getConfidenceLevel(b);
        const aRank = aLevel === "high" ? 3 : aLevel === "medium" ? 2 : aLevel === "low" ? 1 : 0;
        const bRank = bLevel === "high" ? 3 : bLevel === "medium" ? 2 : bLevel === "low" ? 1 : 0;
        return sortKey === "confidence_high" ? bRank - aRank : aRank - bRank;
      }

      if (sortKey === "name_az" || sortKey === "name_za") {
        const an = normalizeName(a.company_name);
        const bn = normalizeName(b.company_name);
        const cmp = an.localeCompare(bn);
        return sortKey === "name_az" ? cmp : -cmp;
      }

      return 0;
    });

    return filtered;
  }, [deals, activeTab, activeStatFilter, searchQuery, savedFilter, sortKey]);

  // Active filter text
  const activeFilterText = useMemo(() => {
    const parts: string[] = [];
    const tabNames: Record<typeof activeTab, string> = {
      saved: "Saved Deals",
      on_market: "On-Market",
      off_market: "Off-Market",
      cim_pdf: "CIM Uploads",
      financials: "Financials",
    };
    parts.push(tabNames[activeTab]);
    if (activeStatFilter !== "none") {
      const statNames: Record<"saved" | "new_today" | "high_confidence", string> = {
        new_today: "New Today",
        saved: "Saved",
        high_confidence: "High Confidence",
      };
      parts.push(statNames[activeStatFilter]);
    }
    if (searchQuery.trim()) {
      parts.push(`"${searchQuery}"`);
    }
    if (parts.length === 1 && !searchQuery.trim()) return null;
    return `Viewing ${filteredAndSortedDeals.length} ${parts.join(" • ")} deal${filteredAndSortedDeals.length !== 1 ? "s" : ""}`;
  }, [activeTab, activeStatFilter, searchQuery, filteredAndSortedDeals.length]);

  // Bulk actions
  const clearSelection = () => setSelectedIds(new Set());

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkSaveSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setErrorMsg(null);
    setBulkBusy(true);
    try {
      const { error } = await supabase.from("companies").update({ is_saved: true }).in("id", ids);
      if (error) {
        console.error("bulk save error:", error);
        setErrorMsg(error.message || "Failed to save selected companies.");
        return;
      }

      setDeals((prev) => prev.map((d) => (selectedIds.has(d.id) ? { ...d, is_saved: true } : d)));
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkUnsaveSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setErrorMsg(null);
    setBulkBusy(true);
    try {
      const { error } = await supabase.from("companies").update({ is_saved: false }).in("id", ids);
      if (error) {
        console.error("bulk unsave error:", error);
        setErrorMsg(error.message || "Failed to remove selected from Saved.");
        return;
      }

      setDeals((prev) => prev.map((d) => (selectedIds.has(d.id) ? { ...d, is_saved: false } : d)));
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const yes = window.confirm(
      `Delete ${ids.length} deal(s)? This removes them from your workspace and cannot be undone.`
    );
    if (!yes) return;

    setErrorMsg(null);
    setBulkBusy(true);
    try {
      const { error } = await supabase.from("companies").delete().in("id", ids);
      if (error) {
        console.error("bulk delete error:", error);
        setErrorMsg(error.message || "Failed to delete selected deals.");
        return;
      }

      setDeals((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  };

  const handleSaveToggle = async (id: string) => {
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;

    const next = !deal.is_saved;
    const { error } = await supabase.from("companies").update({ is_saved: next }).eq("id", id);
    if (error) {
      console.error("toggle save error:", error);
      setErrorMsg("Failed to update deal.");
      return;
    }

    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, is_saved: next } : d)));
  };

  const handleDelete = async (id: string) => {
    const yes = window.confirm("Delete this deal? This cannot be undone.");
    if (!yes) return;

    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      console.error("delete error:", error);
      setErrorMsg("Failed to delete deal.");
      return;
    }

    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  // Upload handlers
  const handleCimButtonClick = () => cimInputRef.current?.click();
  const handleFinancialsButtonClick = () => finInputRef.current?.click();

  const handleCimFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (file.type !== "application/pdf") {
      setErrorMsg("Please upload a PDF file for the CIM.");
      setCimFile(null);
      setCimUploadStatus("error");
      return;
    }

    if (!userId || !workspaceId) {
      setErrorMsg("User/workspace not loaded yet. Please try again.");
      return;
    }

    setErrorMsg(null);
    setCimFile(file);
    setCimUploadStatus("uploading");

    try {
      const fileExt = file.name.split(".").pop() || "pdf";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage.from("cims").upload(filePath, file);
      if (storageError) {
        console.error("CIM upload error:", storageError);
        setErrorMsg("Failed to upload CIM. Please try again.");
        setCimUploadStatus("error");
        return;
      }

      const cimNameWithoutExt = file.name.replace(/\.pdf$/i, "");

      const { data: insertData, error: insertError } = await supabase
        .from("companies")
        .insert({
          company_name: cimNameWithoutExt || "CIM Deal",
          source_type: "cim_pdf",
          cim_storage_path: storageData?.path || filePath,
          user_id: userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();

      if (insertError || !insertData) {
        console.error("Error inserting CIM company row:", insertError);
        setErrorMsg("CIM uploaded, but failed to create deal record.");
        setCimUploadStatus("error");

        try {
          const pathToRemove = storageData?.path || filePath;
          await supabase.storage.from("cims").remove([pathToRemove]);
        } catch (cleanupErr) {
          console.warn("CIM cleanup failed:", cleanupErr);
        }

        return;
      }

      const newId = insertData.id as string;

      setDeals((prev) => [
        {
          id: newId,
          company_name: cimNameWithoutExt || "CIM Deal",
          location_city: null,
          location_state: null,
          industry: null,
          source_type: "cim_pdf",
          score: null,
          final_tier: null,
          listing_url: null,
          created_at: new Date().toISOString(),
          is_saved: false,
          owner_name: null,
          ai_summary: null,
          ai_confidence_json: null,
          passed_at: null,
        },
        ...prev,
      ]);

      setCimUploadStatus("uploaded");
      setCimFile(null);
      setTimeout(() => setCimUploadStatus("idle"), 3000);
    } catch (err) {
      console.error("Unexpected CIM upload error:", err);
      setErrorMsg("Unexpected error uploading CIM.");
      setCimUploadStatus("error");
    }
  };

  const handleFinancialsFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!isAllowedFinancialFile(file)) {
      setErrorMsg("Please upload a PDF, CSV, or Excel file for Financials.");
      setFinFile(null);
      setFinUploadStatus("error");
      setFinUploadMsg("Invalid file type.");
      return;
    }

    if (!userId || !workspaceId) {
      setErrorMsg("User/workspace not loaded yet. Please try again.");
      setFinUploadStatus("error");
      setFinUploadMsg("Missing user/workspace.");
      return;
    }

    setErrorMsg(null);
    setFinUploadMsg(null);
    setFinFile(file);
    setFinUploadStatus("uploading");

    try {
      const fileExt = (file.name.split(".").pop() || "").toLowerCase() || "pdf";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from("financials")
        .upload(filePath, file);
      if (storageError) {
        console.error("Financials upload error:", storageError);
        setErrorMsg("Failed to upload Financials. Please try again.");
        setFinUploadStatus("error");
        setFinUploadMsg(storageError.message || "Upload failed.");
        return;
      }

      const storedPath = storageData?.path || filePath;

      const baseName = stripExt(file.name || "Financials");
      const dealName = baseName || "Financials";

      const { data: insertData, error: insertError } = await supabase
        .from("companies")
        .insert({
          company_name: dealName,
          source_type: "financials",
          financials_storage_path: storedPath,
          financials_filename: file.name || null,
          financials_mime: file.type || null,
          user_id: userId,
          workspace_id: workspaceId,
        })
        .select("id")
        .single();

      if (insertError || !insertData?.id) {
        console.error("Error inserting Financials company row:", insertError);
        setErrorMsg("Financials uploaded, but failed to create deal record.");
        setFinUploadStatus("error");
        setFinUploadMsg("Deal creation failed.");

        try {
          await supabase.storage.from("financials").remove([storedPath]);
        } catch (cleanupErr) {
          console.warn("Financials cleanup failed:", cleanupErr);
        }

        return;
      }

      const newId = insertData.id as string;

      setDeals((prev) => [
        {
          id: newId,
          company_name: dealName,
          location_city: null,
          location_state: null,
          industry: null,
          source_type: "financials",
          score: null,
          final_tier: null,
          listing_url: null,
          created_at: new Date().toISOString(),
          is_saved: false,
          owner_name: null,
          ai_summary: null,
          ai_confidence_json: null,
          passed_at: null,
        },
        ...prev,
      ]);

      setFinUploadStatus("uploaded");
      setFinUploadMsg("Uploaded & deal created. Open the deal to run Financial Analysis.");
      setFinFile(null);
      setTimeout(() => {
        setFinUploadStatus("idle");
        setFinUploadMsg(null);
      }, 5000);
    } catch (err: any) {
      console.error("Unexpected financials upload error:", err);
      setFinUploadStatus("error");
      setFinUploadMsg(err?.message || "Unexpected error uploading financials.");
    }
  };

  const handleConnectExtension = () => {
    window.open("/extension/callback", "_blank", "noopener,noreferrer");
  };

  // Off-market search
  const addIndustry = () => {
    setOffIndustries((prev) => (prev.includes(offIndustryToAdd) ? prev : [...prev, offIndustryToAdd]));
  };
  const removeIndustry = (ind: string) => {
    setOffIndustries((prev) => prev.filter((x) => x !== ind));
  };

  const handleOffMarketSearch = async () => {
    setErrorMsg(null);
    setOffSearchStatus(null);

    const industries = offIndustries;
    const city = offCity.trim();
    const state = offState.trim();
    const radius = Number(offRadiusMiles);

    if (industries.length === 0) {
      setOffSearchStatus("Please add at least one industry.");
      return;
    }
    if (!city) {
      setOffSearchStatus("Please enter a city.");
      return;
    }
    if (!state || state.length !== 2) {
      setOffSearchStatus("Please select a state.");
      return;
    }
    if (!ALLOWED_RADIUS.includes(radius)) {
      setOffSearchStatus("Please select a valid radius.");
      return;
    }

    setOffSearching(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        setOffSearchStatus("Not signed in.");
        return;
      }

      const res = await fetch("/api/off-market/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ industries, location: `${city}, ${state}`, radius_miles: radius }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setOffSearchStatus(json.error || "Search failed.");
        return;
      }

      const count = typeof json.count === "number" ? json.count : 0;
      setOffSearchStatus(`${count} result(s) added to Off-market (not saved).`);

      await refreshDeals();
    } catch (err: any) {
      console.error("off-market search error:", err);
      setOffSearchStatus(err?.message || "Search failed.");
    } finally {
      setOffSearching(false);
    }
  };


  if (checkingAuth) {
    return (
      <main className="py-16 text-center">
        <p className="text-sm opacity-80">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome{email ? `, ${email.split("@")[0]}` : ""}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Quickly evaluate deals and find the good ones
          </p>
        </div>

      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Building2}
          value={stats.totalDeals}
          label="Total Deals"
          color="blue"
          onClick={() => {
            setActiveTab("saved");
            setActiveStatFilter("none");
            setSavedFilter("all");
            setSearchQuery("");
          }}
          isActive={activeTab === "saved" && activeStatFilter === "none" && savedFilter === "all" && !searchQuery.trim()}
        />
        <StatCard
          icon={Bookmark}
          value={stats.saved}
          label="Saved"
          color="green"
          onClick={() => {
            setActiveTab("saved");
            setActiveStatFilter("none");
            setSavedFilter("saved");
            setSearchQuery("");
          }}
          isActive={activeTab === "saved" && savedFilter === "saved"}
        />
        <StatCard
          icon={TrendingUp}
          value={stats.newToday}
          label="New Today"
          color="purple"
          onClick={() => {
            setActiveStatFilter("new_today");
            setActiveTab("saved");
            setSavedFilter("all");
            setSearchQuery("");
          }}
          isActive={activeStatFilter === "new_today"}
        />
      </section>

      {/* Tab Bar */}
      <section className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-1">
          <button
            onClick={() => {
              setActiveTab("saved");
              setActiveStatFilter("none");
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "saved"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Saved Deals
          </button>
          <button
            onClick={() => {
              setActiveTab("on_market");
              setActiveStatFilter("none");
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "on_market"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            On-Market
          </button>
          <button
            onClick={() => {
              setActiveTab("off_market");
              setActiveStatFilter("none");
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "off_market"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Off-Market
          </button>
          <button
            onClick={() => {
              setActiveTab("cim_pdf");
              setActiveStatFilter("none");
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "cim_pdf"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            CIM Uploads
          </button>
          <button
            onClick={() => {
              setActiveTab("financials");
              setActiveStatFilter("none");
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "financials"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-semibold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Financials
          </button>
        </div>
      </section>

      {/* Hidden file inputs */}
      <input ref={cimInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCimFileChange} />
      <input
        ref={finInputRef}
        type="file"
        accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFinancialsFileChange}
      />

      {/* Upload Status Messages */}
      {cimUploadStatus !== "idle" && (
        <div
          className={`rounded-xl border p-4 ${
            cimUploadStatus === "uploaded"
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : cimUploadStatus === "error"
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          }`}
        >
          <div className="font-semibold">
            {cimUploadStatus === "uploading" && "Uploading CIM…"}
            {cimUploadStatus === "uploaded" && "CIM uploaded successfully!"}
            {cimUploadStatus === "error" && "CIM upload failed"}
          </div>
          {cimFile && <div className="text-sm mt-1">File: {cimFile.name}</div>}
        </div>
      )}

      {finUploadStatus !== "idle" && (
        <div
          className={`rounded-xl border p-4 ${
            finUploadStatus === "uploaded"
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : finUploadStatus === "error"
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
          }`}
        >
          <div className="font-semibold">
            {finUploadStatus === "uploading" && "Uploading Financials…"}
            {finUploadStatus === "uploaded" && "Financials uploaded successfully!"}
            {finUploadStatus === "error" && "Financials upload failed"}
          </div>
          {finUploadMsg && <div className="text-sm mt-1">{finUploadMsg}</div>}
        </div>
      )}


      {/* Tab-Specific Content */}
      <div className="space-y-6">
        {/* Saved Deals Tab */}
        {activeTab === "saved" && (
          <>
            {/* No contextual actions for Saved Deals */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Saved Deals</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "list"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                    title="List view"
                  >
                    <List className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "cards"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                    title="Card view"
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search saved deals..."
                  onClear={() => setSearchQuery("")}
                />
                <div className="flex items-center gap-3">
                  <select
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="confidence_high">Sort: Highest Confidence</option>
                    <option value="confidence_low">Sort: Lowest Confidence</option>
                    <option value="name_az">Sort: Name A-Z</option>
                    <option value="name_za">Sort: Name Z-A</option>
                  </select>
                </div>
              </div>

              {loadingDeals ? (
                viewMode === "list" ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={`skeleton-list-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton height={20} width={20} />
                          <Skeleton height={20} width="30%" />
                          <Skeleton height={20} width="20%" />
                          <Skeleton height={20} width="15%" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <DealCard key={`skeleton-${idx}`} isLoading={true} />
                    ))}
                  </div>
                )
              ) : filteredAndSortedDeals.length === 0 ? (
                <EmptyState
                  icon={Bookmark}
                  title="No saved deals yet"
                  description="Browse on-market listings or search off-market to find acquisition opportunities. Click 'Save' on any deal to add it here."
                  actionLabel="Browse On-Market"
                  onAction={() => setActiveTab("on_market")}
                  secondaryActionLabel="Search Off-Market"
                  onSecondaryAction={() => setActiveTab("off_market")}
                />
              ) : viewMode === "list" ? (
                <DealListView
                  deals={filteredAndSortedDeals}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleOne}
                  onSaveToggle={handleSaveToggle}
                  onDelete={handleDelete}
                  fromView={activeTab}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedDeals.map((deal) => (
                    <div key={deal.id} className="relative">
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleOne(deal.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <DealCard deal={deal} onSaveToggle={handleSaveToggle} onDelete={handleDelete} fromView={activeTab} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* On-Market Tab */}
        {activeTab === "on_market" && (
          <>
            {/* Coming Soon Banner */}
            <section className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 mb-6">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="text-lg mr-2">📢</span>
                <strong>Browse All Listings (Coming Soon)</strong> - Search BizBuySell, Synergy, and more directly from SearchFindr
              </p>
            </section>

            <section className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
                  <Chrome className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Use the Chrome Extension to capture deals
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    Connect the SearchFindr Chrome extension to save deals directly from BizBuySell, Synergy, and other broker sites.
                  </p>
                  <button
                    onClick={handleConnectExtension}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Connect Extension
                  </button>
                </div>
              </div>
            </section>

            {/* Refresh Banner - Important Notice */}
            <section className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    📢 Important: Refresh Required After Sending Deals
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
                    After using the Chrome extension to send a deal to SearchFindr, you <strong>must refresh this page</strong> to see the new deal appear in your list. The deal won't show up automatically until you refresh.
                  </p>
                  <button
                    onClick={refreshDeals}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Deals Now'}
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">On-Market Deals</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshDeals}
                    disabled={refreshing}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    title="Refresh deals list"
                  >
                    <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "list"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "cards"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search on-market deals..."
                  onClear={() => setSearchQuery("")}
                />
                <div className="flex items-center gap-3">
                  <select
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="confidence_high">Sort: Highest Confidence</option>
                    <option value="confidence_low">Sort: Lowest Confidence</option>
                    <option value="name_az">Sort: Name A-Z</option>
                    <option value="name_za">Sort: Name Z-A</option>
                  </select>
                </div>
              </div>

              {loadingDeals ? (
                viewMode === "list" ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={`skeleton-list-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton height={20} width={20} />
                          <Skeleton height={20} width="30%" />
                          <Skeleton height={20} width="20%" />
                          <Skeleton height={20} width="15%" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <DealCard key={`skeleton-${idx}`} isLoading={true} />
                    ))}
                  </div>
                )
              ) : filteredAndSortedDeals.length === 0 ? (
                <EmptyState
                  icon={Chrome}
                  title="Ready to capture on-market deals?"
                  description="Connect the SearchFindr Chrome extension to save deals directly from BizBuySell, Synergy, and other broker sites."
                  actionLabel="Connect Extension"
                  onAction={handleConnectExtension}
                />
              ) : viewMode === "list" ? (
                <DealListView
                  deals={filteredAndSortedDeals}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleOne}
                  onSaveToggle={handleSaveToggle}
                  onDelete={handleDelete}
                  fromView={activeTab}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedDeals.map((deal) => (
                    <div key={deal.id} className="relative">
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleOne(deal.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <DealCard deal={deal} onSaveToggle={handleSaveToggle} onDelete={handleDelete} fromView={activeTab} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Off-Market Tab */}
        {activeTab === "off_market" && (
          <>
            <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h2 className="text-lg font-semibold mb-4">Off-Market Discovery</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Add industries + enter city/state + radius. Results appear in Off-market as leads.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Industries</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <select
                        className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={offIndustryToAdd}
                        onChange={(e) => setOffIndustryToAdd(e.target.value)}
                      >
                        {OFFMARKET_INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind}>
                            {ind}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        onClick={addIndustry}
                      >
                        Add
                      </button>
                    </div>

                    {offIndustries.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {offIndustries.map((ind) => (
                          <span
                            key={ind}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-sm"
                          >
                            <span className="font-semibold">{ind}</span>
                            <button
                              type="button"
                              className="text-xs underline opacity-80 hover:opacity-100"
                              onClick={() => removeIndustry(ind)}
                            >
                              remove
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm opacity-70">Add at least one industry to search.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">City</label>
                    <input
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={offCity}
                      onChange={(e) => setOffCity(e.target.value)}
                      placeholder="e.g. Austin"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">State</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={offState}
                      onChange={(e) => setOffState(e.target.value)}
                    >
                      {US_STATES.map((s) => (
                        <option key={s.abbr} value={s.abbr}>
                          {s.abbr} — {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Radius (miles)</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={offRadiusMiles}
                      onChange={(e) => setOffRadiusMiles(Number(e.target.value))}
                    >
                      {ALLOWED_RADIUS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleOffMarketSearch}
                    disabled={offSearching}
                  >
                    {offSearching ? "Searching…" : "Search"}
                  </button>
                  {offSearchStatus && (
                    <span className="text-sm text-slate-600 dark:text-slate-400">{offSearchStatus}</span>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Off-Market Deals</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "list"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "cards"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search off-market deals..."
                  onClear={() => setSearchQuery("")}
                />
                <div className="flex items-center gap-3">
                  <select
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="confidence_high">Sort: Highest Confidence</option>
                    <option value="confidence_low">Sort: Lowest Confidence</option>
                    <option value="name_az">Sort: Name A-Z</option>
                    <option value="name_za">Sort: Name Z-A</option>
                  </select>
                </div>
              </div>

              {loadingDeals ? (
                viewMode === "list" ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={`skeleton-list-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton height={20} width={20} />
                          <Skeleton height={20} width="30%" />
                          <Skeleton height={20} width="20%" />
                          <Skeleton height={20} width="15%" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <DealCard key={`skeleton-${idx}`} isLoading={true} />
                    ))}
                  </div>
                )
              ) : filteredAndSortedDeals.length === 0 ? (
                <EmptyState
                  icon={SearchIcon}
                  title="Find owner-operated businesses"
                  description="Use the search above to discover local SMBs by industry and location. We'll pull business info and generate initial analysis."
                  actionLabel="Start Searching"
                  onAction={() => {
                    // Scroll to search panel
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ) : viewMode === "list" ? (
                <DealListView
                  deals={filteredAndSortedDeals}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleOne}
                  onSaveToggle={handleSaveToggle}
                  onDelete={handleDelete}
                  fromView={activeTab}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedDeals.map((deal) => (
                    <div key={deal.id} className="relative">
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleOne(deal.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <DealCard deal={deal} onSaveToggle={handleSaveToggle} onDelete={handleDelete} fromView={activeTab} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* CIM Uploads Tab */}
        {activeTab === "cim_pdf" && (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Upload CIM</h2>
              <ActionButton
                icon={Upload}
                label="Upload CIM"
                description="Upload a CIM PDF to generate an AI investment memo"
                onClick={handleCimButtonClick}
                variant="primary"
              />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">CIM Uploads</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "list"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "cards"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search CIM uploads..."
                  onClear={() => setSearchQuery("")}
                />
                <div className="flex items-center gap-3">
                  <select
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="confidence_high">Sort: Highest Confidence</option>
                    <option value="confidence_low">Sort: Lowest Confidence</option>
                    <option value="name_az">Sort: Name A-Z</option>
                    <option value="name_za">Sort: Name Z-A</option>
                  </select>
                </div>
              </div>

              {loadingDeals ? (
                viewMode === "list" ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={`skeleton-list-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton height={20} width={20} />
                          <Skeleton height={20} width="30%" />
                          <Skeleton height={20} width="20%" />
                          <Skeleton height={20} width="15%" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <DealCard key={`skeleton-${idx}`} isLoading={true} />
                    ))}
                  </div>
                )
              ) : filteredAndSortedDeals.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Upload deal documents"
                  description="Drop a CIM PDF to generate an AI investment memo."
                  actionLabel="Upload CIM"
                  onAction={handleCimButtonClick}
                />
              ) : viewMode === "list" ? (
                <DealListView
                  deals={filteredAndSortedDeals}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleOne}
                  onSaveToggle={handleSaveToggle}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedDeals.map((deal) => (
                    <div key={deal.id} className="relative">
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleOne(deal.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <DealCard deal={deal} onSaveToggle={handleSaveToggle} onDelete={handleDelete} fromView={activeTab} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Financials Tab */}
        {activeTab === "financials" && (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Upload Financials</h2>
              <ActionButton
                icon={DollarSign}
                label="Upload Financials"
                description="Upload financials to run a skeptical quality analysis"
                onClick={handleFinancialsButtonClick}
                variant="success"
              />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Financials</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "list"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === "cards"
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                        : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search financials uploads..."
                  onClear={() => setSearchQuery("")}
                />
                <div className="flex items-center gap-3">
                  <select
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="confidence_high">Sort: Highest Confidence</option>
                    <option value="confidence_low">Sort: Lowest Confidence</option>
                    <option value="name_az">Sort: Name A-Z</option>
                    <option value="name_za">Sort: Name Z-A</option>
                  </select>
                </div>
              </div>

              {loadingDeals ? (
                viewMode === "list" ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={`skeleton-list-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton height={20} width={20} />
                          <Skeleton height={20} width="30%" />
                          <Skeleton height={20} width="20%" />
                          <Skeleton height={20} width="15%" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <DealCard key={`skeleton-${idx}`} isLoading={true} />
                    ))}
                  </div>
                )
              ) : filteredAndSortedDeals.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="Upload financial statements"
                  description="Drop financial PDFs for quality analysis and red flag detection."
                  actionLabel="Upload Financials"
                  onAction={handleFinancialsButtonClick}
                />
              ) : viewMode === "list" ? (
                <DealListView
                  deals={filteredAndSortedDeals}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleOne}
                  onSaveToggle={handleSaveToggle}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedDeals.map((deal) => (
                    <div key={deal.id} className="relative">
                      <div className="absolute top-4 left-4 z-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleOne(deal.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>
                      <DealCard deal={deal} onSaveToggle={handleSaveToggle} onDelete={handleDelete} fromView={activeTab} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedIds.size} selected</span>
          <button
            onClick={clearSelection}
            className="text-sm text-slate-600 dark:text-slate-400 hover:underline"
          >
            Clear
          </button>
          <button
            onClick={bulkSaveSelected}
            disabled={bulkBusy}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {bulkBusy ? "Working…" : "Save Selected"}
          </button>
          <button
            onClick={bulkDeleteSelected}
            disabled={bulkBusy}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
          >
            {bulkBusy ? "Working…" : "Delete Selected"}
          </button>
        </div>
      )}
    </main>
  );
}
