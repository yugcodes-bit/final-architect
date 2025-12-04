// src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import './profile.css'; // We will create this CSS next

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // 2. Fetch profile details
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn("No profile found, using auth data");
        // Fallback if profile doesn't exist yet
        setProfile({ email: user.email, full_name: "User", age: "-" });
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

  if (loading) return <div className="profile-page">Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar-circle">
            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
          </div>
          <h1>{profile?.full_name}</h1>
          <p className="email-text">{profile?.email}</p>
        </div>

        <div className="profile-details">
          <div className="detail-item">
            <span className="label">Age</span>
            <span className="value">{profile?.age}</span>
          </div>
          <div className="detail-item">
            <span className="label">Member Since</span>
            <span className="value">{new Date().getFullYear()}</span>
          </div>
        </div>

        <div className="profile-actions">
           <Link to="/create" className="action-btn primary">Go to Designer</Link>
           <button onClick={handleLogout} className="action-btn logout">Sign Out</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;