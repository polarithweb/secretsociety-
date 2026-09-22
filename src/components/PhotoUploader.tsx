import React, { useState, useRef } from 'react';
import { Upload, Camera, Trash2, Eye, AlertCircle, X } from 'lucide-react';

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  label?: string;
  description?: string;
  required?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  maxPhotos = 4,
  label = 'Photographic Verification',
  description = 'Upload candidate verification photo or document evidence.',
  required = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Compress image on canvas to keep document light for Firestore (< 250KB per image)
  // Fail-safe: if canvas processing fails for any reason, falls back to raw data URL
  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const rawResult = readerEvent.target?.result as string;
        if (!rawResult) {
          resolve('');
          return;
        }

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 700;
              const MAX_HEIGHT = 700;
              let width = img.naturalWidth || img.width;
              let height = img.naturalHeight || img.height;

              if (!width || !height) {
                resolve(rawResult);
                return;
              }

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height = Math.round((height * MAX_WIDTH) / width);
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width = Math.round((width * MAX_HEIGHT) / height);
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(rawResult);
                return;
              }
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
              resolve(compressedDataUrl);
            } catch {
              resolve(rawResult);
            }
          };
          img.onerror = () => resolve(rawResult);
          img.src = rawResult;
        } catch {
          resolve(rawResult);
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photographs allowed.`);
      return;
    }

    setIsProcessing(true);
    const newPhotos: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          setError('Only image files (JPG, PNG, WEBP) are supported.');
          continue;
        }
        const compressedBase64 = await processImage(file);
        newPhotos.push(compressedBase64);
      }
      onChange([...photos, ...newPhotos]);
    } catch (err) {
      console.error('Photo processing error:', err);
      setError('Could not process image. Please try another file.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="font-display tracking-wider text-xs sm:text-sm uppercase font-semibold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-white" />
            {label}
            {required && <span className="font-mono text-white/70 text-[11px] normal-case">(Required)</span>}
          </label>
          {description && <p className="font-editorial italic text-xs text-white/80 mt-0.5">{description}</p>}
        </div>
        <span className="font-mono text-xs text-white px-2.5 py-0.5 rounded border border-white/20 bg-white/5">
          {photos.length} / {maxPhotos}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded border border-white/40 bg-black text-white font-mono text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of uploaded images */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((photo, idx) => (
          <div
            key={idx}
            className="group relative aspect-square rounded-lg overflow-hidden border border-white/20 bg-black shadow-sm transition-all hover:border-white/50"
          >
            <img src={photo} alt={`Uploaded file ${idx + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreview(photo)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors border border-white/30"
                title="View Full Resolution"
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors border border-white/30"
                title="Remove Photo"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded font-mono text-[10px] text-white border border-white/20">
              #{idx + 1}
            </div>
          </div>
        ))}

        {/* Upload Trigger Tile */}
        {photos.length < maxPhotos && (
          <div>
            <input
              id="photo-uploader-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="sr-only"
            />
            <label
              htmlFor="photo-uploader-input"
              className={`aspect-square rounded-lg border-2 border-dashed border-white/20 hover:border-white/50 bg-black hover:bg-white/5 transition-all flex flex-col items-center justify-center p-3 text-center group cursor-pointer select-none ${
                isProcessing ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-[11px] text-white">Processing...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-white mb-1.5 transition-colors border border-white/10">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                    Upload Photo
                  </span>
                  <span className="font-mono text-[10px] text-white/60 mt-0.5">JPG / PNG</span>
                </>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Full Modal Image Preview */}
      {activePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActivePreview(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-black border border-white/30 rounded-xl p-2 shadow-2xl">
            <button
              onClick={() => setActivePreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black border border-white/40 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <img src={activePreview} alt="Enlarged verification" className="max-h-[80vh] rounded object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
