import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

export function ChunkedVideoUploader({ onUploadComplete, courseId, weekNumber, dayNumber }) {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedBytes, setUploadedBytes] = useState(0);

  // Prefer explicit env var, fallback to axios api baseURL, else empty string -> relative URLs
  const API_URL = import.meta.env.VITE_API_URL || api.defaults.baseURL || '';

  const calculateSpeed = (bytesUploaded, startTime) => {
    const elapsed = (Date.now() - startTime) / 1000;
    const speedMbps = (bytesUploaded / (1024 * 1024)) / elapsed;
    return speedMbps.toFixed(2);
  };

  const calculateTimeRemaining = (bytesRemaining, speedMbps) => {
    if (parseFloat(speedMbps) === 0) return '∞';
    const remaining = bytesRemaining / (1024 * 1024) / parseFloat(speedMbps);
    return Math.round(remaining);
  };

  const uploadChunk = async (chunk, chunkIndex, totalChunks, uploadId, startTime) => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    formData.append('uploadId', uploadId);
    formData.append('fileName', file.name);

  // POST chunk to backend. Use fetch since we're streaming multipart chunks.
  const url = `${API_URL.replace(/\/$/, '')}/courses/gfs/upload-chunk`;
  console.debug('[ChunkedVideoUploader] uploadChunk ->', url, 'chunkIndex=', chunkIndex);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Chunk ${chunkIndex} failed: ${response.status} ${text}`);
    }
    return await response.json();
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setUploadProgress(0);
      setUploadedBytes(0);
    } else {
      alert('Please select a valid video file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const startTime = Date.now();
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytesLocal = 0;

    try {
      // Upload chunks in parallel (5 at a time)
      for (let i = 0; i < totalChunks; i += 5) {
        const chunkPromises = [];

        for (let j = i; j < Math.min(i + 5, totalChunks); j++) {
          const start = j * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          chunkPromises.push(
            uploadChunk(chunk, j, totalChunks, uploadId, startTime)
              .then(() => {
                uploadedBytesLocal += chunk.size;
                setUploadedBytes(uploadedBytesLocal);
                
                const progressPercent = Math.round((uploadedBytesLocal / file.size) * 100);
                setUploadProgress(progressPercent);

                const speedMbps = calculateSpeed(uploadedBytesLocal, startTime);
                setSpeed(speedMbps);

                const bytesRemaining = file.size - uploadedBytesLocal;
                const timeRemain = calculateTimeRemaining(bytesRemaining, speedMbps);
                setTimeRemaining(timeRemain);
              })
          );
        }

        await Promise.all(chunkPromises);
      }

  const finalizeUrl = `${API_URL.replace(/\/$/, '')}/courses/gfs/finalize-upload`;
  console.debug('[ChunkedVideoUploader] finalize ->', finalizeUrl, 'uploadId=', uploadId);
      const finalizeResponse = await fetch(finalizeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          uploadId,
          courseId,
          weekNumber,
          dayNumber,
        }),
      });

      if (!finalizeResponse.ok) {
        const text = await finalizeResponse.text().catch(() => '');
        throw new Error(`Finalize failed: ${finalizeResponse.status} ${text}`);
      }

      const result = await finalizeResponse.json();
      onUploadComplete(result);
      setIsUploading(false);
      setFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed: ' + (error.message || 'Unknown error'));
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      border: '2px dashed #00a6d6',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>📤 Upload Video (Chunked)</h3>

      <input
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        disabled={isUploading}
        style={{ marginBottom: '10px' }}
      />

      {file && !isUploading && (
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          <p><strong>File:</strong> {file.name}</p>
          <p><strong>Size:</strong> {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      )}

      {isUploading && (
        <div style={{ marginTop: '15px' }}>
          <div style={{
            width: '100%',
            height: '30px',
            backgroundColor: '#e0e0e0',
            borderRadius: '5px',
            overflow: 'hidden',
            marginBottom: '10px'
          }}>
            <div style={{
              width: `${uploadProgress}%`,
              height: '100%',
              backgroundColor: '#00a6d6',
              transition: 'width 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px'
            }}>
              {uploadProgress}%
            </div>
          </div>
          <p style={{ fontSize: '12px', margin: '5px 0' }}>
            <strong>Speed:</strong> {speed} MB/s | 
            <strong> Time Left:</strong> {timeRemaining}s |
            <strong> Uploaded:</strong> {(uploadedBytes / (1024 * 1024)).toFixed(2)} MB / {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        style={{
          marginTop: '10px',
          padding: '10px 20px',
          backgroundColor: isUploading || !file ? '#ccc' : '#00a6d6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: isUploading || !file ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {isUploading ? 'Uploading...' : 'Upload Video'}
      </button>
    </div>
  );
}
