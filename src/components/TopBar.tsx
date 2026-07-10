import type { ReactNode } from 'react';
import logo from '../assets/logo.png';

type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

export default function TopBar({ title, subtitle, rightSlot }: Props) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <img src={logo} alt="" className="top-bar-logo" />
        <div className="top-bar-titles">
          {subtitle && <div className="eyebrow">{subtitle}</div>}
          <h1>{title}</h1>
        </div>
      </div>
      <div className="top-bar-right">
        {rightSlot}
        <span className="credit">MADE BY:- NEEL SOMANI</span>
      </div>
    </header>
  );
}
