// src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import './profile.css';
import landing_video from "../assets/landing_page_vid.mp4";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        setProfile({ email: user.email, full_name: "Explorer", age: "-" });
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return (
    <div className="profile-page-loading">
      <div className="spinner"></div>
    </div>
  );

  // Get initials for avatar
  const initials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="profile-dashboard">
      <div className='bg-video'>
                     <video autoPlay loop muted playsInline src={landing_video}>
                     </video>
          </div>
      {/* LEFT SIDEBAR DECORATION (Matches reference blue bar) */}
      <div className="dashboard-sidebar-decor"></div>

      <div className="profile-container">
        <div className="profile-card">
          
          {/* 1. GRADIENT BANNER */}
          <div className="profile-banner"></div>

          {/* 2. HEADER SECTION (Avatar + Name) */}
          <div className="profile-header">
            <div className="profile-avatar">
              {initials}
            </div>
            
            <div className="header-info">
              <h1>{profile?.full_name}</h1>
              <p className="role-tag">Interior Designer</p>
              <p className="location-text">📍 Earth, Solar System</p>
            </div>

            <div className="header-actions">
               <Link to="/settings" className="btn-secondary">Settings</Link>
               <button onClick={handleLogout} className="btn-secondary">Log Out</button>
            </div>
          </div>

          {/* 3. CONTENT GRID (Stats & Details) */}
          <div className="profile-content-grid">
            
            {/* Stat Card 1: Email */}
            <div className="info-card">
              <div className="icon-box blue">✉️</div>
              <div className="info-text">
                <span className="label">Contact Email</span>
                <span className="value">{profile?.email}</span>
              </div>
              <div className="arrow-icon">→</div>
            </div>

            {/* Stat Card 2: Age */}
            <div className="info-card">
              <div className="icon-box orange">🎂</div>
              <div className="info-text">
                <span className="label">Age</span>
                <span className="value">{profile?.age || "N/A"}</span>
              </div>
            </div>

            {/* Stat Card 3: Membership */}
            <div className="info-card">
              <div className="icon-box green">📅</div>
              <div className="info-text">
                <span className="label">Joined</span>
                <span className="value">{new Date().getFullYear()}</span>
              </div>
            </div>

            {/* Call to Action Card */}
            <div className="info-card cta-card">
              <div className="info-text">
                <span className="value">Ready to Design?</span>
                <span className="label">Create your next masterpiece.</span>
              </div>
              <Link to="/create" className="btn-primary">Open Studio</Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;