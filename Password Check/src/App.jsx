import { useState, useMemo } from 'react';
import './App.css';

const CRITERIA = [
  {
    id: 'length',
    label: 'At least 8 characters long',
    test: (pw) => pw.length >= 8,
  },
  {
    id: 'longLength',
    label: '12+ characters (recommended)',
    test: (pw) => pw.length >= 12,
  },
  {
    id: 'uppercase',
    label: 'Contains an uppercase letter (A–Z)',
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: 'lowercase',
    label: 'Contains a lowercase letter (a–z)',
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: 'number',
    label: 'Contains a number (0–9)',
    test: (pw) => /\d/.test(pw),
  },
  {
    id: 'special',
    label: 'Contains a special character (!@#$%^&*)',
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

const STRENGTH_LEVELS = [
  { label: 'Very Weak', color: '#ef4444', width: '20%' },
  { label: 'Weak', color: '#f97316', width: '40%' },
  { label: 'Fair', color: '#eab308', width: '60%' },
  { label: 'Strong', color: '#22c55e', width: '80%' },
  { label: 'Very Strong', color: '#10b981', width: '100%' },
];

export default function App() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => {
    const results = CRITERIA.map((rule) => ({
      ...rule,
      passed: rule.test(password),
    }));

    const passedCount = results.filter((r) => r.passed).length;

    // Map 0-6 passed criteria to 0-4 strength index
    let levelIndex = 0;
    if (password.length === 0) {
      levelIndex = -1;
    } else if (passedCount <= 2) {
      levelIndex = 0;
    } else if (passedCount === 3) {
      levelIndex = 1;
    } else if (passedCount === 4) {
      levelIndex = 2;
    } else if (passedCount === 5) {
      levelIndex = 3;
    } else {
      levelIndex = 4;
    }

    // Estimate rough entropy bits
    let charsetSize = 0;
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[^A-Za-z0-9]/.test(password)) charsetSize += 32;

    const entropy =
      password.length > 0 && charsetSize > 0
        ? Math.round(password.length * Math.log2(charsetSize))
        : 0;

    return {
      results,
      level: levelIndex >= 0 ? STRENGTH_LEVELS[levelIndex] : null,
      entropy,
    };
  }, [password]);

  const generateStrongPassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = upper + lower + numbers + symbols;

    // Guarantee at least one character from each category
    const guaranteed = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    const remainingLength = 12; // Total 16 chars
    const randomChars = Array.from({ length: remainingLength }, () =>
      allChars[Math.floor(Math.random() * allChars.length)]
    );

    // Shuffle combined array
    const combined = [...guaranteed, ...randomChars]
      .sort(() => Math.random() - 0.5)
      .join('');

    setPassword(combined);
    setShowPassword(true);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="container">
      <div className="card">
        <header className="header">
          <h1>Password Strength Checker</h1>
          <p>Test your password security or generate a strong one locally.</p>
        </header>

        <div className="input-group">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setCopied(false);
            }}
            placeholder="Enter a password to evaluate..."
            aria-label="Password input"
            autoComplete="off"
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Strength Meter */}
        <div className="meter-section">
          <div className="meter-header">
            <span>
              Strength:{' '}
              <strong style={{ color: analysis.level?.color || '#94a3b8' }}>
                {analysis.level ? analysis.level.label : 'None'}
              </strong>
            </span>
            <span className="entropy-badge">~{analysis.entropy} bits entropy</span>
          </div>

          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: analysis.level ? analysis.level.width : '0%',
                backgroundColor: analysis.level?.color || 'transparent',
              }}
            />
          </div>
        </div>

        {/* Requirements Checklist */}
        <ul className="checklist">
          {analysis.results.map((item) => (
            <li key={item.id} className={item.passed ? 'passed' : 'failed'}>
              <span className="check-icon">{item.passed ? '✓' : '○'}</span>
              {item.label}
            </li>
          ))}
        </ul>

        {/* Action Buttons */}
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            onClick={generateStrongPassword}
          >
            Generate Strong Password
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={handleCopy}
            disabled={!password}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </main>
  );
}