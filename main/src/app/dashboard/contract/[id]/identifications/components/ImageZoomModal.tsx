"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  Maximize2,
  Minimize2
} from "lucide-react";

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageAlt: string;
  imageTitle?: string;
  onDownload?: () => void;
}

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  lastPan: { x: number; y: number };
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const SCALE_STEP = 0.2;
const ROTATION_STEP = 90;

export default function ImageZoomModal({
  isOpen,
  onClose,
  imageUrl,
  imageAlt,
  imageTitle,
  onDownload,
}: ImageZoomModalProps) {
  const [zoomState, setZoomState] = useState<ZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastPan: { x: 0, y: 0 },
  });

  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scaleRef = useRef<number>(1); // Ref to track scale without causing re-renders

  // Reset all state when modal opens/closes or image changes
  useEffect(() => {
    if (isOpen) {
      setZoomState({
        scale: 1,
        translateX: 0,
        translateY: 0,
        rotation: 0,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        lastPan: { x: 0, y: 0 },
      });
      setIsImageLoaded(false);
      setImageDimensions({ width: 0, height: 0 });
      scaleRef.current = 1;
    }
  }, [isOpen, imageUrl]); // Reset when imageUrl changes too

  // Cleanup wheel timeout
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "=":
        case "+":
          e.preventDefault();
          setZoomState(prev => {
            const newScale = Math.min(MAX_SCALE, prev.scale + SCALE_STEP);
            scaleRef.current = newScale;
            return { ...prev, scale: newScale };
          });
          break;
        case "-":
          e.preventDefault();
          setZoomState(prev => {
            const newScale = Math.max(MIN_SCALE, prev.scale - SCALE_STEP);
            scaleRef.current = newScale;
            return { ...prev, scale: newScale };
          });
          break;
        case "0":
          e.preventDefault();
          scaleRef.current = 1;
          setZoomState({
            scale: 1,
            translateX: 0,
            translateY: 0,
            rotation: 0,
            isDragging: false,
            dragStart: { x: 0, y: 0 },
            lastPan: { x: 0, y: 0 },
          });
          break;
        case "r":
          e.preventDefault();
          setZoomState(prev => ({
            ...prev,
            rotation: (prev.rotation + ROTATION_STEP) % 360,
          }));
          break;
        case "f":
          e.preventDefault();
          if (containerRef.current && imageDimensions.width && imageDimensions.height) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const containerWidth = containerRect.width - 100;
            const containerHeight = containerRect.height - 200;
            const scaleX = containerWidth / imageDimensions.width;
            const scaleY = containerHeight / imageDimensions.height;
            const fitScale = Math.min(scaleX, scaleY, 1);
            scaleRef.current = fitScale;
            setZoomState({
              scale: fitScale,
              translateX: 0,
              translateY: 0,
              rotation: 0,
              isDragging: false,
              dragStart: { x: 0, y: 0 },
              lastPan: { x: 0, y: 0 },
            });
          }
          break;
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown":
          e.preventDefault();
          if (scaleRef.current > 1) {
            setZoomState(prev => {
              let deltaX = 0;
              let deltaY = 0;
              
              if (e.key === "ArrowLeft") deltaX = 50;
              if (e.key === "ArrowRight") deltaX = -50;
              if (e.key === "ArrowUp") deltaY = 50;
              if (e.key === "ArrowDown") deltaY = -50;

              return {
                ...prev,
                translateX: prev.translateX + deltaX,
                translateY: prev.translateY + deltaY,
                lastPan: { x: prev.translateX + deltaX, y: prev.translateY + deltaY },
              };
            });
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, imageDimensions]);

  // Handle wheel zoom with debouncing to prevent oscillation
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear any existing timeout
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }

    // Debounce the zoom to prevent rapid firing
    wheelTimeoutRef.current = setTimeout(() => {
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      
      setZoomState(prev => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta));
        scaleRef.current = newScale;
        return {
          ...prev,
          scale: newScale,
        };
      });
    }, 10); // Small debounce to batch rapid wheel events
  }, []);

  // Add wheel event listener to the image container
  useEffect(() => {
    if (!isOpen || !imageContainerRef.current) return;

    const container = imageContainerRef.current;
    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [isOpen, handleWheel]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setZoomState(prev => {
      if (prev.scale <= 1) return prev;
      
      return {
        ...prev,
        isDragging: true,
        dragStart: { x: e.clientX, y: e.clientY },
      };
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setZoomState(prev => {
      if (!prev.isDragging || prev.scale <= 1) return prev;

      const deltaX = e.clientX - prev.dragStart.x;
      const deltaY = e.clientY - prev.dragStart.y;

      return {
        ...prev,
        translateX: prev.lastPan.x + deltaX,
        translateY: prev.lastPan.y + deltaY,
      };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    setZoomState(prev => {
      if (!prev.isDragging) return prev;

      return {
        ...prev,
        isDragging: false,
        lastPan: {
          x: prev.translateX,
          y: prev.translateY,
        },
      };
    });
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setZoomState(prev => {
        if (prev.scale <= 1) return prev;
        
        return {
          ...prev,
          isDragging: true,
          dragStart: { x: touch.clientX, y: touch.clientY },
        };
      });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setZoomState(prev => {
        if (!prev.isDragging) return prev;
        
        const deltaX = touch.clientX - prev.dragStart.x;
        const deltaY = touch.clientY - prev.dragStart.y;

        return {
          ...prev,
          translateX: prev.lastPan.x + deltaX,
          translateY: prev.lastPan.y + deltaY,
        };
      });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setZoomState(prev => {
      if (!prev.isDragging) return prev;

      return {
        ...prev,
        isDragging: false,
        lastPan: {
          x: prev.translateX,
          y: prev.translateY,
        },
      };
    });
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomState(prev => {
      const newScale = Math.min(MAX_SCALE, prev.scale + SCALE_STEP);
      scaleRef.current = newScale;
      return { ...prev, scale: newScale };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomState(prev => {
      const newScale = Math.max(MIN_SCALE, prev.scale - SCALE_STEP);
      scaleRef.current = newScale;
      return { ...prev, scale: newScale };
    });
  }, []);

  const handleReset = useCallback(() => {
    scaleRef.current = 1;
    setZoomState({
      scale: 1,
      translateX: 0,
      translateY: 0,
      rotation: 0,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      lastPan: { x: 0, y: 0 },
    });
  }, []);

  const handleRotate = useCallback(() => {
    setZoomState(prev => ({
      ...prev,
      rotation: (prev.rotation + ROTATION_STEP) % 360,
    }));
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !imageDimensions.width || !imageDimensions.height) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width - 100;
    const containerHeight = containerRect.height - 200;

    const scaleX = containerWidth / imageDimensions.width;
    const scaleY = containerHeight / imageDimensions.height;
    const fitScale = Math.min(scaleX, scaleY, 1);

    scaleRef.current = fitScale;
    setZoomState({
      scale: fitScale,
      translateX: 0,
      translateY: 0,
      rotation: 0,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      lastPan: { x: 0, y: 0 },
    });
  }, [imageDimensions]);

  // Handle image load - only set dimensions once
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    // Only set dimensions if they haven't been set yet or if they're different
    setImageDimensions(prev => {
      if (prev.width !== img.naturalWidth || prev.height !== img.naturalHeight) {
        return { width: img.naturalWidth, height: img.naturalHeight };
      }
      return prev;
    });
    setIsImageLoaded(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      {/* Main container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {imageTitle && (
                <h2 className="text-lg font-semibold text-white truncate">
                  {imageTitle}
                </h2>
              )}
              <p className="text-sm text-gray-300 truncate">{imageAlt}</p>
            </div>
            
            <div className="flex items-center gap-2">
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Download image (D)"
                >
                  <Download className="h-5 w-5" />
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Close (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Image container */}
        <div 
          ref={imageContainerRef}
          className="flex-1 flex items-center justify-center p-8 pt-20 pb-20"
        >
          <div
            className="relative"
            style={{
              cursor: zoomState.scale > 1 ? (zoomState.isDragging ? "grabbing" : "grab") : "default",
              userSelect: "none",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Show loading state while image is loading */}
            {!isImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-sm">Loading...</div>
              </div>
            )}
            
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={imageDimensions.width || 800}
              height={imageDimensions.height || 600}
              className="max-w-none select-none"
              style={{
                transform: `
                  scale(${zoomState.scale}) 
                  translate(${zoomState.translateX / zoomState.scale}px, ${zoomState.translateY / zoomState.scale}px) 
                  rotate(${zoomState.rotation}deg)
                `,
                transformOrigin: "center center",
                transition: zoomState.isDragging ? "none" : "transform 0.1s ease-out",
                opacity: isImageLoaded ? 1 : 0,
                maxWidth: "90vw",
                maxHeight: "calc(100vh - 240px)",
                objectFit: "contain",
              }}
              onLoad={handleImageLoad}
              draggable={false}
              unoptimized // Prevent Next.js optimization which can cause blur
              priority
            />
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-4">
            {/* Zoom controls */}
            <div className="flex items-center gap-2 bg-black/50 rounded-lg p-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomState.scale <= MIN_SCALE}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom out (-)"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              
              <span className="text-white text-sm font-medium min-w-[60px] text-center">
                {Math.round(zoomState.scale * 100)}%
              </span>
              
              <button
                onClick={handleZoomIn}
                disabled={zoomState.scale >= MAX_SCALE}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom in (+)"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            {/* Fit to screen */}
            <button
              onClick={handleFitToScreen}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Fit to screen (F)"
            >
              <Maximize2 className="h-5 w-5" />
            </button>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Rotate (R)"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Reset (0)"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Use mouse wheel to zoom • Drag to pan • Arrow keys to move • 
              <span className="hidden sm:inline"> Keyboard shortcuts: + - 0 R F</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
