import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Buchhaltung
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/" className="hover:text-blue-200">Dashboard</Link>
          <Link to="/transactions" className="hover:text-blue-200">Buchungen</Link>
          <Link to="/reports" className="hover:text-blue-200">Berichte</Link>
          <Link to="/import" className="hover:text-blue-200">Import</Link>
          <Link to="/settings" className="hover:text-blue-200">Einstellungen</Link>
        </nav>
      </div>
    </header>
  );
}
