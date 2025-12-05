// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import '../app.css';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Assets
import landing_video from "../assets/landing_page_vid.mp4";
import end_video from "../assets/end-page-vid.mp4";
import sofa from "../assets/furn_sofa.png";
import chair from "../assets/furn_chair.png";
import cupboard from "../assets/furn_cupboard.png";
import lamp from "../assets/furn_lamp.png";
import table from "../assets/furn_table.png";
import chair2 from "../assets/furn_chair2.png";
import drawer from "../assets/furn_drawer.png";
import Team from "./Team";
import one from "../assets/one.png";
import two from "../assets/two.png";
import three from "../assets/three.png";

const Home = () => {
  const [isFixed, setIsFixed] = useState(true);
  const [userName, setUserName] = useState(null); // Stores the real name
  const [loading, setLoading] = useState(true);

  // 1. FETCH USER & PROFILE NAME
  useEffect(() => {
    const getUserData = async () => {
      // Get the Auth User
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Get the Profile Data (Name) from 'profiles' table
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.full_name) {
          setUserName(profile.full_name);
        } else {
          // Fallback to email if name is missing
          setUserName(session.user.email.split('@')[0]);
        }
      }
      setLoading(false);
    };

    getUserData();
  }, []);

  // Existing Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;      
      if (scrollY >= 0 && scrollY < 450) {
        setIsFixed(true);   
      } else {
        setIsFixed(false);  
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div>
      <nav className="navbar">
        <div className="logo">Aura Architect</div>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/create">Create</Link></li>
          
          {/* 2. SHOW NAME IF LOGGED IN */}
          {!loading && (
            userName ? (
              <li>
                <Link to="/profile" style={{ 
                  color: '#f7f7f7ff', 
                  fontWeight: 'bold',
                  
                  overflow: "hidden",

                }}>
                  👤 {userName}
                </Link>
              </li>
            ) : (
              <li><Link to="/login">Login</Link></li>
            )
          )}
          
        </ul>
      </nav>

      <div className="App">
        <div className='bg-video'>
          <video autoPlay loop muted playsInline src={landing_video}></video>
        </div>

        <div className={isFixed ? "fixed" : "box"}>
          <h1 className='cr'>Create</h1>
          <p className='in'>interiors</p>
          <Link to='./create' ><button className="btn">Try it</button></Link> 
        </div>
      </div>

      {/* Floating Assets */}
      <img className='sofa' src={sofa} alt="Sofa" />
      <img className='chair' src={chair} alt="Chair" />
      <img className='cupboard' src={cupboard} alt="Cupboard" />
      <img className='lamp' src={lamp} alt="Lamp" />
      <img className='table' src={table} alt="Table" />
      <img className='chair2' src={chair2} alt="Chair2" />
      <img className='drawer' src={drawer} alt="Drawer" />

      <div className='tutorial'>
        <img id='one' src={one} alt="" />
        <img id='two' src={two} alt="" />
        <img id='three' src={three} alt="" />
      </div>

      <div className='team'> 
        <Team />
      </div>

      <div className='end'>
        <div className='bg-video-end'>
          <video autoPlay loop muted playsInline src={end_video}></video>
        </div>
      </div>
      
    </div>
  );
}

export default Home;