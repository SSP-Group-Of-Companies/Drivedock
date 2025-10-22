"use client";

import { useState, useEffect, useMemo } from "react";
import { Trash2, Plus, AlertCircle } from "lucide-react";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { validateAddresses, type AddressValidationError } from "@/app/api/v1/admin/onboarding/[id]/application-form/personal-details/addressValidation";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { WithCopy } from "@/components/form/WithCopy";

interface AddressHistorySectionProps {
  data: IApplicationFormPage1;
  isEditMode: boolean;
  staged: any;
  onStage: (changes: any) => void;
}

export default function AddressHistorySection({ data, isEditMode, staged, onStage }: AddressHistorySectionProps) {
  // Use staged addresses if available, otherwise use original data
  const addresses = useMemo(
    () => staged.addresses || data.addresses || [],
    [staged.addresses, data.addresses]
  );

  // Validation state
  const [validationErrors, setValidationErrors] = useState<AddressValidationError[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };

  const addAddress = () => {
    const newAddresses = [
      ...addresses,
      { address: "", city: "", stateOrProvince: "", postalCode: "", from: "", to: "" },
    ];
    onStage({ addresses: newAddresses });
  };

  const removeAddress = (index: number) => {
    if (addresses.length > 1) {
      const newAddresses = addresses.filter((_: any, i: number) => i !== index);
      onStage({ addresses: newAddresses });
    }
  };

  const updateAddress = (index: number, field: string, value: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    onStage({ addresses: newAddresses });
  };

  // Validate addresses whenever they change
  useEffect(() => {
    if (isEditMode && addresses.length > 0) {
      const errors = validateAddresses(addresses);
      setValidationErrors(errors);
      setShowValidationErrors(errors.length > 0);
    } else {
      setValidationErrors([]);
      setShowValidationErrors(false);
    }
  }, [addresses, isEditMode]);

  // Get field-specific errors for an address
  const getFieldErrors = (addressIndex: number, field: string): AddressValidationError[] => {
    return validationErrors.filter(
      (error) => error.addressIndex === addressIndex && error.field === field
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-3 pb-2 border-b"
          style={{ borderColor: "var(--color-outline-variant)" }}
        >
          <div className="w-2 h-8 rounded-full" style={{ background: "var(--color-info)" }} />
          <h3 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
            Address History
          </h3>
        </div>

        {isEditMode && (
          <button
            type="button"
            onClick={addAddress}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--color-primary)", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        )}
      </div>

      {/* Validation Errors Display */}
      {showValidationErrors && validationErrors.length > 0 && (
        <div
          className="p-4 rounded-lg border"
          style={{ background: "var(--color-error-container)", borderColor: "var(--color-error)" }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--color-error)" }} />
            <div className="space-y-2">
              <h4 className="font-medium" style={{ color: "var(--color-error)" }}>
                Address Validation Errors
              </h4>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm" style={{ color: "var(--color-error)" }}>
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {addresses.map((address: any, index: number) => (
          <div
            key={index}
            className="p-4 rounded-lg border transition-all duration-200 hover:shadow-sm dark:hover:shadow-none"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold" style={{ color: "var(--color-on-surface)" }}>
                Address {index + 1}
              </h4>
              {isEditMode && addresses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAddress(index)}
                  className="flex items-center gap-2 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-opacity-80"
                  style={{ background: "var(--color-error)", color: "white" }}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove Address
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Street Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                  Street Address
                </label>
                {isEditMode ? (
                  <div className="space-y-1">
                    <WithCopy value={address.address || ""} label="Street address">
                      <input
                        type="text"
                        value={address.address}
                        onChange={(e) => updateAddress(index, "address", e.target.value)}
                        className={`w-full p-3 rounded-lg border text-sm transition-colors pr-10 ${
                          getFieldErrors(index, "address").length > 0 ? "border-red-500" : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "address").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter street address"
                      />
                    </WithCopy>
                    {getFieldErrors(index, "address").map((error, errorIndex) => (
                      <p key={errorIndex} className="text-xs" style={{ color: "var(--color-error)" }}>
                        {error.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <WithCopy value={address.address || ""} label="Street address">
                    <div
                      className="p-3 rounded-lg border pr-10"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                        {address.address || "Not provided"}
                      </span>
                    </div>
                  </WithCopy>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                  City
                </label>
                {isEditMode ? (
                  <div className="space-y-1">
                    <WithCopy value={address.city || ""} label="City">
                      <input
                        type="text"
                        value={address.city}
                        onChange={(e) => updateAddress(index, "city", e.target.value)}
                        className={`w-full p-3 rounded-lg border text-sm transition-colors pr-10 ${
                          getFieldErrors(index, "city").length > 0 ? "border-red-500" : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "city").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter city"
                      />
                    </WithCopy>
                    {getFieldErrors(index, "city").map((error, errorIndex) => (
                      <p key={errorIndex} className="text-xs" style={{ color: "var(--color-error)" }}>
                        {error.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <WithCopy value={address.city || ""} label="City">
                    <div
                      className="p-3 rounded-lg border pr-10"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                        {address.city || "Not provided"}
                      </span>
                    </div>
                  </WithCopy>
                )}
              </div>

              {/* State or Province */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                  State or Province
                </label>
                {isEditMode ? (
                  <div className="space-y-1">
                    <WithCopy value={address.stateOrProvince || ""} label="State or province">
                      <input
                        type="text"
                        value={address.stateOrProvince}
                        onChange={(e) => updateAddress(index, "stateOrProvince", e.target.value)}
                        className={`w-full p-3 rounded-lg border text-sm transition-colors pr-10 ${
                          getFieldErrors(index, "stateOrProvince").length > 0 ? "border-red-500" : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "stateOrProvince").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="Enter province or state"
                      />
                    </WithCopy>
                    {getFieldErrors(index, "stateOrProvince").map((error, errorIndex) => (
                      <p key={errorIndex} className="text-xs" style={{ color: "var(--color-error)" }}>
                        {error.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <WithCopy value={address.stateOrProvince || ""} label="State or province">
                    <div
                      className="p-3 rounded-lg border pr-10"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                        {address.stateOrProvince || "Not provided"}
                      </span>
                    </div>
                  </WithCopy>
                )}
              </div>

              {/* Zip Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                  Zip Code
                </label>
                {isEditMode ? (
                  <div className="space-y-1">
                    <WithCopy value={address.postalCode || ""} label="Zip code">
                      <input
                        type="text"
                        value={address.postalCode}
                        onChange={(e) => updateAddress(index, "postalCode", e.target.value)}
                        className={`w-full p-3 rounded-lg border text-sm transition-colors pr-10 ${
                          getFieldErrors(index, "postalCode").length > 0 ? "border-red-500" : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "postalCode").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                        placeholder="12345 or 12345-6789"
                      />
                    </WithCopy>
                    {getFieldErrors(index, "postalCode").map((error, errorIndex) => (
                      <p key={errorIndex} className="text-xs" style={{ color: "var(--color-error)" }}>
                        {error.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <WithCopy value={address.postalCode || ""} label="Zip code">
                    <div
                      className="p-3 rounded-lg border pr-10"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                        {address.postalCode || "Not provided"}
                      </span>
                    </div>
                  </WithCopy>
                )}
              </div>

              {/* From Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                  From Date
                </label>
                {isEditMode ? (
                  <div className="space-y-1">
                    <WithCopy value={formatInputDate(address.from) || ""} label="From date">
                      <input
                        type="date"
                        value={formatInputDate(address.from) || ""}
                        onChange={(e) => updateAddress(index, "from", e.target.value)}
                        className={`w-full p-3 rounded-lg border text-sm transition-colors pr-10 ${
                          getFieldErrors(index, "from").length > 0 ? "border-red-500" : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "from").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                      />
                    </WithCopy>
                    {getFieldErrors(index, "from").map((error, errorIndex) => (
                      <p key={errorIndex} className="text-xs" style={{ color: "var(--color-error)" }}>
                        {error.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <WithCopy value={formatInputDate(address.from) || ""} label="From date">
                    <div
                      className="p-3 rounded-lg border pr-10"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                        {address.from ? formatDate(address.from) : "Not provided"}
                      </span>
                    </div>
                  </WithCopy>
                )}
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                  To Date
                </label>
                {isEditMode ? (
                  <div className="space-y-1">
                    <WithCopy value={formatInputDate(address.to) || ""} label="To date">
                      <input
                        type="date"
                        value={formatInputDate(address.to) || ""}
                        onChange={(e) => updateAddress(index, "to", e.target.value)}
                        className={`w-full p-3 rounded-lg border text-sm transition-colors pr-10 ${
                          getFieldErrors(index, "to").length > 0 ? "border-red-500" : ""
                        }`}
                        style={{
                          background: "var(--color-surface)",
                          borderColor:
                            getFieldErrors(index, "to").length > 0
                              ? "var(--color-error)"
                              : "var(--color-outline)",
                          color: "var(--color-on-surface)",
                        }}
                      />
                    </WithCopy>
                    {getFieldErrors(index, "to").map((error, errorIndex) => (
                      <p key={errorIndex} className="text-xs" style={{ color: "var(--color-error)" }}>
                        {error.message}
                      </p>
                    ))}
                  </div>
                ) : (
                  <WithCopy value={formatInputDate(address.to) || ""} label="To date">
                    <div
                      className="p-3 rounded-lg border pr-10"
                      style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                        {address.to ? formatDate(address.to) : "Not provided"}
                      </span>
                    </div>
                  </WithCopy>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
