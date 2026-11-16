// Footer - VoiceED
// Site footer component

'use client';

import React from 'react';
import Link from 'next/link';

export function Footer({ className = '' }) {
  return (
    <footer className={'footer ' + className}>
      <div className="container">
        <div className="footer-content">
          <div className="footer-top-row">
            <div className="footer-section">
              <h3>VoiceED Description</h3>
              <p>
                VoiceED is a student‑driven platform that empowers learners to be heard,
                supported, and inspired. It promotes safety, wellness, and collaboration
                in schools and communities through features that let students report
                concerns, access mental health and motivation resources, share study
                materials, and find inspiration from peers. Its goal is simple: to make
                education inclusive and supportive by combining technology with
                compassion—creating a space where every voice matters and learning
                becomes a shared journey of growth.
              </p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/about">About</Link>
                </li>
                <li>
                  <Link href="/services">Services</Link>
                </li>
                <li>
                  <Link href="/contacts">Contact</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-section credentials-section">
            <h4>Founders & Campus Directors</h4>
            <div className="founders-grid">
              <div className="founder-card">
                <img
                  src="/jez.jpg"
                  alt="Junie Jebreel M. Botawan II"
                  className="founder-image"
                />
                <p className="founder-name">Junie Jebreel M. Botawan II</p>
                <p className="founder-title">
                  Software QA and Campus Director of Mindanao State University - Iligan
                  Institute of Technology Cohort
                </p>
              </div>
              <div className="founder-card">
                <img
                  src="/hann.jpg.jpg"
                  alt="Hannah Bella C. Atay"
                  className="founder-image"
                />
                <p className="founder-name">Hannah Bella C. Atay</p>
                <p className="founder-title">
                  Founder, Lead Developer and Millennium Fellowship Campus Director of
                  Mindanao State University - Iligan Institute of Technology Cohort
                </p>
              </div>
              <div className="founder-card">
                <img
                  src="/erwin.jpg"
                  alt="John Erwin F. Cadiz"
                  className="founder-image"
                />
                <p className="founder-name">John Erwin F. Cadiz</p>
                <p className="founder-title">Co-Founder and Millennium Fellow</p>
              </div>
            </div>
          </div>
          <div className="footer-section credentials-section">
            <h4>Millennium Fellows</h4>
            <div className="fellows-grid">
              <div className="fellow-card">
                <img
                  src="/hontiveros.png"
                  alt="Hannah A. Hontiveros"
                  className="fellow-image"
                />
                <p className="fellow-name">Hannah A. Hontiveros</p>
                <p className="fellow-title">Millennium Fellow</p>
              </div>
              <div className="fellow-card">
                <img
                  src="/jason.png"
                  alt="Jason James E. Azcona"
                  className="fellow-image"
                />
                <p className="fellow-name">Jason James E. Azcona</p>
                <p className="fellow-title">Millennium Fellow</p>
              </div>
              <div className="fellow-card">
                <img
                  src="/jiggen.jpg"
                  alt="Jiggen Kerr T. Aguilar"
                  className="fellow-image"
                />
                <p className="fellow-name">Jiggen Kerr T. Aguilar</p>
                <p className="fellow-title">Millennium Fellow</p>
              </div>
              <div className="fellow-card">
                <img
                  src="/joshua.jpeg"
                  alt="Joshua Louise R. Villanueva"
                  className="fellow-image"
                />
                <p className="fellow-name">Joshua Louise R. Villanueva</p>
                <p className="fellow-title">Millennium Fellow</p>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 VoiceED. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
