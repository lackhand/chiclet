import React from "react";

export default function Card({
  className,
  children,
  ...rest
}: React.PropsWithChildren<any>) {
  return (
    <div
      className={`rounded-3xl border-4 border-opacity-100 border-slate-100 bg-opacity-80 bg-slate-800 text-slate-100 p-4 ${
        className ?? ""
      }`}
      {...rest}
    >
      {children}
    </div>
  );
}
