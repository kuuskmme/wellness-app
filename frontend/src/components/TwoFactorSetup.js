
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const TwoFactorSetup = () => {
  const { user, setup2FA, verify2FA, disable2FA } = useAuth();
  
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDisable, setShowDisable] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);
    setError('');
    
    const result = await setup2FA();
    
    setIsLoading(false);
    
    if (result.success) {
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setShowSetup(true);
    } else {
      setError(result.message);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await verify2FA(verificationCode);
    
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setShowSetup(false);
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      
      // Refresh the page to update the UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setError(result.message);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await disable2FA(password);
    
    setIsLoading(false);

    if (result.success) {
      setSuccess(result.message);
      setShowDisable(false);
      setPassword('');
      
      // Refresh the page to update the UI
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setError(result.message);
    }
  };

  if (user?.twoFactorEnabled) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Two-Factor Authentication</h3>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
            Enabled
          </span>
        </div>
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!showDisable ? (
          <>
            <p className="text-gray-600 mb-4">
              Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when logging in.
            </p>
            <button
              onClick={() => setShowDisable(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Disable 2FA
            </button>
          </>
        ) : (
          <form onSubmit={handleDisable}>
            <p className="text-red-600 mb-4">
              ⚠️ Disabling 2FA will make your account less secure. Please enter your password to confirm.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isLoading ? 'Disabling...' : 'Confirm Disable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisable(false);
                  setPassword('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Two-Factor Authentication</h3>
        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
          Disabled
        </span>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!showSetup ? (
        <>
          <p className="text-gray-600 mb-4">
            Add an extra layer of security to your account by enabling two-factor authentication. You'll need an authenticator app like Google Authenticator or Authy.
          </p>
          <button
            onClick={handleSetup}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        </>
      ) : (
        <div>
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Step 1: Scan QR Code</h4>
            <p className="text-sm text-gray-600 mb-3">
              Scan this QR code with your authenticator app:
            </p>
            {qrCode && (
              <div className="flex justify-center mb-4">
                <img src={qrCode} alt="2FA QR Code" className="border-2 border-gray-300 rounded" />
              </div>
            )}
            <p className="text-sm text-gray-600">
              Can't scan? Enter this code manually:
            </p>
            <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-sm break-all">
              {secret}
            </div>
          </div>

          <form onSubmit={handleVerify}>
            <div className="mb-4">
              <h4 className="font-semibold mb-3">Step 2: Verify Setup</h4>
              <p className="text-sm text-gray-600 mb-3">
                Enter the 6-digit code from your authenticator app:
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength="6"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Verifying...' : 'Verify and Enable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSetup(false);
                  setQrCode('');
                  setSecret('');
                  setVerificationCode('');
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;