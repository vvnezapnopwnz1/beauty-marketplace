import React, { createContext, useContext, useState, useCallback } from "react";

type Ctx = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CreateActionContext = createContext<Ctx | null>(null);

export function CreateActionProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  return (
    <CreateActionContext.Provider value={{ isOpen, open, close }}>
      {children}
    </CreateActionContext.Provider>
  );
}

export function useCreateAction() {
  const v = useContext(CreateActionContext);
  if (!v) throw new Error("useCreateAction must be used within CreateActionProvider");
  return v;
}
