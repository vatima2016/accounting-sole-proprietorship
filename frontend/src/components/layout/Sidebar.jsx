import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Buchungen', icon: '📋' },
  { to: '/reports', label: 'Berichte', icon: '📈' },
  { to: '/import', label: 'Import', icon: '📥' },
  { to: '/settings', label: 'Einstellungen', icon: '⚙️' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-50 border-r border-gray-200 min-h-[calc(100vh-52px)]">
      <nav className="py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm ${
                isActive ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
