import React from 'react';
import '../styles/AboutUs.css';

const AboutUs = () => {
  const teamMembers = [
    { name: 'Meet Vasita', role: 'Final Year Student' },
    { name: 'Mehraan Khan', role: 'Final Year Student' },
    { name: 'Sanket Gaikwad', role: 'Final Year Student' },
    { name: 'Rupak Lipane', role: 'Final Year Student' },
  ];

  return (
    <div className="about-us-container">
      <h1>About Us</h1>
      <p>
        Hi there! We’re a group of four final-year students who teamed up to work on this project for our college final year.
        We wanted to build something meaningful, so we decided to create a crowdfunding platform using blockchain.
        Our aim is to make fundraising easier, more transparent, and secure for everyone.
      </p>
      <h2>Our Team</h2>
      <div className="team-members">
        {teamMembers.map((member, index) => (
          <div key={index} className="team-member">
            <h3>{member.name}</h3>
            <p>{member.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AboutUs;
