import type { Metadata } from 'next';
import './auth.css';

export const metadata: Metadata = {
  title: 'LinkChat — Sign in',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-layout-root">{children}</div>;
}
