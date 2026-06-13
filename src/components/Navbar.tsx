import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, userRole, loading, signInWithGoogle, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="h-16 flex items-center justify-between px-10 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-50">
      <div className="flex w-full justify-between h-full">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">SR</div>
            <span className="text-xl font-bold tracking-tight text-slate-800">SR Studio</span>
          </Link>
          <div className="hidden sm:flex sm:space-x-8 text-sm font-medium text-slate-600">
            <Link to="/" className="inline-flex items-center hover:text-indigo-600 transition-colors">
              Home
            </Link>
            <Link to="/gigs" className="inline-flex items-center hover:text-indigo-600 transition-colors">
              Services
            </Link>
          </div>
        </div>
        <div className="hidden sm:flex sm:items-center space-x-4">
          {loading ? (
            <div className="animate-pulse flex items-center space-x-4">
              <div className="h-8 w-24 bg-slate-200 rounded"></div>
              <div className="h-8 w-24 bg-slate-200 rounded"></div>
            </div>
          ) : user ? (
            <>
              <Link
                to={userRole === 'admin' ? '/admin' : '/dashboard'}
                className="text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="text-slate-600 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={signInWithGoogle}
                className="text-sm font-semibold text-slate-900 hover:text-indigo-600"
              >
                Sign In
              </button>
              <button
                onClick={signInWithGoogle}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700"
              >
                Client Portal
              </button>
            </>
          )}
        </div>
        <div className="-mr-2 flex items-center sm:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden absolute top-16 left-0 right-0 bg-white border-b border-slate-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link to="/" className="block pl-3 pr-4 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/gigs" className="block pl-3 pr-4 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>Services</Link>
            {loading ? (
               <div className="block pl-3 pr-4 py-2 text-base font-medium text-slate-400">Loading...</div>
            ) : user ? (
              <>
                <Link to={userRole === 'admin' ? '/admin' : '/dashboard'} className="block pl-3 pr-4 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { signOut(); setMenuOpen(false); }} className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50">Sign Out</button>
              </>
            ) : (
              <button onClick={() => { signInWithGoogle(); setMenuOpen(false); }} className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-indigo-600 hover:bg-indigo-50">Sign In</button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
