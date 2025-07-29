"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Upload } from "lucide-react";
dayjs.extend(duration);

type AddressInput = {
  from: string;
  to: string;
};

export default function AddressSection() {
  const { t } = useTranslation("common");
  const { register, control, watch } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  const watchedAddresses = watch("addresses") as AddressInput[];

  const [notEnoughYears, setNotEnoughYears] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Only calculate if there are addresses with both from and to dates
    const validAddresses = watchedAddresses?.filter(
      (addr) => addr.from && addr.to
    );

    if (!validAddresses || validAddresses.length === 0) {
      setNotEnoughYears(false);
      return;
    }

    const totalMonths = validAddresses.reduce((acc, curr) => {
      const from = dayjs(curr.from);
      const to = dayjs(curr.to);
      const diff = to.diff(from, "month");
      return acc + (diff > 0 ? diff : 0);
    }, 0);

    setNotEnoughYears(totalMonths < 60);
  }, [watchedAddresses]);

  const handleAdd = () => {
    append({
      address: "",
      city: "",
      stateOrProvince: "",
      postalCode: "",
      from: "",
      to: "",
    });

    if (notEnoughYears && addButtonRef.current) {
      addButtonRef.current.classList.remove("animate-wiggle");
      void addButtonRef.current.offsetWidth;
      addButtonRef.current.classList.add("animate-wiggle");
    }
  };

  // Always ensure at least one address entry is rendered
  const hasFirst = fields.length > 0;
  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">
        {t("form.page1.sections.address")}
      </h2>
      {/* Always show the first address entry */}
      <div
        key={hasFirst ? fields[0].id : "first-address"}
        className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.address")}
            </label>
            <input
              {...register(`addresses.0.address`)}
              type="text"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
          </div>
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.city")}
            </label>
            <input
              {...register(`addresses.0.city`)}
              type="text"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
          </div>
          {/* State/Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.stateOrProvince")}
            </label>
            <input
              {...register(`addresses.0.stateOrProvince`)}
              type="text"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
          </div>
          {/* Postal Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.postalCode")}
            </label>
            <input
              {...register(`addresses.0.postalCode`)}
              type="text"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
          </div>
          {/* From */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.from")}
            </label>
            <input
              {...register(`addresses.0.from`)}
              type="date"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
          </div>
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.to")}
            </label>
            <input
              {...register(`addresses.0.to`)}
              type="date"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
          </div>
        </div>
      </div>
      {/* Additional addresses (if any) */}
      {fields.length > 1 &&
        fields.slice(1).map((field, index) => (
          <div
            key={field.id}
            className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white mt-6"
          >
            <button
              type="button"
              onClick={() => remove(index + 1)}
              className="absolute top-3 right-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200 transition-colors duration-200"
            >
              {t("form.actions.removeAddress")}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.address")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.address`)}
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
              </div>
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.city")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.city`)}
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
              </div>
              {/* State/Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.stateOrProvince")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.stateOrProvince`)}
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
              </div>
              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.postalCode")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.postalCode`)}
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
              </div>
              {/* From */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.from")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.from`)}
                  type="date"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
              </div>
              {/* To */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.to")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.to`)}
                  type="date"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
              </div>
            </div>
          </div>
        ))}
      {notEnoughYears && (
        <p className="text-red-500 text-sm">{t("form.errors.minimum5Years")}</p>
      )}
      <button
        type="button"
        ref={addButtonRef}
        onClick={handleAdd}
        className="mt-6 mx-auto flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200 font-medium"
      >
        <Upload className="w-4 h-4" />
        {t("form.actions.addAddress")}
      </button>
    </section>
  );
}
