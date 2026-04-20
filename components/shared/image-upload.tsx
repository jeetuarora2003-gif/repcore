"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, UploadCloud, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface ImageUploadProps {
  bucket: "member_photos" | "gym_logos";
  defaultValue?: string;
  name: string;
  label?: string;
  className?: string;
  onUploadComplete?: (url: string) => void;
}

export function ImageUpload({ bucket, defaultValue, name, label, className, onUploadComplete }: ImageUploadProps) {
  const [url, setUrl] = useState(defaultValue || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setUrl(publicUrl);
      onUploadComplete?.(publicUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      alert("Error uploading image: " + message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      
      <div className="flex items-center gap-4">
        <div 
          className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-danger p-1 text-white shadow-lg transition-transform hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  setUrl("");
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Camera className="h-6 w-6" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Upload</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            {url ? "Image successfully uploaded." : "Tap to upload or take a photo. Max size 2MB."}
          </p>
          {!url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Select Image
            </Button>
          )}
        </div>
      </div>

      <input
        type="file"
        hidden
        ref={fileInputRef}
        accept="image/*"
        onChange={handleUpload}
      />
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
