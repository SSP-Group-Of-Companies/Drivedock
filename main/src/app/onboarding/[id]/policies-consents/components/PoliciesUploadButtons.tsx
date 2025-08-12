"use client";

import { Signature, Trash } from "lucide-react";

type Props = {
  onUploadClick: () => void;
  onClearClick: () => void;
  disabled: boolean;
  t: (key: string, defaultText: string) => string;
};

export default function PoliciesUploadButtons({ onUploadClick, onClearClick, disabled, t }: Props) {
  return (
    <div className="flex justify-center gap-4">
      <button onClick={onUploadClick} disabled={disabled} className="px-4 py-2 rounded-md hover:bg-gray-100 transition text-sm flex items-center gap-1 cursor-pointer">
        <Signature className="inline-block w-4 h-4 mr-1" />
        {t("actions.upload", "Upload")}
      </button>
      <button onClick={onClearClick} disabled={disabled} className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition text-sm flex items-center gap-1 cursor-pointer">
        <Trash className="inline-block w-4 h-4 mr-1" />
        {t("actions.clear", "Clear")}
      </button>
    </div>
  );
}
