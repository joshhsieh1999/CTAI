"use client";

import { NextUIProvider } from "@nextui-org/react";

type Props = {
  children?: React.ReactNode;
};

export const WrappedNextUIProvider = ({ children }: Props) => {
  return <NextUIProvider className="h-full">{children}</NextUIProvider>;
};