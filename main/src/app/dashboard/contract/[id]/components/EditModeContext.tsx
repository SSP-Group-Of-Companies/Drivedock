"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface EditModeContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children, initialEditMode = false }: { 
  children: ReactNode; 
  initialEditMode?: boolean;
}) {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);

  return (
    <EditModeContext.Provider value={{ isEditMode, setIsEditMode }}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}
