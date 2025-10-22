"use client";

import React, { useCallback, useMemo, useState } from "react";
import ImageCropModal from "@/components/media/ImageCropModal";

type OpenCropArgs = {
  file: File;
  aspect?: number | null;
  targetWidth?: number;
  jpegQuality?: number;
};

type CropResult = { file: File; previewDataUrl: string } | null;

export function useCroppedUpload() {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [aspect, setAspect] = useState<number | null | undefined>(1.6);
  const [targetWidth, setTargetWidth] = useState(1600);
  const [jpegQuality, setJpegQuality] = useState(0.9);
  const [resolver, setResolver] = useState<{
    resolve: (value: CropResult) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  const Modal = useMemo(() => {
    if (!imageSrc || !resolver) return null;
    
    return (
      <ImageCropModal
        open={open}
        imageSrc={imageSrc}
        aspect={aspect ?? undefined}
        onCancel={() => {
          setOpen(false);
          setImageSrc(null);
          resolver?.resolve(null); // resolve with null to indicate cancel
          setResolver(null);
        }}
        onCropped={async (blob: Blob) => {
          try {
            const fileName = "upload-scanned.jpg";
            const file = new File([blob], fileName, { type: "image/jpeg" });
            const reader = new FileReader();
            
            await new Promise<void>((resolveReader, rejectReader) => {
              reader.onload = () => {
                const previewDataUrl = String(reader.result || "");
                resolver.resolve({ file, previewDataUrl });
                setResolver(null);
                setOpen(false);
                setImageSrc(null);
                reader.onload = null;
                reader.onerror = null;
                resolveReader();
              };
              reader.onerror = () => {
                reader.onload = null;
                reader.onerror = null;
                rejectReader(new Error("Failed to create preview"));
              };
              reader.readAsDataURL(file);
            });
          } catch (error) {
            resolver.reject(error);
            setResolver(null);
            setOpen(false);
            setImageSrc(null);
          }
        }}
        targetWidth={targetWidth}
        jpegQuality={jpegQuality}
      />
    );
  }, [open, imageSrc, aspect, targetWidth, jpegQuality, resolver]);

  const openCrop = useCallback((args: OpenCropArgs) => {
    const { file, aspect, targetWidth, jpegQuality } = args;
    
    // If browser can't display HEIC/HEIF, skip cropper gracefully
    if (/image\/hei(c|f)/i.test(file.type)) {
      return Promise.resolve(null);
    }
    
    return new Promise<CropResult>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        setImageSrc(String(reader.result || ""));
        setAspect(aspect);
        setTargetWidth(targetWidth ?? 1600);
        setJpegQuality(jpegQuality ?? 0.9);
        setResolver({ resolve, reject });
        setOpen(true);
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      reader.readAsDataURL(file);
    });
  }, []);

  return { openCrop, CropModalPortal: Modal };
}
