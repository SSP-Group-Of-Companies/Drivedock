"use client";

import { useTranslation } from "react-i18next";

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function PoliciesConsentCheckbox({ checked, onChange }: Props) {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-start justify-center mt-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 border-gray-300 rounded cursor-pointer" />
      <label onClick={() => onChange(!checked)} className="ml-2 text-sm text-gray-700 cursor-pointer select-none">
        {t("form.step3.sendToEmail")}
      </label>
    </div>
  );
}
