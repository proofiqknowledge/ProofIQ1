import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaDownload, FaUpload } from 'react-icons/fa';
import api from '../services/api';
import * as XLSX from 'xlsx';

export default function BatchForm({ onSuccess, onCancel }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const [courses, setCourses] = useState([]);

  // Load trainers and courses when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, trainersRes] = await Promise.all([
          api.get('/courses'),
          api.get('/users?role=Trainer') // Adjust endpoint as needed
        ]);
        setCourses(coursesRes.data);
        setTrainers(trainersRes.data);
      } catch (err) {
        toast.error('Error loading data');
      }
    };
    fetchData();
  }, []);

  // Handle template download
  const handleDownloadTemplate = () => {
    const sampleData = [
      { email: 'student1@example.com' },
      { email: 'student2@example.com' },
      { email: 'student3@example.com' }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'batch_students_template.xlsx');
    toast.success('Template downloaded successfully!');
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls'].includes(ext)) {
        toast.error('Please upload only Excel files (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please upload an Excel file with student emails');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('trainerId', trainerId);
      formData.append('courseId', courseId);
      formData.append('file', file);

      const response = await api.post('/batches/create-with-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(
        `Batch created! ${response.data.stats.added} students added, ${response.data.stats.skipped} skipped`
      );
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Create New Batch</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Batch Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Batch Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. Batch 2024-A"
            required
          />
        </div>

        {/* Trainer */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trainer
          </label>
          <select
            value={trainerId}
            onChange={(e) => setTrainerId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            required
          >
            <option value="">Select Trainer</option>
            {trainers.map(trainer => (
              <option key={trainer._id} value={trainer._id}>
                {trainer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Course */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Course
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            required
          >
            <option value="">Select Course</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              min={startDate}
              required
            />
          </div>
        </div>

        {/* Template Download Button */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                 Step 1: Download Template
              </h4>
              <p className="text-xs text-gray-600 mb-2">
                Download the Excel template, fill in student emails, then upload below
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <FaDownload />
                <span>Download Template</span>
              </button>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-1">
            📤 Step 2: Upload Filled Excel
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Upload the filled Excel file with student emails (Required)
          </p>
          
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="flex flex-col items-center space-y-2">
              <FaUpload className="text-2xl text-gray-400" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Click to choose Excel file'}
              </span>
              {file && (
                <span className="text-xs text-green-600 font-medium">
                  ✓ File selected ({(file.size / 1024).toFixed(2)} KB)
                </span>
              )}
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            disabled={loading || !file}
          >
            {loading ? 'Creating Batch...' : 'Create Batch'}
          </button>
        </div>
      </form>
    </div>
  );
}
