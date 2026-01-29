import React, { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";

export default function CourseImageUploadModal({ courseId, onSuccess, onClose }) {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        setError("❌ Please select an image file");
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("❌ Image size must be less than 10MB");
        return;
      }

      setFile(selectedFile);
      setError("");
      
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("❌ Please select a file");
      return;
    }

    const formData = new FormData();
   if (file) formData.append("image", file);

    try {
      setUploading(true);
      
      // ✅ Get token from localStorage or Redux
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("❌ No authentication token found. Please login again.");
        setUploading(false);
        return;
      }

      console.log("📤 Uploading image to:", `${import.meta.env.VITE_API_URL}/courses/${courseId}/upload-image`);
      console.log("🔑 Token:", token.substring(0, 20) + "...");

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/courses/${courseId}/upload-image`,
        formData,
        {
          headers: { 
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          },
          timeout: 60000, // 60 second timeout
        }
      );

      console.log("✅ Upload response:", response.data);

      if (response.data.success) {
        setError("");
        // Update the course in Redux store
        dispatch({
          type: 'course/updateCourseImage',
          payload: {
            courseId,
            imageUrl: response.data.imageUrl
          }
        });
        // Dispatch a custom event to trigger course list refresh
        window.dispatchEvent(new Event('coursesUpdated'));
        alert("Image uploaded successfully!");
        onSuccess(response.data);
        onClose();
      }
    } catch (err) {
      console.error("❌ Upload error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Upload failed";
      setError(`❌ ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "450px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#0f172a", marginBottom: "20px" }}>
          🖼️ Upload Course Image
        </h2>
        
        {preview && (
          <div style={{ marginBottom: "20px" }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                width: "100%",
                maxHeight: "200px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "2px solid #e5e7eb",
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
              color: "#4b5563",
            }}
          >
            Select Image (JPG, PNG, GIF, WebP - Max 10MB)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{
              width: "100%",
              padding: "10px",
              border: "2px dashed #9B1C36",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "#f9f9f9",
            }}
          />
        </div>

        {error && (
          <p
            style={{
              color: "#d32f2f",
              marginBottom: "15px",
              fontSize: "14px",
              padding: "10px",
              backgroundColor: "#ffebee",
              borderRadius: "6px",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#9B1C36",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: uploading || !file ? "not-allowed" : "pointer",
              fontWeight: "600",
              opacity: !file || uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "⏳ Uploading..." : "✅ Upload Image"}
          </button>

          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#f0f0f0",
              color: "#4b5563",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ❌ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
