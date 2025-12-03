import React from 'react';
import './team.css';
import ronit from "../assets/ronit.png"
import raj from "../assets/raj.png"
import chetan from "../assets/chetan.png"
import yugant from "../assets/yugant.png"
const teamMembers = [
  {
    name: 'Chetan Mahajan',
    role: 'CEO & Founder',
    imageUrl: chetan,
  },
  {
    name: 'Yugant Chincholikar',
    role: 'Chief Architect',
    imageUrl: yugant,
  },
  {
    name: 'Raj Choudhari',
    role: 'Lead Designer',
    imageUrl: raj,
  },
  {
    name: 'Ronit Dahiwal',
    role: 'Project Manager',
    imageUrl: ronit,
  },
];

const Team = () => {
  return (
    <div className="team-container">
      <h1 className="team-heading">Our Team</h1>
      <div className="team-grid">
        {teamMembers.map((member, index) => (
          <div className="team-card" key={index}>
            <div className="team-image-container">
              <img src={member.imageUrl} alt={member.name} className="team-image" />
            </div>
            <h3 className="team-member-name">{member.name}</h3>
            <p className="team-member-role">{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Team;
