"use client";

import "@/app/ui/globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface ToastProviderProps {
  children: React.ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {

  return (
    <>
      {children}
      <ToastContainer position="bottom-center" autoClose={3000} pauseOnHover={false} />
    </>
  );
}