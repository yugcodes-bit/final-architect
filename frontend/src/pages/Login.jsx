import React from 'react';
import './login.css';
import login_video from '../assets/landing_page_vid.mp4';
import { Link } from 'react-router-dom';
import Signup from './Signup.jsx';

const Login = () => {
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
          <input type="password" placeholder="Password" />
          <div><button>Login</button> <Link to="/signup" className="signup-link">Sign Up</Link></div>
        </div>
      </div>
      <Link to='/'><div className='backhome'>Home</div></Link>
    </div>
  );
};

export default Login;