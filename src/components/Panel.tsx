import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function Panel({ children, className = '' }: Props) {
  return <div className={className ? `panel ${className}` : 'panel'}>{children}</div>;
}
