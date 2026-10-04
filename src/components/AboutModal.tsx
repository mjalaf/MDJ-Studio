import React, { useState } from 'react';
import { X, Info, User, Mail, Check, Copy, ExternalLink, Cpu } from 'lucide-react';
import { isElectron } from '../services/fileService';
import { useI18n } from '../i18n';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  if (!isOpen) return null;

  const appName = 'MDJ Studio';
  const version = '1.0.0';
  const author = 'Martin Jalaf';
  const email = 'martinj@microsoft.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content about-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Info size={20} className="modal-icon-accent" />
            <h2>{t.about.title}</h2>
          </div>
          <button className="close-btn" onClick={onClose} title={t.find.close}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body about-modal-body">
          <div className="about-hero">
            <img src={`${import.meta.env.BASE_URL}icon.png`} className="about-brand-icon-hero" alt="MDJ Studio" />
            <h3 className="about-app-title">{appName}</h3>
            <span className="about-version-badge">{t.about.version} {version}</span>
            <p className="about-description">
              {t.about.lead}
            </p>
          </div>

          <div className="about-details-card">
            <div className="about-row">
              <span className="about-label">
                <User size={15} /> {t.about.author}
              </span>
              <span className="about-value">{author}</span>
            </div>

            <div className="about-row">
              <span className="about-label">
                <Mail size={15} /> {t.about.contact}
              </span>
              <div className="about-contact-group">
                <a href={`mailto:${email}`} className="about-email-link" title={email}>
                  {email}
                  <ExternalLink size={13} />
                </a>
                <button
                  className="about-copy-btn"
                  onClick={handleCopyEmail}
                  title={t.about.copyEmail}
                >
                  {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
                  <span>{copied ? t.about.copied : t.about.copyEmail}</span>
                </button>
              </div>
            </div>

            <div className="about-row">
              <span className="about-label">
                <Cpu size={15} /> Platform
              </span>
              <span className="about-value">
                {isElectron() ? 'Electron Native Desktop' : 'Modern Web Application'}
              </span>
            </div>
          </div>

          <div className="about-specs-info">
            <h4>{t.about.specsBreakdown}</h4>
            <ul>
              <li><strong>Spec 001:</strong> Core Editor, Markdown GFM, Mermaid 11, PDF & HTML Export.</li>
              <li><strong>Spec 002:</strong> 32-Level Folders, MDJ Directives, Collapsible blocks, AES-256-GCM Encryption.</li>
              <li><strong>Spec 003:</strong> Theme Engines, Configurable Library Root, Display Tree Modes, About Info.</li>
              <li><strong>Spec 004:</strong> 7 Color Palette & Inline/Block Semantic Highlights.</li>
              <li><strong>Spec 005:</strong> Native Electron Menubar, Contextual Ribbon Toolbar, Responsive Collapsible Panes.</li>
              <li><strong>Spec 006:</strong> Front Matter YAML visibility, Document History Undo/Redo, Lucide Iconography.</li>
              <li><strong>Spec 007:</strong> Find & Replace engine across Document & Library with Match Case & Whole Word.</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-btn-lg" onClick={onClose}>
            {t.find.close}
          </button>
        </div>
      </div>
    </div>
  );
};
