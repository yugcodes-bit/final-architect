// src/pages/Signup.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import './login.css'; // We can reuse the login CSS
import landing_video from "../assets/landing_page_vid.mp4";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the user in Supabase Auth (handles password securely)
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;

      if (data.user) {
        // 2. If Auth successful, save details to 'profiles' table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id, // Links to the Auth user
              full_name: fullName,
              age: parseInt(age),
              email: email
            }
          ]);

        if (profileError) throw profileError;

        alert('Signup successful! Please log in.');
        navigate('/login');
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
       <div className='bg-video'>
                           <video autoPlay loop muted playsInline src={landing_video}>
                           </video>
                </div>
      <Link to="/" className="back-home-btn">← BACK HOME</Link>
      <div className="login-container">
        <h2>Create Account</h2>
        <form onSubmit={handleSignup} className="login-form">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
            className="login-input"
          />
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p className="login-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;