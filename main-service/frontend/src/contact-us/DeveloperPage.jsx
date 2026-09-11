import React from 'react'
import './ContactInfoPage.css'
import premierLogo from './assets/premier.png'

const DeveloperPage = () => {
    return (
        <div className="som-developer-portal">
            <main className="som-dev-content-area" style={{ paddingTop: '2rem' }}>
                <div className="contact-page-container animate-fade-in">
                    <div className="contact-card">
                        <div className="role-tag">SYSTEM DEVELOPER</div>
                        <div className="logo-container">
                            <img src={premierLogo} alt="PT Premier Engineering Indonesia" style={{ width: '240px', objectFit: 'contain' }} />
                        </div>
                        <h1 className="company-name">PT Premier Engineering Indonesia</h1>
                        <p className="company-desc">Providing world-class industrial engineering solutions and smart factory automation systems for the palm oil industry.</p>

                        <div className="info-grid">
                            <div className="info-item">
                                <label>Field of Expertise</label>
                                <p>Industrial Automation & SCADA</p>
                            </div>
                            <div className="info-item">
                                <label>Headquarters</label>
                                <p>Jakarta, Indonesia</p>
                            </div>
                            <div className="info-item">
                                <label>Support Email</label>
                                <p>support@premier-engineering.co.id</p>
                            </div>
                            <div className="info-item">
                                <label>Website</label>
                                <p>www.premier-engineering.co.id</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default DeveloperPage
