import React, { useState } from "react";

export default function Sidebar({
  children,
}: React.PropsWithChildren): React.JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={`fixed w-11/12 h-screen shadow shadow-black bg-slate-50 bg-opacity-90 transition-all duration-150 ease-in-out z-50 ${
        open ? "right-0" : "-right-3/4"
      }`}
      onClick={() => setOpen(!open)}
    >
      {children}
    </aside>
  );
}
