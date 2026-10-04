import React, { useState } from 'react';
import { X, Lock, ShieldAlert, KeyRound } from 'lucide-react';
import { encryptText } from '../core/cryptoService';
import { useI18n } from '../i18n';

interface ProtectedBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  onSuccess: (directiveContent: string) => void;
}

export const ProtectedBlockModal: React.FC<ProtectedBlockModalProps> = ({
  isOpen,
  onClose,
  selectedText,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [label, setLabel] = useState('Confidential Content');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  if (!isOpen) return null;

  const handleProtect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t.protect.minChars);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.protect.pwdMismatch);
      return;
    }

    const textToEncrypt = selectedText.trim() || 'Protected content with AES-256-GCM encryption.';

    setIsEncrypting(true);
    try {
      const payload = await encryptText(textToEncrypt, password);
      const meta = JSON.stringify({
        label: label.trim() || t.protect.unlockCardTitle,
        salt: payload.salt,
        iv: payload.iv,
      });

      const directive = `--protect ${meta}\n${payload.ciphertext}\n--end\n`;
      onSuccess(directive);
      onClose();
      // Clear sensitive fields
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Encryption error. Please try again.');
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content protect-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Lock size={20} className="modal-icon-accent" />
            <h2>{t.protect.title}</h2>
          </div>
          <button className="close-btn" onClick={onClose} title={t.find.close}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleProtect}>
          <div className="modal-body">
            <div className="protect-warning-banner">
              <ShieldAlert size={20} className="warning-icon" />
              <div className="warning-text">
                {t.protect.desc}
              </div>
            </div>

            <div className="setting-row">
              <label>{t.protect.unlockCardTitle}</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Secret credentials, Personal notes..."
                className="setting-input"
                required
              />
            </div>

            <div className="setting-row">
              <label>{t.protect.pwdLabel} ({t.protect.minChars})</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="setting-input pl-icon"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="setting-row">
              <label>{t.protect.confirmLabel}</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="setting-input pl-icon"
                  required
                />
              </div>
            </div>

            {error && <div className="modal-error-banner">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>
              {t.protect.cancel}
            </button>
            <button type="submit" className="primary-btn-lg" disabled={isEncrypting}>
              {isEncrypting ? '...' : t.protect.encryptBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
