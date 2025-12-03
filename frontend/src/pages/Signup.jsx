import React from 'react';
import './login.css';
import login_video from '../assets/landing_page_vid.mp4';
import { Link } from 'react-router-dom';
import Login from './Login.jsx';

const Signup = () => {
  return (
  
    <div className="login-page">
      <video autoPlay loop muted className="bg-video">
        <source src={login_video} type="video/mp4" />
      </video>
      <div className="login-container">
        <div className="login-card">
          <h2>Aura Architect</h2>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Set Password" />
          <div><button>Sign up</button> <Link to="/login" className="signup-link">Login</Link></div>
        </div>
      </div>
      <Link to='/'><div className='backhome'>Home</div></Link>
    </div>
  );
};

export default Signup;