"use client";

import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Check } from "lucide-react";
import { listSafetyAdmins, ESafetyAdminId } from "@/constants/safetyAdmins";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (adminId: ESafetyAdminId) => void;
};

export default function SafetyAdminPickerModal({ isOpen, onClose, onSelect }: Props) {
  const admins = listSafetyAdmins();

  const handleSelect = (adminId: ESafetyAdminId) => {
    onSelect(adminId);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.2 }} 
          className="fixed inset-0 bg-black/40" 
          aria-hidden="true" 
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg shadow-xl overflow-hidden" style={{
            background: "var(--color-surface)",
          }}>
            <motion.div 
              initial={{ y: 30, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 30, opacity: 0 }} 
              transition={{ duration: 0.2 }} 
            >
              <div className="flex justify-between items-center p-4 border-b" style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                  <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    Select Safety Admin
                  </h3>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-full transition-colors hover:bg-red-100" 
                  style={{ color: "var(--color-error)" }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-4">
                <p className="text-sm mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
                  This document requires a Safety Admin signature. Please select the appropriate Safety Admin:
                </p>
                
                <div className="space-y-2">
                  {admins.map((admin) => (
                    <button
                      key={admin.id}
                      onClick={() => handleSelect(admin.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border transition-colors hover:shadow-sm"
                      style={{
                        background: "var(--color-surface-variant)",
                        borderColor: "var(--color-outline-variant)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ background: "var(--color-primary-container)" }}>
                          <User className="h-4 w-4" style={{ color: "var(--color-on-primary-container)" }} />
                        </div>
                        <span className="font-medium text-sm" style={{ color: "var(--color-on-surface)" }}>
                          {admin.name}
                        </span>
                      </div>
                      <Check className="h-4 w-4" style={{ color: "var(--color-primary)" }} />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </AnimatePresence>
  );
}
