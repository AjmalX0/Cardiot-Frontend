// components/ImageResizer.tsx

import { useState } from "react";
import { Download, Upload, Image as ImageIcon } from "lucide-react";

export default function ImageResizer() {
  const [preview, setPreview] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  const resizeImage = async (file: File) => {
    setLoading(true);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");

      // WhatsApp recommended size
      const width = 1080;
      const height = 1350;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);

          setPreview(url);
          setProcessedBlob(blob);
          setLoading(false);
        },
        "image/jpeg",
        0.8 // compression quality
      );
    };

    reader.readAsDataURL(file);
  };

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    await resizeImage(file);
  };

  const downloadImage = () => {
    if (!processedBlob) return;

    const url = URL.createObjectURL(processedBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "whatsapp-template-image.jpg";
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-blue-600" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            WhatsApp Image Optimizer
          </h2>

          <p className="text-sm text-slate-500">
            Resize high-quality images for WhatsApp templates
          </p>
        </div>
      </div>

      {/* Upload */}
      <label className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition">
        <Upload className="w-10 h-10 text-slate-400 mb-3" />

        <span className="font-medium text-slate-700">
          Upload High Quality Image
        </span>

        <span className="text-sm text-slate-500 mt-1">
          JPG, PNG, WEBP supported
        </span>

        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </label>

      {/* Loader */}
      {loading && (
        <div className="mt-6 text-center text-blue-600 font-medium">
          Processing Image...
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-6">
          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <img
              src={preview}
              alt="Preview"
              className="w-full object-cover"
            />
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">
                Optimized Successfully
              </p>

              <p className="text-sm text-slate-500">
                1080 × 1350 • JPG • Compressed
              </p>
            </div>

            <button
              onClick={downloadImage}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl transition"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
