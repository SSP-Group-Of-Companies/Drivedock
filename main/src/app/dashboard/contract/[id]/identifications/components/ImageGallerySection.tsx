"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useEditMode } from "../../components/EditModeContext";
import { ILicenseEntry, IFastCard, EPassportType, EWorkAuthorizationType } from "@/types/applicationForm.types";
import { IFileAsset, ECountryCode } from "@/types/shared.types";
import { Image as ImageIcon, ChevronLeft, ChevronRight, Plus, Camera, Upload, Trash2, AlertCircle, Menu, X, CheckCircle, XCircle, Download } from "lucide-react";
import { ES3Folder } from "@/types/aws.types";
import { useParams } from "next/navigation";
import { uploadToS3Presigned, deleteTempFiles, isTempKey } from "@/lib/utils/s3Upload";

interface ImageGallerySectionProps {
  licenses: ILicenseEntry[];
  incorporatePhotos: IFileAsset[];
  hstPhotos: IFileAsset[];
  bankingInfoPhotos: IFileAsset[];
  healthCardPhotos: IFileAsset[];
  medicalCertificationPhotos: IFileAsset[];
  passportPhotos: IFileAsset[];
  prPermitCitizenshipPhotos: IFileAsset[];
  usVisaPhotos: IFileAsset[];
  fastCard?: IFastCard;
  hstNumber?: string;
  businessName?: string;
  passportType?: EPassportType;
  workAuthorizationType?: EWorkAuthorizationType;
  onStage: (changes: any) => void;
  countryCode: ECountryCode;
  driverType?: string;
}

interface GalleryItem {
  id: string;
  title: string;
  photos: IFileAsset[];
  type: string;
  hasFrontBack: boolean;
  maxPhotos: number;
  required: boolean;
  fieldKey: string; // For updating the correct field
  businessValidation?: boolean; // For business section validation
}

export default function ImageGallerySection({
  licenses,
  incorporatePhotos,
  hstPhotos,
  bankingInfoPhotos,
  healthCardPhotos,
  medicalCertificationPhotos,
  passportPhotos,
  prPermitCitizenshipPhotos,
  usVisaPhotos,
  fastCard,
  hstNumber,
  businessName,
  passportType,
  workAuthorizationType,
  onStage,
  countryCode,
}: ImageGallerySectionProps) {
  const { isEditMode } = useEditMode();
  const { id: trackerId } = useParams<{ id: string }>();
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>("");
  const [deleteMessage, setDeleteMessage] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Ensure component is mounted before rendering dynamic content
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ESC to close mobile navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isMobileNavOpen) return;
      if (e.key === "Escape") setIsMobileNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileNavOpen]);

  // Scroll lock while mobile navigation is open
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    if (isMobileNavOpen) document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [isMobileNavOpen]);

  // Photo limits based on database requirements
  const PHOTO_LIMITS = {
    license: 2,
    fastCard: 2,
    incorporate: 10,
    hst: 2,
    banking: 2,
    healthCard: 2,
    medical: 2,
    passport: 2,
    prPermit: 2,
    usVisa: 2,
  };

  // Helper function to get the appropriate S3 folder for each photo type
  const getS3FolderForType = (type: string): ES3Folder => {
    switch (type) {
      case "license":
        return ES3Folder.LICENSES;
      case "fastCard":
        return ES3Folder.FAST_CARD_PHOTOS;
      case "incorporate":
        return ES3Folder.INCORPORATION_PHOTOS;
      case "hst":
        return ES3Folder.HST_PHOTOS;
      case "banking":
        return ES3Folder.BANKING_INFO_PHOTOS;
      case "healthCard":
        return ES3Folder.HEALTH_CARD_PHOTOS;
      case "medical":
        return ES3Folder.MEDICAL_CERT_PHOTOS;
      case "passport":
        return ES3Folder.PASSPORT_PHOTOS;
      case "prPermit":
        return ES3Folder.PR_CITIZENSHIP_PHOTOS;
      case "usVisa":
        return ES3Folder.US_VISA_PHOTOS;
      default:
        return ES3Folder.INCORPORATION_PHOTOS; // fallback
    }
  };

  // Build gallery items from all photo collections based on country
  const isCanadian = countryCode === ECountryCode.CA;
  const isUS = countryCode === ECountryCode.US;

  const galleryItems: GalleryItem[] = [
    // License photos - only the primary license (index 0) has photos
    ...(licenses.length > 0
      ? [
          {
            id: "license-primary",
            title: "License 1 (Primary - AZ)",
            photos: [licenses[0].licenseFrontPhoto, licenses[0].licenseBackPhoto].filter(Boolean) as IFileAsset[],
            type: "license",
            hasFrontBack: true,
            maxPhotos: PHOTO_LIMITS.license,
            required: true,
            fieldKey: "licenses",
          },
        ]
      : []),

    // Fast Card - only for Canadians
    ...(isCanadian && fastCard
      ? [
          {
            id: "fastCard",
            title: "Fast Card",
            photos: [fastCard.fastCardFrontPhoto, fastCard.fastCardBackPhoto].filter(Boolean) as IFileAsset[],
            type: "fastCard",
            hasFrontBack: true,
            maxPhotos: PHOTO_LIMITS.fastCard,
            required: true, // Fast Card requires both photos if provided
            fieldKey: "fastCard",
          },
        ]
      : []),

    // Business documents - always available
    {
      id: "incorporate",
      title: "Incorporate Documents",
      photos: incorporatePhotos || [],
      type: "incorporate",
      hasFrontBack: false,
      maxPhotos: PHOTO_LIMITS.incorporate,
      required: false,
      fieldKey: "incorporatePhotos",
      businessValidation: true, // Mark for business validation
    },
    {
      id: "hst",
      title: "HST Documents",
      photos: hstPhotos || [],
      type: "hst",
      hasFrontBack: false,
      maxPhotos: PHOTO_LIMITS.hst,
      required: false,
      fieldKey: "hstPhotos",
      businessValidation: true, // Mark for business validation
    },
    {
      id: "banking",
      title: "Banking Information",
      photos: bankingInfoPhotos || [],
      type: "banking",
      hasFrontBack: false,
      maxPhotos: PHOTO_LIMITS.banking,
      required: false,
      fieldKey: "bankingInfoPhotos",
    },

    // Medical/Identity documents - country-specific
    ...(isCanadian
      ? [
          // Canadian requirements
          {
            id: "healthCard",
            title: "Health Card",
            photos: healthCardPhotos || [],
            type: "healthCard",
            hasFrontBack: true,
            maxPhotos: PHOTO_LIMITS.healthCard,
            required: true,
            fieldKey: "healthCardPhotos",
          },
          // US Visa - show for Others passport, required only for cross-border work authorization
          ...(passportType === EPassportType.OTHERS
            ? [
                {
                  id: "usVisa",
                  title: "US Visa",
                  photos: usVisaPhotos || [],
                  type: "usVisa",
                  hasFrontBack: false,
                  maxPhotos: PHOTO_LIMITS.usVisa,
                  required: workAuthorizationType === EWorkAuthorizationType.CROSS_BORDER,
                  fieldKey: "usVisaPhotos",
                },
              ]
            : []),
        ]
      : []),

    ...(isUS
      ? [
          // US requirements
          {
            id: "medical",
            title: "Medical Certification",
            photos: medicalCertificationPhotos || [],
            type: "medical",
            hasFrontBack: false,
            maxPhotos: PHOTO_LIMITS.medical,
            required: true, // Can be 1-2 photos, but required
            fieldKey: "medicalCertificationPhotos",
          },
        ]
      : []),

    // Universal requirements - everyone needs these
    {
      id: "passport",
      title: "Passport",
      photos: passportPhotos || [],
      type: "passport",
      hasFrontBack: true,
      maxPhotos: PHOTO_LIMITS.passport,
      required: true,
      fieldKey: "passportPhotos",
    },
    // PR/Permit/Citizenship - only required for non-Canadian passports or US companies
    ...(isUS || (isCanadian && passportType === EPassportType.OTHERS)
      ? [
          {
            id: "prPermit",
            title: "PR Permit/Citizenship",
            photos: prPermitCitizenshipPhotos || [],
            type: "prPermit",
            hasFrontBack: false,
            maxPhotos: PHOTO_LIMITS.prPermit,
            required: true,
            fieldKey: "prPermitCitizenshipPhotos",
          },
        ]
      : []),
  ];

  const selectedItemData = galleryItems.find((item) => item.id === selectedItem);
  const currentPhoto = selectedItemData?.photos[currentPhotoIndex];

  const handleItemSelect = (itemId: string) => {
    setSelectedItem(itemId);
    setCurrentPhotoIndex(0);
    setUploadError("");
  };

  const handlePhotoChange = (direction: "prev" | "next") => {
    if (!selectedItemData) return;

    if (direction === "prev") {
      setCurrentPhotoIndex((prev) => (prev === 0 ? selectedItemData.photos.length - 1 : prev - 1));
    } else {
      setCurrentPhotoIndex((prev) => (prev === selectedItemData.photos.length - 1 ? 0 : prev + 1));
    }
  };

  const getPhotoLabel = (item: GalleryItem, index: number) => {
    if (!item.hasFrontBack) return `Photo ${index + 1}`;

    if (item.type === "license") {
      return index === 0 ? "Front" : "Back";
    } else if (item.type === "fastCard") {
      return index === 0 ? "Front" : "Back";
    } else if (item.type === "healthCard") {
      return index === 0 ? "Front" : "Back";
    } else if (item.type === "passport") {
      return index === 0 ? "Front" : "Back";
    }

    return `Photo ${index + 1}`;
  };

  const canAddPhoto = (item: GalleryItem) => {
    return item.photos.length < item.maxPhotos;
  };

  const handleAddPhoto = async (item: GalleryItem) => {
    if (!canAddPhoto(item)) {
      setUploadError(`Cannot add more photos. Maximum ${item.maxPhotos} allowed.`);
      return;
    }

    // Create a file input for photo upload
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      setUploadError("");

      try {
        // Use the same S3 upload system as onboarding
        const folder = getS3FolderForType(item.type);
        const result = await uploadToS3Presigned({
          file,
          folder,
          trackerId: trackerId || "unknown",
        });

        // Create new photo object with actual S3 data
        const newPhoto: IFileAsset = result;

        // Handle Fast Card photos differently since they're object properties, not arrays
        if (item.type === "fastCard") {
          // Find which photo is missing (front or back)
          const currentPhotos = item.photos;
          if (currentPhotos.length === 0) {
            // No photos yet, add as front photo
            onStage({
              fastCard: {
                ...fastCard,
                fastCardFrontPhoto: newPhoto,
              },
            });
          } else if (currentPhotos.length === 1) {
            // One photo exists, add as back photo
            const existingPhoto = currentPhotos[0];
            const isFrontPhoto = existingPhoto === fastCard?.fastCardFrontPhoto;

            if (isFrontPhoto) {
              onStage({
                fastCard: {
                  ...fastCard,
                  fastCardBackPhoto: newPhoto,
                },
              });
            } else {
              onStage({
                fastCard: {
                  ...fastCard,
                  fastCardFrontPhoto: newPhoto,
                },
              });
            }
          }
        } else if (item.type === "license") {
          // Handle license photos - they're stored as properties on the license object
          const currentPhotos = item.photos;
          if (currentPhotos.length === 0) {
            // No photos yet, add as front photo
            const updatedLicenses = [...licenses];
            updatedLicenses[0] = {
              ...updatedLicenses[0],
              licenseFrontPhoto: newPhoto,
            };
            onStage({ licenses: updatedLicenses });
          } else if (currentPhotos.length === 1) {
            // One photo exists, add as back photo
            const updatedLicenses = [...licenses];
            const existingPhoto = currentPhotos[0];
            const isFrontPhoto = existingPhoto === licenses[0]?.licenseFrontPhoto;

            if (isFrontPhoto) {
              updatedLicenses[0] = {
                ...updatedLicenses[0],
                licenseBackPhoto: newPhoto,
              };
            } else {
              updatedLicenses[0] = {
                ...updatedLicenses[0],
                licenseFrontPhoto: newPhoto,
              };
            }
            onStage({ licenses: updatedLicenses });
          }
        } else {
          // Regular array-based photos — derive from latest staged state to avoid stale closures
          onStage((prev: any) => {
            const prevArr: IFileAsset[] = Array.isArray(prev?.[item.fieldKey]) ? prev[item.fieldKey] : item.photos || [];
            const next = [...prevArr, newPhoto];
            return { ...prev, [item.fieldKey]: next };
          });
        }

        setIsUploading(false);
      } catch (error: any) {
        setIsUploading(false);
        setUploadError(error?.message || "Failed to upload photo. Please try again.");
      }
    };
    input.click();
  };

  // Removes a photo from staged state for any gallery item shape
  const _removePhotoFromState = (item: GalleryItem, photoIndex: number) => {
    if (item.type === "fastCard") {
      const currentPhotos = item.photos;
      const photoToDelete = currentPhotos[photoIndex];

      if (photoToDelete === fastCard?.fastCardFrontPhoto) {
        onStage({
          fastCard: {
            ...fastCard,
            fastCardFrontPhoto: undefined,
          },
        });
      } else if (photoToDelete === fastCard?.fastCardBackPhoto) {
        onStage({
          fastCard: {
            ...fastCard,
            fastCardBackPhoto: undefined,
          },
        });
      }

      // index adjustments
      if (currentPhotoIndex >= currentPhotos.length - 1 && currentPhotos.length > 1) {
        setCurrentPhotoIndex(currentPhotos.length - 2);
      } else if (currentPhotos.length === 1) {
        setCurrentPhotoIndex(0);
      }
      return;
    }

    if (item.type === "license") {
      const currentPhotos = item.photos;
      const photoToDelete = currentPhotos[photoIndex];

      const updatedLicenses = [...licenses];
      if (photoToDelete === licenses[0]?.licenseFrontPhoto) {
        updatedLicenses[0] = {
          ...updatedLicenses[0],
          licenseFrontPhoto: undefined,
        };
      } else if (photoToDelete === licenses[0]?.licenseBackPhoto) {
        updatedLicenses[0] = {
          ...updatedLicenses[0],
          licenseBackPhoto: undefined,
        };
      }
      onStage({ licenses: updatedLicenses });

      if (currentPhotoIndex >= currentPhotos.length - 1 && currentPhotos.length > 1) {
        setCurrentPhotoIndex(currentPhotos.length - 2);
      } else if (currentPhotos.length === 1) {
        setCurrentPhotoIndex(0);
      }
      return;
    }

    // Array-based collections
    onStage((prev: any) => {
      const prevArr: IFileAsset[] = Array.isArray(prev?.[item.fieldKey]) ? prev[item.fieldKey] : item.photos || [];
      const next = prevArr.filter((_: IFileAsset, idx: number) => idx !== photoIndex);
      return { ...prev, [item.fieldKey]: next };
    });

    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleDeletePhoto = async (item: GalleryItem, photoIndex: number) => {
    const photo = item.photos[photoIndex];
    const key = photo?.s3Key;

    setDeleteError("");
    setDeleteMessage("");

    // Nothing to delete? Just clear from state.
    if (!key && !photo?.url) {
      _removePhotoFromState(item, photoIndex);
      return;
    }

    // If temp (s3Key starts with temp-files/): call API to delete BEFORE clearing UI
    if (key && isTempKey(key)) {
      try {
        setIsDeleting(true);
        setDeleteMessage("Deleting...");
        await deleteTempFiles([key]);
        _removePhotoFromState(item, photoIndex);
        setDeleteMessage("Photo removed");
      } catch (err: any) {
        console.error("Temp photo deletion failed:", err);
        setDeleteError(err?.message || "Delete failed");
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    // Final / non-temp: remove from state immediately (no server call)
    _removePhotoFromState(item, photoIndex);
    setDeleteMessage("");
  };

  const handleEditPhoto = async (item: GalleryItem, photoIndex: number) => {
    // Create a file input for photo replacement
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      setUploadError("");

      try {
        // Use the same S3 upload system as onboarding
        const folder = getS3FolderForType(item.type);
        const result = await uploadToS3Presigned({
          file,
          folder,
          trackerId: trackerId || "unknown",
        });

        // Create new photo object with actual S3 data
        const newPhoto: IFileAsset = result;

        // Handle Fast Card photos differently since they're object properties, not arrays
        if (item.type === "fastCard") {
          const currentPhotos = item.photos;
          const photoToReplace = currentPhotos[photoIndex];

          // Determine which photo to replace and update accordingly
          if (photoToReplace === fastCard?.fastCardFrontPhoto) {
            onStage({
              fastCard: {
                ...fastCard,
                fastCardFrontPhoto: newPhoto,
              },
            });
          } else if (photoToReplace === fastCard?.fastCardBackPhoto) {
            onStage({
              fastCard: {
                ...fastCard,
                fastCardBackPhoto: newPhoto,
              },
            });
          }
        } else if (item.type === "license") {
          // Handle license photos - they're stored as properties on the license object
          const currentPhotos = item.photos;
          const photoToReplace = currentPhotos[photoIndex];

          const updatedLicenses = [...licenses];
          if (photoToReplace === licenses[0]?.licenseFrontPhoto) {
            updatedLicenses[0] = {
              ...updatedLicenses[0],
              licenseFrontPhoto: newPhoto,
            };
          } else if (photoToReplace === licenses[0]?.licenseBackPhoto) {
            updatedLicenses[0] = {
              ...updatedLicenses[0],
              licenseBackPhoto: newPhoto,
            };
          }
          onStage({ licenses: updatedLicenses });
        } else {
          // Regular array-based photos — derive from latest staged state to avoid stale closures
          onStage((prev: any) => {
            const prevArr: IFileAsset[] = Array.isArray(prev?.[item.fieldKey]) ? prev[item.fieldKey] : item.photos || [];
            const next = [...prevArr];
            next[photoIndex] = newPhoto;
            return { ...prev, [item.fieldKey]: next };
          });
        }

        setIsUploading(false);
      } catch (error: any) {
        setIsUploading(false);
        setUploadError(error?.message || "Failed to replace photo. Please try again.");
      }
    };
    input.click();
  };

  // Download image function
  const handleDownloadImage = async (photo: IFileAsset, itemTitle: string, photoLabel: string) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const link = document.createElement("a");
      link.href = url;

      // Generate filename from item title and photo label
      const filename = `${itemTitle.replace(/\s+/g, "_")}_${photoLabel.replace(/\s+/g, "_")}.jpg`;
      link.download = filename;

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the temporary URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image:", error);
      setUploadError("Failed to download image. Please try again.");
    }
  };

  // Business section validation helper (reflect driver-type requirements)
  const getBusinessValidationStatus = () => {
    const hasBusinessData =
      (businessName && businessName.trim()) ||
      (hstNumber && hstNumber.trim()) ||
      (incorporatePhotos && incorporatePhotos.length > 0) ||
      (hstPhotos && hstPhotos.length > 0);

    if (!hasBusinessData) return null; // No business data, no validation needed

    // Check if all business fields are filled
    const allFieldsFilled =
      businessName &&
      businessName.trim() &&
      hstNumber &&
      hstNumber.trim() &&
      incorporatePhotos &&
      incorporatePhotos.length > 0 &&
      hstPhotos &&
      hstPhotos.length > 0;

    if (!allFieldsFilled) {
      return {
        type: "error" as const,
        message: "If you provide any business information, all fields must be completed",
      };
    }

    return {
      type: "success" as const,
      message: "Business information complete",
    };
  };

  const getValidationStatus = (item: GalleryItem) => {
    // Business validation - check if all business fields are filled
    if (item.businessValidation) {
      return getBusinessValidationStatus();
    }

    // Fast Card is special: optional but requires both photos if provided
    if (item.type === "fastCard") {
      if (item.photos.length > 0 && item.photos.length !== 2) {
        return {
          type: "error" as const,
          message: `${item.title} requires exactly 2 photos (front and back)`,
        };
      }
      if (item.photos.length === 2) {
        return {
          type: "success" as const,
          message: `${item.title} requirements met`,
        };
      }
      // No photos = optional, no validation message
      return null;
    }

    // For other required items
    if (!item.required) return null;

    if (item.hasFrontBack && item.photos.length !== 2) {
      return {
        type: "error" as const,
        message: `${item.title} requires exactly 2 photos (front and back)`,
      };
    }

    if (item.photos.length === 0) {
      return {
        type: "error" as const,
        message: `${item.title} is required`,
      };
    }

    return {
      type: "success" as const,
      message: `${item.title} requirements met`,
    };
  };

  // Don't render dynamic content until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div
        className="rounded-xl border p-6 shadow-sm"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-outline)",
        }}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-transparent mx-auto mb-2"
              style={{
                borderTopColor: "var(--color-primary)",
                borderWidth: "2px",
              }}
            />
            <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Loading gallery...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border shadow-sm"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      {/* Navigation Header - Desktop */}
      <div className="hidden lg:block border-b" style={{ borderColor: "var(--color-outline)" }}>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {galleryItems.map((item) => {
              const validation = getValidationStatus(item);
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                    selectedItem === item.id ? "border-primary shadow-sm" : "border-outline hover:border-primary/50 hover:shadow-sm"
                  }`}
                  style={{
                    background: selectedItem === item.id ? "var(--color-primary-container)" : "var(--color-surface-variant)",
                    borderColor: selectedItem === item.id ? "var(--color-primary)" : "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  <span className="text-sm font-medium">{item.title}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--color-surface)",
                      color: "var(--color-on-surface-variant)",
                    }}
                  >
                    {item.photos.length}/{item.maxPhotos}
                  </span>
                  {validation &&
                    (validation.type === "success" ? (
                      <CheckCircle className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                    ) : (
                      <XCircle className="h-4 w-4" style={{ color: "var(--color-error)" }} />
                    ))}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Toggle */}
      <div className="lg:hidden border-b" style={{ borderColor: "var(--color-outline)" }}>
        <div className="p-4">
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="flex items-center justify-between w-full p-3 rounded-lg border transition-colors"
            style={{
              background: "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          >
            <span className="font-medium">{selectedItemData ? selectedItemData.title : "Select Document Type"}</span>
            {isMobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer - Sidebar Style */}
      <div className={["fixed inset-0 z-[2000] lg:hidden", isMobileNavOpen ? "pointer-events-auto" : "pointer-events-none"].join(" ")} role="dialog" aria-modal="true" aria-hidden={!isMobileNavOpen}>
        {/* Scrim (fades in/out) */}
        <button
          aria-label="Close navigation"
          onClick={() => setIsMobileNavOpen(false)}
          className={["absolute inset-0 transition-opacity duration-500 ease-in-out", isMobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"].join(" ")}
          style={{ backgroundColor: "var(--color-shadow-high)" }}
        />

        {/* Slide-over panel */}
        <div
          className={[
            "absolute inset-y-0 left-0 z-10 w-72 sm:w-80",
            "flex flex-col",
            "transform transition-all duration-500 ease-in-out will-change-transform",
            isMobileNavOpen ? "translate-x-0 opacity-100 scale-100 pointer-events-auto" : "-translate-x-full opacity-0 scale-[0.98] pointer-events-none",
          ].join(" ")}
          style={{
            backgroundColor: "var(--color-card)",
            borderRight: "1px solid var(--color-outline)",
            boxShadow: "var(--color-shadow-elevated) 0 10px 15px -3px, var(--color-shadow-elevated) 0 4px 6px -2px",
          }}
        >
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b" style={{ borderColor: "var(--color-outline)" }}>
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
              Document Types
            </h3>
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: "var(--color-on-surface-variant)" }}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {galleryItems.map((item) => {
                const validation = getValidationStatus(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleItemSelect(item.id);
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      selectedItem === item.id ? "border-primary" : "border-outline hover:border-primary/50"
                    }`}
                    style={{
                      background: selectedItem === item.id ? "var(--color-primary-container)" : "var(--color-surface-variant)",
                      borderColor: selectedItem === item.id ? "var(--color-primary)" : "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  >
                    <span className="text-sm font-medium">{item.title}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-on-surface-variant)",
                        }}
                      >
                        {item.photos.length}/{item.maxPhotos}
                      </span>
                      {validation &&
                        (validation.type === "success" ? (
                          <CheckCircle className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                        ) : (
                          <XCircle className="h-4 w-4" style={{ color: "var(--color-error)" }} />
                        ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Information Section */}
      {selectedItemData && (
        <div className="p-4 border-b" style={{ borderColor: "var(--color-outline)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-on-surface)" }}>
                {selectedItemData.title}
              </h3>

              {/* Validation Status */}
              {(() => {
                const validation = getValidationStatus(selectedItemData);
                if (validation) {
                  return (
                    <div className={`flex items-center gap-2 text-sm ${validation.type === "error" ? "text-red-600" : "text-green-600"}`}>
                      {validation.type === "error" ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      {validation.message}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {isEditMode && (
              <button
                onClick={() => handleAddPhoto(selectedItemData)}
                disabled={!canAddPhoto(selectedItemData) || isUploading || isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: canAddPhoto(selectedItemData) ? "var(--color-primary)" : "var(--color-surface-variant)",
                  color: canAddPhoto(selectedItemData) ? "var(--color-on-primary)" : "var(--color-on-surface-variant)",
                }}
              >
                <Plus className="h-4 w-4" />
                {canAddPhoto(selectedItemData) ? "Add Photo" : `Max ${selectedItemData.maxPhotos} Photos`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Display Area */}
      <div className="p-6">
        {selectedItemData ? (
          <div className="space-y-6">
            {/* Upload Error */}
            {uploadError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            {/* Delete Status / Errors */}
            {deleteMessage && (
              <div className="p-3 rounded-lg border text-sm" style={{ background: "var(--color-surface-variant)", borderColor: "var(--color-outline)", color: "var(--color-on-surface)" }}>
                {deleteMessage}
              </div>
            )}
            {deleteError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{deleteError}</div>}

            {/* Photo Display */}
            {selectedItemData.photos.length > 0 ? (
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative">
                  <div
                    className="relative w-full h-96 rounded-xl border overflow-hidden shadow-sm"
                    style={{
                      borderColor: "var(--color-outline)",
                      background: "var(--color-surface-variant)",
                    }}
                  >
                    {currentPhoto?.url ? (
                      <Image
                        src={currentPhoto.url}
                        alt={`${selectedItemData.title} - ${getPhotoLabel(selectedItemData, currentPhotoIndex)}`}
                        fill
                        className="object-contain cursor-pointer transition-transform hover:scale-105"
                        onClick={() => isEditMode && handleEditPhoto(selectedItemData, currentPhotoIndex)}
                        title={isEditMode ? "Click to replace photo" : ""}
                        onError={() => {
                          console.error("Image failed to load:", currentPhoto.url);
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Camera className="h-16 w-16" style={{ color: "var(--color-on-surface-variant)" }} />
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  {currentPhoto?.url && (
                    <button
                      onClick={() => handleDownloadImage(currentPhoto, selectedItemData.title, getPhotoLabel(selectedItemData, currentPhotoIndex))}
                      className="absolute top-4 right-4 p-2 rounded-full shadow-lg transition-all hover:scale-110"
                      style={{
                        background: "var(--color-primary)",
                        color: "var(--color-on-primary)",
                      }}
                      title="Download image"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  )}

                  {/* Navigation Controls */}
                  {selectedItemData.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => handlePhotoChange("prev")}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-all hover:scale-110"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-on-surface)",
                          border: "1px solid var(--color-outline)",
                        }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handlePhotoChange("next")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-all hover:scale-110"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-on-surface)",
                          border: "1px solid var(--color-outline)",
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Photo Info and Controls */}
                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    background: "var(--color-surface-variant)",
                  }}
                >
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
                      {getPhotoLabel(selectedItemData, currentPhotoIndex)}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--color-on-surface-variant)" }}>
                      {currentPhotoIndex + 1} of {selectedItemData.photos.length}
                    </span>
                  </div>

                  {isEditMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditPhoto(selectedItemData, currentPhotoIndex)}
                        disabled={isUploading || isDeleting}
                        className="p-2 rounded-lg transition-colors hover:bg-blue-50"
                        style={{ color: "var(--color-primary)" }}
                        title="Replace photo"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(selectedItemData, currentPhotoIndex)}
                        disabled={isUploading || isDeleting}
                        className="p-2 rounded-lg transition-colors hover:bg-red-50 disabled:opacity-50"
                        style={{ color: "var(--color-error)" }}
                        title="Delete photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnail Navigation */}
                {selectedItemData.photos.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {selectedItemData.photos.map((photo, index) => (
                      <div
                        key={`${selectedItemData.id}-photo-${index}`}
                        onClick={() => setCurrentPhotoIndex(index)}
                        className={`relative flex-shrink-0 w-20 h-20 rounded-lg border-2 transition-all cursor-pointer hover:scale-105 ${
                          currentPhotoIndex === index ? "border-primary shadow-md" : "border-outline hover:border-primary/50"
                        }`}
                        style={{
                          borderColor: currentPhotoIndex === index ? "var(--color-primary)" : "var(--color-outline)",
                        }}
                      >
                        {photo?.url ? (
                          <Image
                            src={photo.url}
                            alt={`${selectedItemData.title} - ${getPhotoLabel(selectedItemData, index)}`}
                            fill
                            className="object-cover rounded-lg"
                            onError={() => {
                              console.error("Image failed to load:", photo.url);
                            }}
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center rounded-lg"
                            style={{
                              background: "var(--color-surface)",
                            }}
                          >
                            <Camera
                              className="h-6 w-6"
                              style={{
                                color: "var(--color-on-surface-variant)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="aspect-video rounded-xl border-2 border-dashed flex items-center justify-center"
                style={{
                  borderColor: "var(--color-outline)",
                  background: "var(--color-surface-variant)",
                }}
              >
                <div className="text-center">
                  <Camera className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--color-on-surface-variant)" }} />
                  <p className="text-lg font-medium mb-2" style={{ color: "var(--color-on-surface)" }}>
                    No photos uploaded yet
                  </p>
                  {isEditMode && (
                    <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                      Click &quot;Add Photo&quot; to upload your first image
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-4" style={{ color: "var(--color-on-surface-variant)" }} />
              <p className="text-lg font-medium mb-2" style={{ color: "var(--color-on-surface)" }}>
                Select a document type
              </p>
              <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                Choose from the navigation above to view and manage photos
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
