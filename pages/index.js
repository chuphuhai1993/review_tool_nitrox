import { useState, useRef } from 'react';

// Component cho popup loading
const LoadingModal = ({ onCancel }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000
  }}>
    <div style={{
      backgroundColor: 'white', padding: '30px 40px', borderRadius: '10px',
      textAlign: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
    }}>
      <p style={{ fontSize: '16px', marginBottom: '25px', lineHeight: '1.5' }}>
        Em đang lấy feedbank, anh zai chờ em chút nhé, sắp xong rồi <span className="spinner"></span>
      </p>
      <button
        onClick={onCancel}
        style={{ 
          padding: '10px 20px', fontSize: '16px', cursor: 'pointer', 
          border: '1px solid #ccc', borderRadius: '5px', background: '#f0f0f0'
        }}
      >
        Huỷ, chờ lâu quá
      </button>
    </div>
    <style jsx>{`
      .spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(0,0,0,.1);
        border-radius: 50%;
        border-top-color: #333;
        animation: spin 1s ease-in-out infinite;
        margin-left: 10px;
        vertical-align: middle;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Component cho nút chọn platform với icon
const PlatformButton = ({ value, label, icon, selectedValue, onClick, disabled }) => {
  const isSelected = value === selectedValue;
  const style = {
    flex: 1,
    padding: '10px 15px',
    fontSize: '16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: isSelected ? '1.5px solid black' : '1.5px solid transparent',
    borderRadius: '0',
    background: isSelected ? 'transparent' : '#f0f0f0',
    color: '#333',
    opacity: disabled && !isSelected ? 0.7 : 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontWeight: '500',
    transition: 'background 0.2s, border-color 0.2s'
  };

  return (
    <button onClick={() => onClick(value)} style={style} disabled={disabled}>
      <img src={icon} alt={label} style={{ height: '24px', width: 'auto' }} />
      <span>{label}</span>
    </button>
  );
};

// Component cho ô nhập số lượng tùy chỉnh
const CustomNumberInput = ({ value, onChange, disabled }) => {
  const step = 10;

  const handleDecrement = () => {
    const newValue = Math.max(step, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    onChange(value + step);
  };

  const buttonStyle = {
    width: '44px',
    height: '44px',
    fontSize: '16px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    background: '#f0f0f0',
    borderRadius: '0',
    lineHeight: '40px',
    textAlign: 'center'
  };

  const inputStyle = {
    width: '100%',
    textAlign: 'center',
    fontSize: '16px',
    height: '44px',
    padding: '8px',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    margin: '0 10px',
    borderRadius: '0',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        onClick={handleDecrement}
        disabled={disabled || value <= step}
        style={{...buttonStyle, cursor: (disabled || value <= step) ? 'not-allowed' : 'pointer', opacity: (disabled || value <= step) ? 0.5 : 1}}
      >
        -
      </button>
      <input
        type="number"
        id="limit"
        className="no-spinner"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        style={inputStyle}
        disabled={disabled}
      />
      <button 
        onClick={handleIncrement} 
        disabled={disabled} 
        style={{...buttonStyle, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1}}
      >
        +
      </button>
      <style jsx>{`
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

export default function HomePage() {
  const [appIds, setAppIds] = useState('');
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('android');
  const abortControllerRef = useRef(null);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleScrape = async () => {
    if (!appIds.trim()) {
      alert('Vui lòng nhập App ID hoặc Package name.');
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    const url = `/api/scrape-${selectedPlatform}?appIds=${encodeURIComponent(appIds)}&limit=${limit}`;

    try {
      const response = await fetch(url, { signal: abortControllerRef.current.signal });
      if (!response.ok) {
        const errorData = await response.json();
        alert(`Lỗi rồi anh zai: ${errorData.error || 'Có gì đó không đúng'}`);
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'reviews.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted by user.');
        alert('Đã hủy theo yêu cầu của anh zai.');
      } else {
        console.error('Fetch error:', error);
        alert('Lỗi rồi, anh zai xem lại console nhé.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };
  
  const placeholderText = selectedPlatform === 'ios'
    ? 'Anh zai nhập AppID, cách nhau bằng dấu phẩy nhé'
    : 'Anh zai nhập Package name, cách nhau bằng dấu phẩy ạ';

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      {loading && <LoadingModal onCancel={handleCancel} />}
      <h1>App Reviews Scraper</h1>

      {/* 1. Platform Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Chọn nền tảng
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <PlatformButton 
            value="android"
            label="Google Play"
            icon="/assets/googleplay.png"
            selectedValue={selectedPlatform} 
            onClick={setSelectedPlatform} 
            disabled={loading} 
          />
          <PlatformButton 
            value="ios"
            label="App Store"
            icon="/assets/appstore.png"
            selectedValue={selectedPlatform} 
            onClick={setSelectedPlatform} 
            disabled={loading} 
          />
        </div>
      </div>

      {/* 2. App IDs Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Chọn ứng dụng
        </label>
        <textarea
          id="appIds"
          value={appIds}
          onChange={(e) => setAppIds(e.target.value)}
          placeholder={placeholderText}
          rows={4}
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          disabled={loading}
        />
      </div>

      {/* 3. Limit Input */}
      <div style={{ marginBottom: '25px' }}>
        <label htmlFor="limit" style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Số lượng feedback / Quốc gia
        </label>
        <CustomNumberInput 
          value={limit} 
          onChange={setLimit} 
          disabled={loading} 
        />
      </div>

      {/* 4. Scrape Button */}
      <div>
        <button
          onClick={handleScrape}
          disabled={loading}
          style={{ 
            padding: '12px 25px', 
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer', 
            width: '100%',
            background: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '0'
          }}
        >
          {loading ? 'Đang lấy feedback...' : 'Lấy feedback'}
        </button>
      </div>
    </div>
  );
}
