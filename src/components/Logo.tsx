export function Logo({
  compact = false,
  theme = "light",
  size = "md",
}: {
  compact?: boolean;
  theme?: "light" | "dark";
  size?: "sm" | "md";
}) {
  const textClass =
    theme === "dark"
      ? "text-white"
      : "text-[#082968]";

  const textSize =
    size === "sm"
      ? "text-[22px]"
      : "text-[27px]";

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`logo-orbit ${
          size === "sm"
            ? "scale-[0.88]"
            : ""
        }`}
      >
        <span />
      </div>
      {!compact ? (
        <div
          className={`${textSize} font-black tracking-[-0.04em] ${textClass}`}
        >
          enorsis
        </div>
      ) : null}
    </div>
  );
}
