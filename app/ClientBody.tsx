'use client';

export default function ClientBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <body className={className} suppressHydrationWarning>{children}</body>;
}
