type SkeletonBlockProps = {
  className?: string;
};

export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-[24px] bg-[linear-gradient(90deg,rgba(226,232,240,0.9),rgba(241,245,249,1),rgba(226,232,240,0.9))] ${className}`}
    />
  );
}
