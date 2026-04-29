import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, FileText, Image, Video, Plus, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import * as api from '../lib/api';
import MediaUploadModal from './MediaUploadModal';

interface MediaAssetManagerProps {
    assetType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    onSelectAsset?: (asset: any) => void;
    selectable?: boolean;
}

const MediaAssetManager: React.FC<MediaAssetManagerProps> = ({
    assetType,
    onSelectAsset,
    selectable = false
}) => {
    const queryClient = useQueryClient();
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set());

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['template-assets', assetType],
        queryFn: () => api.getTemplateAssets(assetType),
        refetchInterval: 5000
    });

    const deleteMutation = useMutation({
        mutationFn: (assetId: number) => api.deleteTemplateAsset(assetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['template-assets'] });
        }
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'IMAGE':
                return <Image className="w-4 h-4 text-blue-600" />;
            case 'VIDEO':
                return <Video className="w-4 h-4 text-purple-600" />;
            case 'DOCUMENT':
                return <FileText className="w-4 h-4 text-orange-600" />;
            default:
                return null;
        }
    };

    const handleSelectAsset = (asset: any) => {
        if (selectable) {
            setSelectedAssets(prev => {
                const newSet = new Set(prev);
                if (newSet.has(asset.id)) {
                    newSet.delete(asset.id);
                } else {
                    newSet.clear();
                    newSet.add(asset.id);
                }
                return newSet;
            });
            if (!selectedAssets.has(asset.id)) {
                onSelectAsset?.(asset);
            }
        }
    };

    const handleDelete = async (assetId: number) => {
        if (!confirm('Delete this media asset?')) return;
        deleteMutation.mutate(assetId);
    };

    const filteredAssets = assetType
        ? assets.filter((a: any) => a.asset_type === assetType)
        : assets;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                    {assetType ? `${assetType} Assets` : 'All Assets'}
                </h3>
                <button
                    onClick={() => setUploadModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Upload Asset
                </button>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredAssets.length === 0 && (
                <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-200">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600">No assets found</p>
                    <button
                        onClick={() => setUploadModalOpen(true)}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        Upload your first asset
                    </button>
                </div>
            )}

            {/* Assets Grid */}
            {!isLoading && filteredAssets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAssets.map((asset: any) => (
                        <div
                            key={asset.id}
                            onClick={() => handleSelectAsset(asset)}
                            className={`p-4 border rounded-lg transition-all cursor-pointer ${
                                selectable && selectedAssets.has(asset.id)
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getIcon(asset.asset_type)}
                                        <span className="font-mono text-sm font-semibold text-slate-800 truncate">
                                            {asset.asset_name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">
                                        {asset.file_name}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                            {asset.asset_type}
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                            {(asset.file_size / 1024 / 1024).toFixed(2)}MB
                                        </span>
                                    </div>
                                    {asset.meta_media_id && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>Uploaded to Meta</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(asset.id);
                                    }}
                                    disabled={deleteMutation.isPending}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete asset"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <MediaUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                assetType={assetType || 'IMAGE'}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['template-assets'] });
                }}
            />
        </div>
    );
};

export default MediaAssetManager;
