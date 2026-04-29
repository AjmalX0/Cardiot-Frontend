import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2, CheckCircle, AlertCircle, Image, FileText, Video } from 'lucide-react';
import * as api from '../lib/api';

interface MediaUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    onSuccess?: (media: any) => void;
}

const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
    isOpen,
    onClose,
    assetType = 'IMAGE',
    onSuccess
}) => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [assetName, setAssetName] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [error, setError] = useState('');

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile || !assetName.trim()) {
                throw new Error('Please provide asset name and select a file');
            }

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('assetName', assetName);
            formData.append('assetType', assetType);

            const response = await api.uploadTemplateAsset(formData);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['template-assets'] });
            if (onSuccess) onSuccess(data.media);
            handleClose();
        },
        onError: (error: any) => {
            setError(error?.response?.data?.error || error.message || 'Upload failed');
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');

        // Validate file type
        const validTypes = {
            IMAGE: ['image/jpeg', 'image/png'],
            VIDEO: ['video/mp4'],
            DOCUMENT: ['application/pdf']
        };

        if (!validTypes[assetType].includes(file.type)) {
            setError(`Invalid file type for ${assetType}`);
            return;
        }

        // Validate file size
        const maxSizes = {
            IMAGE: 5 * 1024 * 1024,
            VIDEO: 50 * 1024 * 1024,
            DOCUMENT: 100 * 1024 * 1024
        };

        if (file.size > maxSizes[assetType]) {
            setError(`File exceeds maximum size of ${maxSizes[assetType] / 1024 / 1024}MB`);
            return;
        }

        setSelectedFile(file);

        // Create preview
        if (assetType === 'IMAGE') {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl('');
        }
    };

    const handleClose = () => {
        setAssetName('');
        setSelectedFile(null);
        setPreviewUrl('');
        setError('');
        onClose();
    };

    const getIcon = () => {
        switch (assetType) {
            case 'IMAGE':
                return <Image className="w-6 h-6" />;
            case 'VIDEO':
                return <Video className="w-6 h-6" />;
            case 'DOCUMENT':
                return <FileText className="w-6 h-6" />;
            default:
                return <Upload className="w-6 h-6" />;
        }
    };

    const getFileTypeLabel = () => {
        switch (assetType) {
            case 'IMAGE':
                return 'JPG or PNG image';
            case 'VIDEO':
                return 'MP4 video';
            case 'DOCUMENT':
                return 'PDF document';
            default:
                return 'file';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            {getIcon()}
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">
                            Upload {assetType}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    {/* Asset Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Asset Name *
                        </label>
                        <input
                            type="text"
                            value={assetName}
                            onChange={(e) => setAssetName(e.target.value)}
                            placeholder="e.g., promotional_header_1"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={uploadMutation.isPending}
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Select File *
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            accept={
                                assetType === 'IMAGE'
                                    ? 'image/jpeg,image/png'
                                    : assetType === 'VIDEO'
                                        ? 'video/mp4'
                                        : 'application/pdf'
                            }
                            className="hidden"
                            disabled={uploadMutation.isPending}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            disabled={uploadMutation.isPending}
                        >
                            <div className="text-center">
                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-700">
                                    Click to upload {getFileTypeLabel()}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {assetType === 'IMAGE' && 'Max 5MB'}
                                    {assetType === 'VIDEO' && 'Max 50MB'}
                                    {assetType === 'DOCUMENT' && 'Max 100MB'}
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* File Preview */}
                    {selectedFile && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                            {previewUrl && assetType === 'IMAGE' && (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-40 object-cover rounded-lg mb-2"
                                />
                            )}
                            <p className="text-sm text-slate-700">
                                <span className="font-medium">File:</span> {selectedFile.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                            </p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {uploadMutation.isSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-emerald-700">Asset uploaded successfully!</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        disabled={uploadMutation.isPending}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => uploadMutation.mutate()}
                        disabled={!selectedFile || !assetName.trim() || uploadMutation.isPending}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MediaUploadModal;
