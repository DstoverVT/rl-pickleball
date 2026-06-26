"use client";

export default function ConfirmButton({
  message,
  variant,
  className,
  style,
  children,
}: {
  message: string;
  variant?: "danger";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const defaultClassName = "px-4 py-2 rounded text-xs font-bold tracking-wider uppercase";
  const defaultStyle: React.CSSProperties = {
    background: variant === "danger" ? "var(--accent-dim)" : "var(--accent)",
    color: "#fff",
  };

  return (
    <button
      type="submit"
      className={className ?? defaultClassName}
      style={style ?? defaultStyle}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
