"use client";

import React, { useState, useEffect } from "react";
import { useEditMode } from "../../components/EditModeContext";
import { ILicenseEntry, IFastCard } from "@/types/applicationForm.types";
import { IPhoto, ECountryCode } from "@/types/shared.types";
import { Image, ChevronLeft, ChevronRight, Plus, Camera, Upload, Trash2, AlertCircle } from "lucide-react";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { useParams } from "next/navigation";

interface ImageGallerySectionProps {
  licenses: ILicenseEntry[];
  incorporatePhotos: IPhoto[];
  hstPhotos: IPhoto[];
  bankingInfoPhotos: IPhoto[];
  healthCardPhotos: IPhoto[];
  medicalCertificationPhotos: IPhoto[];
  passportPhotos: IPhoto[];
  prPermitCitizenshipPhotos: IPhoto[];
  usVisaPhotos: IPhoto[];
  fastCard?: IFastCard;
  employeeNumber?: string;
  hstNumber?: string;
  businessNumber?: string;
  onStage: (changes: any) => void;
  countryCode: ECountryCode;
}

interface GalleryItem {
  id: string;
  title: string;
  photos: IPhoto[];
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
  employeeNumber,
  hstNumber,
  businessNumber,
  onStage,
  countryCode,
}: ImageGallerySectionProps) {
  const { isEditMode } = useEditMode();
  const { id: trackerId } = useParams<{ id: string }>();
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering dynamic content
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    ...(licenses.length > 0 ? [{
      id: "license-primary",
      title: "License 1 (Primary - AZ)",
      photos: [licenses[0].licenseFrontPhoto, licenses[0].licenseBackPhoto].filter(Boolean) as IPhoto[],
      type: "license",
      hasFrontBack: true,
      maxPhotos: PHOTO_LIMITS.license,
      required: true,
      fieldKey: "licenses",
    }] : []),
    
    // Fast Card - only for Canadians
    ...(isCanadian && fastCard ? [{
      id: "fastCard",
      title: "Fast Card",
      photos: [fastCard.fastCardFrontPhoto, fastCard.fastCardBackPhoto].filter(Boolean) as IPhoto[],
      type: "fastCard",
      hasFrontBack: true,
      maxPhotos: PHOTO_LIMITS.fastCard,
      required: true, // Fast Card requires both photos if provided
      fieldKey: "fastCard",
    }] : []),
    
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
      businessValidation: true, // Mark for business validation
    },
    
    // Medical/Identity documents - country-specific
    ...(isCanadian ? [
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
      {
        id: "usVisa",
        title: "US Visa",
        photos: usVisaPhotos || [],
        type: "usVisa",
        hasFrontBack: false,
        maxPhotos: PHOTO_LIMITS.usVisa,
        required: true, // Can be 1-2 photos, but required
        fieldKey: "usVisaPhotos",
      },
    ] : []),
    
    ...(isUS ? [
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
    ] : []),
    
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
    {
      id: "prPermit",
      title: "PR Permit/Citizenship",
      photos: prPermitCitizenshipPhotos || [],
      type: "prPermit",
      hasFrontBack: false,
      maxPhotos: PHOTO_LIMITS.prPermit,
      required: true, // Can be 1-2 photos, but required
      fieldKey: "prPermitCitizenshipPhotos",
    },
  ];

  const selectedItemData = galleryItems.find(item => item.id === selectedItem);
  const currentPhoto = selectedItemData?.photos[currentPhotoIndex];

  const handleItemSelect = (itemId: string) => {
    setSelectedItem(itemId);
    setCurrentPhotoIndex(0);
    setUploadError("");
  };

  const handlePhotoChange = (direction: 'prev' | 'next') => {
    if (!selectedItemData) return;
    
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => 
        prev === 0 ? selectedItemData.photos.length - 1 : prev - 1
      );
    } else {
      setCurrentPhotoIndex(prev => 
        prev === selectedItemData.photos.length - 1 ? 0 : prev + 1
      );
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
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
        const newPhoto: IPhoto = {
          url: result.url,        // S3 public URL
          s3Key: result.s3Key,    // S3 key
        };

        // Handle Fast Card photos differently since they're object properties, not arrays
        if (item.type === "fastCard") {
          // Find which photo is missing (front or back)
          const currentPhotos = item.photos;
          if (currentPhotos.length === 0) {
            // No photos yet, add as front photo
            onStage({ fastCard: {
              ...fastCard,
              fastCardFrontPhoto: newPhoto,
            }});
          } else if (currentPhotos.length === 1) {
            // One photo exists, add as back photo
            const existingPhoto = currentPhotos[0];
            const isFrontPhoto = existingPhoto === fastCard?.fastCardFrontPhoto;
            
            if (isFrontPhoto) {
              onStage({ fastCard: {
                ...fastCard,
                fastCardBackPhoto: newPhoto,
              }});
            } else {
              onStage({ fastCard: {
                ...fastCard,
                fastCardFrontPhoto: newPhoto,
              }});
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
          // Regular array-based photos
          const newPhotos = [...item.photos, newPhoto];
          onStage({ [item.fieldKey]: newPhotos });
        }

        setIsUploading(false);
      } catch (error: any) {
        setIsUploading(false);
        setUploadError(error?.message || "Failed to upload photo. Please try again.");
      }
    };
    input.click();
  };

  const handleDeletePhoto = (item: GalleryItem, photoIndex: number) => {
    // Handle Fast Card photos differently since they're object properties, not arrays
    if (item.type === "fastCard") {
      const currentPhotos = item.photos;
      const photoToDelete = currentPhotos[photoIndex];
      
      // Determine which photo to delete and update accordingly
      if (photoToDelete === fastCard?.fastCardFrontPhoto) {
        onStage({ fastCard: {
          ...fastCard,
          fastCardFrontPhoto: undefined,
        }});
      } else if (photoToDelete === fastCard?.fastCardBackPhoto) {
        onStage({ fastCard: {
          ...fastCard,
          fastCardBackPhoto: undefined,
        }});
      }
      
      // Adjust current photo index if needed
      if (currentPhotoIndex >= currentPhotos.length - 1 && currentPhotos.length > 1) {
        setCurrentPhotoIndex(currentPhotos.length - 2);
      } else if (currentPhotos.length === 1) {
        setCurrentPhotoIndex(0);
      }
    } else if (item.type === "license") {
      // Handle license photos - they're stored as properties on the license object
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
      
      // Adjust current photo index if needed
      if (currentPhotoIndex >= currentPhotos.length - 1 && currentPhotos.length > 1) {
        setCurrentPhotoIndex(currentPhotos.length - 2);
      } else if (currentPhotos.length === 1) {
        setCurrentPhotoIndex(0);
      }
    } else {
      // Regular array-based photos
      const newPhotos = item.photos.filter((_, index) => index !== photoIndex);
      onStage({ [item.fieldKey]: newPhotos });
      
      // Adjust current photo index if needed
      if (currentPhotoIndex >= newPhotos.length && newPhotos.length > 0) {
        setCurrentPhotoIndex(newPhotos.length - 1);
      } else if (newPhotos.length === 0) {
        setCurrentPhotoIndex(0);
      }
    }
  };

  const handleEditPhoto = async (item: GalleryItem, photoIndex: number) => {
    // Create a file input for photo replacement
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
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
        const newPhoto: IPhoto = {
          url: result.url,        // S3 public URL
          s3Key: result.s3Key,    // S3 key
        };

        // Handle Fast Card photos differently since they're object properties, not arrays
        if (item.type === "fastCard") {
          const currentPhotos = item.photos;
          const photoToReplace = currentPhotos[photoIndex];
          
          // Determine which photo to replace and update accordingly
          if (photoToReplace === fastCard?.fastCardFrontPhoto) {
            onStage({ fastCard: {
              ...fastCard,
              fastCardFrontPhoto: newPhoto,
            }});
          } else if (photoToReplace === fastCard?.fastCardBackPhoto) {
            onStage({ fastCard: {
              ...fastCard,
              fastCardBackPhoto: newPhoto,
            }});
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
          // Regular array-based photos
          const newPhotos = [...item.photos];
          newPhotos[photoIndex] = newPhoto;
          onStage({ [item.fieldKey]: newPhotos });
        }

        setIsUploading(false);
      } catch (error: any) {
        setIsUploading(false);
        setUploadError(error?.message || "Failed to replace photo. Please try again.");
      }
    };
    input.click();
  };

  // Business section validation helper
  const getBusinessValidationStatus = () => {
    const hasBusinessData = 
      (employeeNumber && employeeNumber.trim()) ||
      (hstNumber && hstNumber.trim()) ||
      (businessNumber && businessNumber.trim()) ||
      (incorporatePhotos && incorporatePhotos.length > 0) ||
      (hstPhotos && hstPhotos.length > 0) ||
      (bankingInfoPhotos && bankingInfoPhotos.length > 0);
    
    if (!hasBusinessData) return null; // No business data, no validation needed
    
    // Check if all business fields are filled
    const allFieldsFilled = 
      (employeeNumber && employeeNumber.trim()) &&
      (hstNumber && hstNumber.trim()) &&
      (businessNumber && businessNumber.trim()) &&
      (incorporatePhotos && incorporatePhotos.length > 0) &&
      (hstPhotos && hstPhotos.length > 0) &&
      (bankingInfoPhotos && bankingInfoPhotos.length > 0);
    
    if (!allFieldsFilled) {
      return {
        type: 'error' as const,
        message: 'If you provide any business information, all fields must be completed',
      };
    }
    
    return {
      type: 'success' as const,
      message: 'Business information complete',
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
          type: 'error' as const,
          message: `${item.title} requires exactly 2 photos (front and back)`,
        };
      }
      if (item.photos.length === 2) {
        return {
          type: 'success' as const,
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
        type: 'error' as const,
        message: `${item.title} requires exactly 2 photos (front and back)`,
      };
    }
    
    if (item.photos.length === 0) {
      return {
        type: 'error' as const,
        message: `${item.title} is required`,
      };
    }
    
    return {
      type: 'success' as const,
      message: `${item.title} requirements met`,
    };
  };

  // Don't render dynamic content until mounted to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="rounded-xl border p-6 shadow-sm" style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}>
        <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--color-on-surface)" }}>
          Image Gallery
        </h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent mx-auto mb-2" style={{
              borderTopColor: "var(--color-primary)",
              borderWidth: "2px",
            }} />
            <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Loading gallery...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6 shadow-sm" style={{
      background: "var(--color-surface)",
      borderColor: "var(--color-outline)",
    }}>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--color-on-surface)" }}>
        Image Gallery
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Navigation */}
        <div className="space-y-2">
          <h3 className="font-medium mb-3" style={{ color: "var(--color-on-surface)" }}>
            Document Types
          </h3>
          
          {galleryItems.map((item) => {
            const validation = getValidationStatus(item);
            return (
              <button
                key={item.id}
                onClick={() => handleItemSelect(item.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedItem === item.id 
                    ? "border-primary bg-primary/10" 
                    : "border-outline hover:border-primary/50"
                }`}
                style={{
                  background: selectedItem === item.id 
                    ? "var(--color-primary-container)" 
                    : "var(--color-surface-variant)",
                  borderColor: selectedItem === item.id 
                    ? "var(--color-primary)" 
                    : "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    background: "var(--color-surface)",
                    color: "var(--color-on-surface-variant)",
                  }}>
                    {item.photos.length}/{item.maxPhotos}
                  </span>
                </div>
                
                {/* Validation Status */}
                {validation && (
                  <div className={`mt-1 text-xs px-2 py-1 rounded ${
                    validation.type === 'error' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {validation.message}
                  </div>
                )}
                
                {item.hasFrontBack && item.photos.length >= 2 && (
                  <div className="flex gap-1 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{
                      background: "var(--color-primary)",
                      color: "var(--color-on-primary)",
                    }}>
                      F
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{
                      background: "var(--color-secondary)",
                      color: "var(--color-on-secondary)",
                    }}>
                      B
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side - Image Display */}
        <div className="lg:col-span-2">
          {selectedItemData ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium" style={{ color: "var(--color-on-surface)" }}>
                  {selectedItemData.title}
                </h3>
                {isEditMode && (
                  <button 
                    onClick={() => handleAddPhoto(selectedItemData)}
                    disabled={!canAddPhoto(selectedItemData) || isUploading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    style={{
                      background: canAddPhoto(selectedItemData) 
                        ? "var(--color-primary)" 
                        : "var(--color-surface-variant)",
                      color: canAddPhoto(selectedItemData) 
                        ? "var(--color-on-primary)" 
                        : "var(--color-surface-variant)",
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {canAddPhoto(selectedItemData) ? "Add Photo" : `Max ${selectedItemData.maxPhotos} Photos`}
                  </button>
                )}
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {uploadError}
                </div>
              )}

              {/* Photo Display */}
              {selectedItemData.photos.length > 0 ? (
                <div className="relative">
                  {/* Main Image */}
                  <div className="relative aspect-video rounded-lg border overflow-hidden" style={{
                    borderColor: "var(--color-outline)",
                    background: "var(--color-surface-variant)",
                  }}>
                    {currentPhoto?.url ? (
                      <img
                        src={currentPhoto.url}
                        alt={`${selectedItemData.title} - ${getPhotoLabel(selectedItemData, currentPhotoIndex)}`}
                        className="w-full h-full object-contain cursor-pointer"
                        onClick={() => isEditMode && handleEditPhoto(selectedItemData, currentPhotoIndex)}
                        title={isEditMode ? "Click to replace photo" : ""}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Camera className="h-12 w-12" style={{ color: "var(--color-on-surface-variant)" }} />
                      </div>
                    )}
                  </div>

                  {/* Navigation Controls */}
                  {selectedItemData.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => handlePhotoChange('prev')}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-colors"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handlePhotoChange('next')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full shadow-lg transition-colors"
                        style={{
                          background: "var(--color-surface)",
                          color: "var(--color-on-surface)",
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center" style={{
                  borderColor: "var(--color-outline)",
                  background: "var(--color-surface-variant)",
                }}>
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2" style={{ color: "var(--color-on-surface-variant)" }} />
                    <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                      No photos uploaded yet
                    </p>
                    {isEditMode && (
                      <p className="text-xs mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                        Click &quot;Add Photo&quot; to upload
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Photo Info */}
              {selectedItemData.photos.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg" style={{
                  background: "var(--color-surface-variant)",
                }}>
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
                        disabled={isUploading}
                        className="p-1 rounded transition-colors hover:bg-blue-100" 
                        style={{ color: "var(--color-primary)" }}
                        title="Replace photo"
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeletePhoto(selectedItemData, currentPhotoIndex)}
                        disabled={isUploading}
                        className="p-1 rounded transition-colors hover:bg-red-100" 
                        style={{ color: "var(--color-error)" }}
                        title="Delete photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Thumbnail Navigation */}
              {selectedItemData.photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedItemData.photos.map((photo, index) => (
                    <div
                      key={`${selectedItemData.id}-photo-${index}`}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-colors relative cursor-pointer ${
                        currentPhotoIndex === index 
                          ? "border-primary" 
                          : "border-outline hover:border-primary/50"
                      }`}
                      style={{
                        borderColor: currentPhotoIndex === index 
                          ? "var(--color-primary)" 
                          : "var(--color-outline)",
                      }}
                    >
                      {photo?.url ? (
                        <img
                          src={photo.url}
                          alt={`${selectedItemData.title} - ${getPhotoLabel(selectedItemData, index)}`}
                          className="w-full h-full object-cover rounded"
                        onError={(e) => {
                            console.error('Image failed to load:', photo.url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center rounded" style={{
                          background: "var(--color-surface)",
                        }}>
                          <Camera className="h-6 w-6" style={{ color: "var(--color-on-surface-variant)" }} />
                        </div>
                      )}
                      
                      {/* No edit/delete buttons on thumbnails - moved to description row */}
                    </div>
                  ))}
                </div>
              )}
              

            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Image className="h-12 w-12 mx-auto mb-2" style={{ color: "var(--color-on-surface-variant)" }} />
                <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                  Select a document type to view photos
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
