// src/pages/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import './signup.css'; // We reuse the CSS from the signup page

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevents the page from reloading
    setLoading(true);

    try {
      // 1. Ask Supabase to log us in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. If successful, go to the Designer
      if (data.user) {
        console.log("Logged in as:", data.user.email);
        navigate('/');
      }
      
    } catch (error) {
      console.error("Login failed:", error.message);
      alert(error.message); // Show the specific error to the user
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Link to="/" className="back-home-btn">← Back Home</Link>
      <div className="login-container">
        <h2>Welcome Back</h2>
        
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;