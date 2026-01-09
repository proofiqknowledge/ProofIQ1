import React from 'react';
import { useNavigate } from 'react-router-dom';
import MCQExamUploader from '../../components/MCQExamUploader';

const BulkExamUploadPage = () => {
  const navigate = useNavigate();

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '24px 0',
  };

  const contentStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px',
  };

  const headerStyle = {
    marginBottom: '32px',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px',
  };

  const descriptionStyle = {
    fontSize: '16px',
    color: '#475569',
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Bulk Assessment Import</h1>
          <p style={descriptionStyle}>
            Import multiple MCQ Assessment from Word or Text documents in bulk
          </p>
        </div>

        <MCQExamUploader />
      </div>
    </div>
  );
};

export default BulkExamUploadPage;
