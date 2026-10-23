'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAdmin } from './context';

/** The sign-in screen shown to anyone who isn't signed in as an admin. */
export function AdminLogin() {
  const { email, setEmail, password, setPassword, login, error, busy } = useAdmin();

  return (
    <div className="admin-login-wrapper">
      <title>Sign in · Kitchen admin | Swaadha</title>
      <div className="admin-login-container">
        <div className="admin-login-box">
          <Link href="/" className="admin-login-brand">
            <img src="/logo-transparent.png" alt="Swaadha" />
          </Link>
          <h1>Welcome back.</h1>
          <p className="admin-login-subtitle">Admin Management</p>

          <form onSubmit={login}>
            <label>
              Admin email address
              <input
                required
                type="email"
                autoComplete="username"
                placeholder="admin@swaadha.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && (
              <p className="error" role="alert" style={{ marginBottom: 12 }}>
                {error}
              </p>
            )}

            <button className="button" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign into Kitchen'}
            </button>
          </form>

          <Link href="/" className="back-store-link">
            <ArrowLeft size={15} /> Return to storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
