import { useState, useEffect } from "react";
import {
    Plus, Trash2, Send, Eye, Loader2, CheckCircle, XCircle,
    Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
    FileText, Type, Image, Video, Phone, Link, List, Copy, Zap, Upload, Check
} from "lucide-react";
import * as api from "../lib/api";
import MediaUploadModal from "../components/MediaUploadModal";
import MediaAssetManager from "../components/MediaAssetManager";

// ─── ToggleSwitch component ───────────────────────────────────────────────────
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={`relative inline-flex items-center flex-shrink-0 h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-slate-200'
                }`}
            role="switch"
            aria-checked={enabled}
        >
            <span
                className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
            />
        </button>
    );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
type HeaderFormat = "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "COPY_CODE";
type Category = "MARKETING" | "UTILITY" | "AUTHENTICATION";

interface Button {
    type: ButtonType;
    text: string;
    url?: string;
    phone_number?: string;
}

interface TemplateForm {
    name: string;
    category: Category;
    language: string;
    headerEnabled: boolean;
    headerFormat: HeaderFormat;
    headerText: string;
    headerMediaAssetId?: number;
    headerMediaAssetName?: string;
    body: string;
    footerEnabled: boolean;
    footer: string;
    buttonsEnabled: boolean;
    buttons: Button[];
}

interface MetaTemplate {
    id: string;
    name: string;
    status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
    category: string;
    language: string;
    components: any[];
    quality_score?: { score: string };
    rejected_reason?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LANGUAGES = [
    { code: "en_US", label: "English (US)" },
    { code: "en_GB", label: "English (UK)" },
    { code: "hi", label: "Hindi" },
    { code: "ml", label: "Malayalam" },
    { code: "ta", label: "Tamil" },
    { code: "te", label: "Telugu" },
    { code: "kn", label: "Kannada" },
    { code: "mr", label: "Marathi" },
    { code: "gu", label: "Gujarati" },
    { code: "bn", label: "Bengali" },
    { code: "de", label: "German" },
    { code: "fr", label: "French" },
    { code: "ar", label: "Arabic" },
    { code: "es", label: "Spanish" },
];

const CATEGORIES: { value: Category; label: string; desc: string; icon: string }[] = [
    { value: "MARKETING", label: "Marketing", desc: "Promotions, offers, announcements", icon: "📣" },
    { value: "UTILITY", label: "Utility", desc: "Order updates, account alerts", icon: "⚙️" },
    { value: "AUTHENTICATION", label: "Authentication", desc: "OTP, verification codes", icon: "🔐" },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    APPROVED: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle, label: "Approved" },
    PENDING: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock, label: "Pending Review" },
    REJECTED: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle, label: "Rejected" },
    PAUSED: { color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: AlertTriangle, label: "Paused" },
    DISABLED: { color: "text-slate-500", bg: "bg-slate-50 border-slate-200", icon: AlertTriangle, label: "Disabled" },
};

const EMPTY_FORM: TemplateForm = {
    name: "",
    category: "MARKETING",
    language: "en_US",
    headerEnabled: false,
    headerFormat: "TEXT",
    headerText: "",
    headerMediaAssetId: undefined,
    headerMediaAssetName: undefined,
    body: "",
    footerEnabled: false,
    footer: "",
    buttonsEnabled: false,
    buttons: [],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildComponents(form: TemplateForm, mediaHandle?: string | null) {
    const components: any[] = [];

    if (form.headerEnabled) {
        if (form.headerFormat === "TEXT" && form.headerText.trim()) {
            components.push({ type: "HEADER", format: "TEXT", text: form.headerText.trim() });
        } else if (form.headerFormat !== "TEXT") {
            // For IMAGE, VIDEO, DOCUMENT - Meta requires an example with a handle/URL
            const headerComponent: any = { type: "HEADER", format: form.headerFormat };
            
            // Meta requires example field with at least one valid value
            const exampleValue = mediaHandle || "placeholder";
            headerComponent.example = {
                header_handle: [exampleValue]
            };
            
            components.push(headerComponent);
        }
    }

    if (form.body.trim()) {
        const bodyText = form.body.trim();
        const component: any = { type: "BODY", text: bodyText };

        // Find maximum variable number used, e.g., {{2}}
        const variableMatches = bodyText.match(/\{\{(\d+)\}\}/g);
        if (variableMatches && variableMatches.length > 0) {
            let maxVar = 0;
            for (const match of variableMatches) {
                const num = parseInt(match.replace(/[^0-9]/g, ''), 10);
                if (num > maxVar) maxVar = num;
            }
            if (maxVar > 0) {
                // Generate default examples: ["Example 1", "Example 2", ...]
                const examples = Array.from({ length: maxVar }).map((_, i) => `Sample ${i + 1}`);
                component.example = { body_text: [examples] };
            }
        }

        components.push(component);
    }

    if (form.footerEnabled && form.footer.trim()) {
        components.push({ type: "FOOTER", text: form.footer.trim() });
    }

    if (form.buttonsEnabled && form.buttons.length > 0) {
        const buttons = form.buttons.map(b => {
            if (b.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: b.text };
            if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
            if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number };
            if (b.type === "COPY_CODE") return { type: "COPY_CODE", example: b.text };
            return b;
        });
        components.push({ type: "BUTTONS", buttons });
    }

    return components;
}

function getBodyFromComponents(components: any[]) {
    return components?.find(c => c.type === "BODY")?.text || "";
}
function getHeaderFromComponents(components: any[]) {
    return components?.find(c => c.type === "HEADER");
}
function getFooterFromComponents(components: any[]) {
    return components?.find(c => c.type === "FOOTER")?.text || "";
}
function getButtonsFromComponents(components: any[]) {
    return components?.find(c => c.type === "BUTTONS")?.buttons || [];
}

// ─── Template Preview ────────────────────────────────────────────────────────

function TemplatePreview({ form }: { form: TemplateForm }) {
    return (
        <div className="bg-[#ECE5DD] rounded-xl p-4 min-h-[200px] flex flex-col gap-2">
            <div className="text-[10px] text-center text-[#8A9BA8] font-medium mb-1">WhatsApp Preview</div>
            <div className="bg-white rounded-xl rounded-tl-none px-4 py-3 shadow-sm max-w-[85%] space-y-2">
                {/* Header */}
                {form.headerEnabled && (
                    <div className="font-semibold text-slate-800 text-sm">
                        {form.headerFormat === "TEXT" ? (
                            <span>{form.headerText || <span className="text-slate-300 italic">Header text…</span>}</span>
                        ) : form.headerFormat === "IMAGE" ? (
                            <div className="bg-slate-100 rounded-lg h-24 flex items-center justify-center text-slate-400 text-xs gap-1">
                                <Image className="w-4 h-4" /> {form.headerMediaAssetName || "Select image…"}
                            </div>
                        ) : form.headerFormat === "VIDEO" ? (
                            <div className="bg-slate-100 rounded-lg h-24 flex items-center justify-center text-slate-400 text-xs gap-1">
                                <Video className="w-4 h-4" /> {form.headerMediaAssetName || "Select video…"}
                            </div>
                        ) : (
                            <div className="bg-slate-100 rounded-lg p-3 flex items-center gap-2 text-xs text-slate-500">
                                <FileText className="w-4 h-4" /> {form.headerMediaAssetName || "Select document…"}
                            </div>
                        )}
                    </div>
                )}

                {/* Body */}
                <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                    {form.body || <span className="text-slate-300 italic">Message body will appear here…</span>}
                </p>

                {/* Footer */}
                {form.footerEnabled && form.footer && (
                    <p className="text-slate-400 text-xs">{form.footer}</p>
                )}

                {/* Timestamp */}
                <div className="text-right text-[10px] text-slate-400">12:30 PM ✓✓</div>
            </div>

            {/* Buttons */}
            {form.buttonsEnabled && form.buttons.length > 0 && (
                <div className="flex flex-col gap-1.5 max-w-[85%]">
                    {form.buttons.map((btn, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-xl px-4 py-2 text-center text-blue-600 text-sm font-medium shadow-sm flex items-center justify-center gap-1.5"
                        >
                            {btn.type === "URL" && <Link className="w-3.5 h-3.5" />}
                            {btn.type === "PHONE_NUMBER" && <Phone className="w-3.5 h-3.5" />}
                            {btn.type === "COPY_CODE" && <Copy className="w-3.5 h-3.5" />}
                            {btn.text || `Button ${i + 1}`}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Template Card (existing) ────────────────────────────────────────────────

function TemplateCard({ template, onDelete }: { template: MetaTemplate; onDelete: (name: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const cfg = STATUS_CONFIG[template.status] || STATUS_CONFIG.PENDING;
    const StatusIcon = cfg.icon;
    const body = getBodyFromComponents(template.components);
    const header = getHeaderFromComponents(template.components);
    const footer = getFooterFromComponents(template.components);
    const buttons = getButtonsFromComponents(template.components);

    const handleDelete = async () => {
        if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await (api as any).deleteMetaTemplate(template.name);
            onDelete(template.name);
        } catch (e: any) {
            alert(`Failed to delete: ${e?.response?.data?.details || e.message}`);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-sm font-bold text-slate-800 truncate">{template.name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full font-medium">{template.category}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full font-medium">{template.language}</span>
                        {buttons.length > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{buttons.length} button{buttons.length > 1 ? 's' : ''}</span>
                        )}
                    </div>
                    {template.status === "REJECTED" && template.rejected_reason && (
                        <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                            ⚠️ {template.rejected_reason}
                        </p>
                    )}
                    {body && (
                        <p className={`mt-2 text-xs text-slate-600 ${!expanded ? 'line-clamp-2' : ''}`}>{body}</p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        title="View details"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete template"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
                    {header && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Header ({header.format})</span>
                            <p className="text-sm text-slate-700 mt-1 font-medium">{header.text || `[${header.format}]`}</p>
                        </div>
                    )}
                    {body && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Body</span>
                            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{body}</p>
                        </div>
                    )}
                    {footer && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Footer</span>
                            <p className="text-sm text-slate-500 mt-1">{footer}</p>
                        </div>
                    )}
                    {buttons.length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buttons</span>
                            <div className="mt-1 space-y-1">
                                {buttons.map((btn: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-3 py-1.5">
                                        <span className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono">{btn.type}</span>
                                        <span className="font-medium text-slate-700">{btn.text}</span>
                                        {btn.url && <span className="text-blue-500 truncate">{btn.url}</span>}
                                        {btn.phone_number && <span className="text-green-600">{btn.phone_number}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="text-[10px] text-slate-400">ID: {template.id}</div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TemplateManager = () => {
    const [tab, setTab] = useState<"list" | "create" | "assets">("list");
    const [templates, setTemplates] = useState<MetaTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [form, setForm] = useState<TemplateForm>({ ...EMPTY_FORM });
    const [submitting, setSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
    const [charCount, setCharCount] = useState(0);
    const [showMediaUpload, setShowMediaUpload] = useState(false);
    const [mediaUploadType, setMediaUploadType] = useState<'IMAGE' | 'VIDEO' | 'DOCUMENT'>('IMAGE');

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await (api as any).listMetaTemplates();
            setTemplates(res.templates || []);
        } catch (e: any) {
            console.error("Failed to load templates:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTemplates(); }, []);
    useEffect(() => { setCharCount(form.body.length); }, [form.body]);

    const filteredTemplates = filterStatus === "ALL"
        ? templates
        : templates.filter(t => t.status === filterStatus);

    const stats = {
        total: templates.length,
        approved: templates.filter(t => t.status === "APPROVED").length,
        pending: templates.filter(t => t.status === "PENDING").length,
        rejected: templates.filter(t => t.status === "REJECTED").length,
    };

    const setField = (field: keyof TemplateForm, value: any) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setSubmitResult(null);
    };

    const addButton = (type: ButtonType) => {
        if (form.buttons.length >= 3) return;
        setField("buttons", [...form.buttons, { type, text: "", url: "", phone_number: "" }]);
    };

    const updateButton = (index: number, field: string, value: string) => {
        const updated = [...form.buttons];
        updated[index] = { ...updated[index], [field]: value };
        setField("buttons", updated);
    };

    const removeButton = (index: number) => {
        setField("buttons", form.buttons.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert("Template name is required");
        if (!/^[a-z0-9_]+$/.test(form.name)) return alert("Name must be lowercase letters, numbers, and underscores only");
        if (!form.body.trim()) return alert("Body text is required");
        
        // Validate media selection if header is enabled with non-TEXT format
        if (form.headerEnabled && form.headerFormat !== "TEXT" && !form.headerMediaAssetId) {
            return alert(`Please upload or select a ${form.headerFormat} file for the header`);
        }

        setSubmitting(true);
        setSubmitResult(null);
        try {
            // If media is selected, fetch its details to get the Meta media ID or handle
            let mediaHandle: string | null = null;
            let mediaAssetData: any = null;
            if (form.headerMediaAssetId) {
                try {
                    mediaAssetData = await (api as any).getTemplateAsset(form.headerMediaAssetId);
                    // Use handle if available, otherwise use meta_media_id
                    mediaHandle = mediaAssetData.handle || mediaAssetData.meta_media_id;
                    if (!mediaHandle) {
                        return alert("Media asset is missing ID/handle - please re-upload");
                    }
                    console.log("📦 Media Asset:", { 
                        id: mediaAssetData.id, 
                        handle: mediaAssetData.handle, 
                        meta_media_id: mediaAssetData.meta_media_id,
                        using: mediaHandle 
                    });
                } catch (err) {
                    console.error("Media fetch error:", err);
                    return alert("Failed to retrieve media asset details");
                }
            }
            
            const components = buildComponents(form, mediaHandle);
            await (api as any).createMetaTemplate({
                name: form.name,
                category: form.category,
                language: form.language,
                components,
            });
            setSubmitResult({
                success: true,
                message: `Template "${form.name}" submitted for review! Meta usually approves templates within a few minutes to hours.`
            });
            setForm({ ...EMPTY_FORM });
            // Refresh list
            setTimeout(() => { fetchTemplates(); setTab("list"); }, 2000);
        } catch (e: any) {
            const detail = e?.response?.data?.details || e?.message || "Unknown error";
            setSubmitResult({ success: false, message: detail });
        } finally {
            setSubmitting(false);
        }
    };

    const insertVariable = () => {
        const varNum = (form.body.match(/\{\{\d+\}\}/g) || []).length + 1;
        setField("body", form.body + `{{${varNum}}}`);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    Template Manager
                </h1>
                <p className="text-slate-500 text-sm mt-1">Create and manage WhatsApp message templates — reviewed and approved by Meta</p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                    { label: "Total", value: stats.total, color: "text-slate-700", bg: "bg-white" },
                    { label: "Approved", value: stats.approved, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Pending", value: stats.pending, color: "text-amber-700", bg: "bg-amber-50" },
                    { label: "Rejected", value: stats.rejected, color: "text-red-700", bg: "bg-red-50" },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border border-slate-200 rounded-xl p-3 text-center`}>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setTab("list")}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "list" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                >
                    📋 All Templates
                </button>
                <button
                    onClick={() => setTab("create")}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "create" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                >
                    <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Create New Template</span>
                </button>
                <button
                    onClick={() => setTab("assets")}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === "assets" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                >
                    <span className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Media Assets</span>
                </button>
            </div>

            {/* Media Upload Modal */}
            <MediaUploadModal
                isOpen={showMediaUpload}
                onClose={() => setShowMediaUpload(false)}
                assetType={mediaUploadType}
                onSuccess={(media) => {
                    setField("headerMediaAssetId", media.id);
                    setField("headerMediaAssetName", media.asset_name);
                    setShowMediaUpload(false);
                }}
            />

            {/* ── LIST TAB ── */}
            {tab === "list" && (
                <div>
                    {/* Filter + Refresh */}
                    <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                        <div className="flex gap-1.5 flex-wrap">
                            {["ALL", "APPROVED", "PENDING", "REJECTED"].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${filterStatus === s
                                        ? "bg-slate-800 text-white border-slate-800"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                        }`}
                                >
                                    {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label}
                                    <span className="ml-1.5 opacity-70">
                                        {s === "ALL" ? stats.total : templates.filter(t => t.status === s).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={fetchTemplates}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No templates found</p>
                            <p className="text-sm mt-1">Create your first template using the "Create New Template" tab</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredTemplates.map(t => (
                                <TemplateCard
                                    key={t.id}
                                    template={t}
                                    onDelete={name => setTemplates(prev => prev.filter(t => t.name !== name))}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── CREATE TAB ── */}
            {tab === "create" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* Left: Form */}
                    <div className="space-y-5">

                        {/* Submit Result */}
                        {submitResult && (
                            <div className={`p-4 rounded-xl border flex items-start gap-3 ${submitResult.success
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-red-50 border-red-200 text-red-800"
                                }`}>
                                {submitResult.success
                                    ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                }
                                <p className="text-sm font-medium">{submitResult.message}</p>
                            </div>
                        )}

                        {/* Name + Category */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                <Type className="w-4 h-4 text-slate-400" /> Basic Info
                            </h3>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Template Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. welcome_message"
                                    value={form.name}
                                    onChange={e => setField("name", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Lowercase letters, numbers, and underscores only. Cannot be changed after creation.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Category *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setField("category", cat.value)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${form.category === cat.value
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                        >
                                            <div className="text-lg">{cat.icon}</div>
                                            <div className="text-xs font-bold text-slate-700 mt-1">{cat.label}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{cat.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Language *</label>
                                <select
                                    value={form.language}
                                    onChange={e => setField("language", e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                    {LANGUAGES.map(l => (
                                        <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Header Section */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <Image className="w-4 h-4 text-slate-400" /> Header
                                    <span className="text-xs text-slate-400 font-normal">(optional)</span>
                                </h3>
                                <ToggleSwitch enabled={form.headerEnabled} onChange={() => setField("headerEnabled", !form.headerEnabled)} />
                            </div>

                            {form.headerEnabled && (
                                <>
                                    <div className="flex gap-2">
                                        {(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"] as HeaderFormat[]).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setField("headerFormat", f)}
                                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${form.headerFormat === f
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                    }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                    {form.headerFormat === "TEXT" && (
                                        <input
                                            type="text"
                                            placeholder="Header text (max 60 chars)"
                                            maxLength={60}
                                            value={form.headerText}
                                            onChange={e => setField("headerText", e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    )}
                                    {form.headerFormat !== "TEXT" && (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setMediaUploadType(form.headerFormat as 'IMAGE' | 'VIDEO' | 'DOCUMENT');
                                                        setShowMediaUpload(true);
                                                    }}
                                                    className="flex-1 px-3 py-2 text-xs font-semibold border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                    Upload {form.headerFormat}
                                                </button>
                                            </div>
                                            {form.headerMediaAssetName && (
                                                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                    <div className="text-xs text-emerald-700">
                                                        <span className="font-semibold">Selected:</span> {form.headerMediaAssetName}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setField("headerMediaAssetId", undefined);
                                                            setField("headerMediaAssetName", undefined);
                                                        }}
                                                        className="ml-auto px-2 py-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                📎 Upload your {form.headerFormat.toLowerCase()} using the upload button above. It will be stored on Meta's servers for template use.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Body Section */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <Type className="w-4 h-4 text-slate-400" /> Body *
                                </h3>
                                <button
                                    onClick={insertVariable}
                                    className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                                >
                                    {'+ Add Variable {{n}}'}
                                </button>
                            </div>
                            <textarea
                                rows={5}
                                placeholder="Type your message body here. Use {{1}}, {{2}} for dynamic variables (e.g. customer name, dates)."
                                value={form.body}
                                onChange={e => setField("body", e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] text-slate-400">
                                    Supports *bold*, _italic_. For variables, use {`{{1}}`}, {`{{2}}`}, etc.
                                </p>
                                <span className={`text-xs font-mono ${charCount > 1024 ? "text-red-500" : "text-slate-400"}`}>
                                    {charCount}/1024
                                </span>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <List className="w-4 h-4 text-slate-400" /> Footer
                                    <span className="text-xs text-slate-400 font-normal">(optional)</span>
                                </h3>
                                <ToggleSwitch enabled={form.footerEnabled} onChange={() => setField("footerEnabled", !form.footerEnabled)} />
                            </div>
                            {form.footerEnabled && (
                                <input
                                    type="text"
                                    placeholder="Footer text (max 60 chars)"
                                    maxLength={60}
                                    value={form.footer}
                                    onChange={e => setField("footer", e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            )}
                        </div>

                        {/* Buttons Section */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                    <Send className="w-4 h-4 text-slate-400" /> Buttons
                                    <span className="text-xs text-slate-400 font-normal">(up to 3)</span>
                                </h3>
                                <ToggleSwitch enabled={form.buttonsEnabled} onChange={() => setField("buttonsEnabled", !form.buttonsEnabled)} />
                            </div>

                            {form.buttonsEnabled && (
                                <>
                                    {form.buttons.map((btn, i) => (
                                        <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                                            <div className="flex items-center justify-between">
                                                <select
                                                    value={btn.type}
                                                    onChange={e => updateButton(i, "type", e.target.value)}
                                                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-blue-500"
                                                >
                                                    <option value="QUICK_REPLY">Quick Reply</option>
                                                    <option value="URL">Visit URL</option>
                                                    <option value="PHONE_NUMBER">Call Phone</option>
                                                    <option value="COPY_CODE">Copy Code</option>
                                                </select>
                                                <button onClick={() => removeButton(i)} className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Button label"
                                                maxLength={25}
                                                value={btn.text}
                                                onChange={e => updateButton(i, "text", e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
                                            />
                                            {btn.type === "URL" && (
                                                <input
                                                    type="url"
                                                    placeholder="https://example.com"
                                                    value={btn.url || ""}
                                                    onChange={e => updateButton(i, "url", e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
                                                />
                                            )}
                                            {btn.type === "PHONE_NUMBER" && (
                                                <input
                                                    type="tel"
                                                    placeholder="+919876543210"
                                                    value={btn.phone_number || ""}
                                                    onChange={e => updateButton(i, "phone_number", e.target.value)}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500"
                                                />
                                            )}
                                        </div>
                                    ))}

                                    {form.buttons.length < 3 && (
                                        <div className="flex gap-2 flex-wrap">
                                            {(["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"] as ButtonType[]).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => addButton(type)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    {type === "QUICK_REPLY" ? "Quick Reply" : type === "URL" ? "URL" : type === "PHONE_NUMBER" ? "Phone" : "Copy Code"}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !form.name || !form.body}
                            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting to Meta…</>
                            ) : (
                                <><Send className="w-4 h-4" /> Submit Template for Approval</>
                            )}
                        </button>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">📋 Meta Review Process</h4>
                            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                                <li>Templates are reviewed by Meta, usually within a few minutes to 24 hours</li>
                                <li>Marketing templates may take longer than Utility templates</li>
                                <li>Templates with promotional language, URLs, or phone numbers need careful review</li>
                                <li>Rejected templates can be edited and resubmitted</li>
                                <li>Once approved, templates appear in the "All Templates" tab</li>
                            </ul>
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className="xl:sticky xl:top-6 h-fit">
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                <Eye className="w-4 h-4 text-slate-400" /> Live Preview
                            </h3>
                            <TemplatePreview form={form} />
                            {/* Meta guidelines */}
                            <div className="space-y-1.5">
                                <div className={`flex items-center gap-2 text-xs ${form.name ? "text-emerald-600" : "text-slate-400"}`}>
                                    {form.name ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    Template name (lowercase/underscore)
                                </div>
                                <div className={`flex items-center gap-2 text-xs ${form.body.length > 0 && form.body.length <= 1024 ? "text-emerald-600" : "text-slate-400"}`}>
                                    {form.body.length > 0 && form.body.length <= 1024 ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    Body text (1–1024 chars): {form.body.length}/1024
                                </div>
                                <div className={`flex items-center gap-2 text-xs ${form.buttons.length <= 3 ? "text-emerald-600" : "text-red-500"}`}>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Buttons (max 3): {form.buttons.length}/3
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ASSETS TAB ── */}
            {tab === "assets" && (
                <div>
                    <MediaAssetManager
                        onSelectAsset={(asset) => {
                            setField("headerMediaAssetId", asset.id);
                            setField("headerMediaAssetName", asset.asset_name);
                            setTab("create");
                        }}
                        selectable={true}
                    />
                </div>
            )}
        </div>
    );
};

export default TemplateManager;
