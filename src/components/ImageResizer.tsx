import { useState } from "react";

import {
  Upload,
  Download,
  Image as ImageIcon,
} from "lucide-react";

export default function ImageResizer() {
  const [preview, setPreview] = useState<string | null>(null);

  const [processedImage, setProcessedImage] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setLoading(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");

        const width = 1080;
        const height = 1350;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        // white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // convert to compressed JPG
        const optimized = canvas.toDataURL(
          "image/jpeg",
          0.8
        );

        setPreview(event.target?.result as string);

        setProcessedImage(optimized);

        setLoading(false);
      };
    };

    reader.readAsDataURL(file);
  };

  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement("a");

    link.href = processedImage;

    link.download = "whatsapp-template-image.jpg";

    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-blue-600" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              WhatsApp Image Resizer
            </h1>

            <p className="text-slate-500 mt-1">
              Upload high quality images and optimize
              them automatically for WhatsApp templates.
            </p>
          </div>
        </div>

        {/* Upload Box */}
        <label className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all">
          <Upload className="w-12 h-12 text-slate-400 mb-4" />

          <h2 className="text-xl font-semibold text-slate-700">
            Upload Image
          </h2>

          <p className="text-slate-500 mt-2 text-center">
            JPG, PNG, WEBP supported
            <br />
            Auto resize to 1080 × 1350
          </p>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>

        {/* Loading */}
        {loading && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-50 text-blue-600 font-medium">
              Processing image...
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && processedImage && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            {/* Original */}
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4">
                Original Image
              </h3>

              <div className="border rounded-2xl overflow-hidden">
                <img
                  src={preview}
                  alt="Original"
                  className="w-full object-cover"
                />
              </div>
            </div>

            {/* Optimized */}
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4">
                Optimized Image
              </h3>

              <div className="border rounded-2xl overflow-hidden">
                <img
                  src={processedImage}
                  alt="Optimized"
                  className="w-full object-cover"
                />
              </div>

              <button
                onClick={downloadImage}
                className="w-full mt-5 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-medium transition-all"
              >
                <Download className="w-5 h-5" />

                Download Optimized Image
              </button>

              <div className="mt-4 text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
                ✅ Resized to 1080 × 1350
                <br />
                ✅ Compressed JPG
                <br />
                ✅ WhatsApp Template Ready
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
