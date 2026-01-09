import React, { useState } from 'react';
import { FaDownload, FaCheckCircle, FaTimesCircle, FaFileExcel, FaCloudUploadAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bulkUploadUsers } from '../services/userService';
import * as XLSX from 'xlsx'; // ✅ ADD THIS IMPORT


export default function BulkUserUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);


  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls'].includes(ext)) {
        toast.error('Please upload only Excel files (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };


  // ✅ UPDATED FUNCTION - Generate proper Excel file instead of CSV
  const handleDownloadTemplate = () => {
    const sampleData = [
      { name: 'John Doe', email: 'john@example.com', employeeId: '1916' },
      { name: 'Jane Smith', email: 'jane@example.com', employeeId: 'T2051' },
      { name: 'Robert Brown', email: 'robert@example.com', employeeId: 'ABC123' }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_bulk_upload_template.xlsx');
  };


  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select an Excel file');
      return;
    }


    setUploading(true);
    try {
      const response = await bulkUploadUsers(file);
      setResult(response);
      toast.success(`Upload completed! ${response.successCount} users created, ${response.failedCount} failed.`);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };


  return (
    <>
      <div className="bulk-upload-container">
        {/* Step 1: Download Template */}
        <div className="upload-step">
          <div className="step-header">
            <div className="step-number">1</div>
            <div className="step-info">
              <h3>Download Template</h3>
              <p>Get the Excel template with the correct format</p>
            </div>
          </div>
          <button onClick={handleDownloadTemplate} className="template-btn">
            <FaDownload /> Download Template
          </button>
        </div>


        {/* Step 2: Upload File */}
        <div className="upload-step">
          <div className="step-header">
            <div className="step-number">2</div>
            <div className="step-info">
              <h3>Upload Excel File</h3>
              <p>Select your filled Excel file (.xlsx or .xls)</p>
            </div>
          </div>


          <div className="file-upload-area">
            <label htmlFor="file-input" className="file-upload-label">
              <FaCloudUploadAlt className="upload-icon" />
              <span className="upload-text">
                {file ? file.name : 'Click to choose file'}
              </span>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>


          {file && (
            <div className="file-selected">
              <FaFileExcel className="file-icon" />
              <span>{file.name}</span>
              <span className="file-size">
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          )}
        </div>


        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-submit-btn"
        >
          {uploading ? (
            <>
              <div className="spinner"></div>
              Uploading...
            </>
          ) : (
            <>
              <FaCloudUploadAlt /> Upload Users
            </>
          )}
        </button>


        {/* Results Section */}
        {result && (
          <div className="upload-results">
            <h3 className="results-title">Upload Results</h3>

            <div className="results-stats">
              <div className="stat-card total">
                <div className="stat-number">{result.total}</div>
                <div className="stat-label">Total Rows</div>
              </div>
              <div className="stat-card success">
                <div className="stat-number">{result.successCount}</div>
                <div className="stat-label">✓ Success</div>
              </div>
              <div className="stat-card failed">
                <div className="stat-number">{result.failedCount}</div>
                <div className="stat-label">✗ Failed</div>
              </div>
            </div>


            {result.results?.failed && result.results.failed.length > 0 && (
              <div className="failed-section">
                <h4 className="failed-title">
                  <FaTimesCircle /> Failed Rows ({result.results.failed.length})
                </h4>
                <div className="failed-list">
                  {result.results.failed.map((fail, idx) => (
                    <div key={idx} className="failed-item">
                      <span className="failed-row">Row {fail.row}</span>
                      <span className="failed-reason">{fail.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* STYLES */}
      <style>{`
        .bulk-upload-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #e6eef0;
        }


        .upload-step {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 20px;
        }


        .step-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }


        .step-number {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #00bfa6, #00a58e);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.2rem;
          color: #042826;
          flex-shrink: 0;
        }


        .step-info h3 {
          margin: 0 0 4px 0;
          font-size: 1.1rem;
          color: #666;
        }


        .step-info p {
          margin: 0;
          color: #b8c1c7;
          font-size: 0.9rem;
        }


        .template-btn {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
          border: none;
          border-radius: 8px;
          color: #fff !important;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 1rem;
          transition: all 0.3s;
        }


        .template-btn:hover {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }


        .file-upload-area {
          margin-top: 12px;
        }


        .file-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          border: 2px dashed rgba(0, 191, 166, 0.3);
          border-radius: 12px;
          background: rgba(0, 191, 166, 0.02);
          cursor: pointer;
          transition: all 0.3s;
        }


        .file-upload-label:hover {
          border-color: #00bfa6;
          background: rgba(0, 191, 166, 0.05);
        }


        .upload-icon {
          font-size: 3rem;
          color: #00bfa6;
          margin-bottom: 12px;
        }


        .upload-text {
          font-size: 1rem;
          color: #b8c1c7;
        }


        .file-selected {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(0, 191, 166, 0.08);
          border: 1px solid rgba(0, 191, 166, 0.2);
          border-radius: 8px;
          color: #00bfa6;
        }


        .file-icon {
          font-size: 1.5rem;
          color: #00bfa6;
        }


        .file-size {
          color: #b8c1c7;
          font-size: 0.85rem;
          margin-left: auto;
        }


        .upload-submit-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #00bfa6, #00a58e);
          border: none;
          border-radius: 10px;
          color: #042826;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s;
        }


        .upload-submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #00a58e, #008c7a);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 191, 166, 0.4);
        }


        .upload-submit-btn:disabled {
          background: rgba(255,255,255,0.1);
          color: #666;
          cursor: not-allowed;
        }


        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(0,0,0,0.1);
          border-left-color: #042826;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }


        @keyframes spin {
          to { transform: rotate(360deg); }
        }


        .upload-results {
          background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 20px;
          margin-top: 8px;
        }


        .results-title {
          margin: 0 0 16px 0;
          color: #fff;
          font-size: 1.2rem;
        }


        .results-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }


        .stat-card {
          padding: 16px;
          border-radius: 10px;
          text-align: center;
        }


        .stat-card.total {
          background: rgba(100, 116, 139, 0.1);
          border: 1px solid rgba(100, 116, 139, 0.2);
        }


        .stat-card.success {
          background: rgba(0, 255, 150, 0.05);
          border: 1px solid rgba(0, 255, 150, 0.2);
        }


        .stat-card.failed {
          background: rgba(255, 0, 0, 0.05);
          border: 1px solid rgba(255, 0, 0, 0.2);
        }


        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 4px;
        }


        .stat-card.total .stat-number { color: #94a3b8; }
        .stat-card.success .stat-number { color: #6fffd7; }
        .stat-card.failed .stat-number { color: #ff8b8b; }


        .stat-label {
          font-size: 0.85rem;
          color: #b8c1c7;
        }


        .failed-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }


        .failed-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ff8b8b;
          font-size: 1rem;
          margin: 0 0 12px 0;
        }


        .failed-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }


        .failed-item {
          padding: 12px;
          background: rgba(255, 0, 0, 0.05);
          border: 1px solid rgba(255, 0, 0, 0.15);
          border-radius: 6px;
          display: flex;
          gap: 12px;
        }


        .failed-row {
          color: #ff8b8b;
          font-weight: 600;
          min-width: 70px;
        }


        .failed-reason {
          color: #b8c1c7;
          font-size: 0.9rem;
        }


        /* Scrollbar */
        .failed-list::-webkit-scrollbar {
          width: 6px;
        }


        .failed-list::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 3px;
        }


        .failed-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }


        .failed-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }
      `}</style>
    </>
  );
}
