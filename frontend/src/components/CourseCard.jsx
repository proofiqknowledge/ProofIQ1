import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import AssignBatchModal from "./AssignBatchModal";
import AssignTrainerModal from "./AssignTrainerModal";
import { deleteCourse } from "../services/courseService";
import { useSelector } from "react-redux";
import api from "../services/api";



export default function CourseCard({ course, isAdmin, openMenuId, setOpenMenuId }) {
  const navigate = useNavigate();
  const menuOpen = openMenuId === course._id;
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [trainers, setTrainers] = useState([]);

  const { role } = useSelector((state) => state.auth);
  const isAdminUser = ["admin", "master"].includes(role?.toLowerCase());
  const { user } = useSelector((state) => state.auth);


  useEffect(() => {
    async function loadTrainers() {
      try {
        const res = await api.get("/users");
        const onlyTrainers = res.data.filter((u) => u.role === "Trainer");
        setTrainers(onlyTrainers);
      } catch (err) {
        console.error("Error fetching trainers:", err);
      }
    }
    loadTrainers();
  }, []);

  const handleCardClick = () => {
    const id = course?._id || course?.id;
    if (!id) {
      console.warn('Course id missing, cannot navigate', course);
      return;
    }
    navigate(`/courses/${id}`);
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setOpenMenuId(menuOpen ? null : course._id);
  };

  const handleEditCourse = (e) => {
    e.stopPropagation();
    const id = course?._id || course?.id;
    if (!id) return;
    navigate(`/admin/edit-course/${id}`);
    if (typeof setOpenMenuId === 'function') setOpenMenuId(null);
  };

  const handleDeleteCourse = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${course.title}"?`)) return;

    try {
      await deleteCourse(course._id);
      alert("Course deleted successfully!");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to delete course");
    }
  };

  const handleAssignBatch = (e) => {
    e.stopPropagation();
    setShowBatchModal(true);
    if (typeof setOpenMenuId === 'function') setOpenMenuId(null);
  };

  const handleViewDetails = () => {
    navigate(`/courses/${course._id}`);
  };

  return (
    <>
      {/* ✅ Trainer Modal */}
      {showTrainerModal && (
        <AssignTrainerModal
          courseId={course._id}
          onClose={() => setShowTrainerModal(false)}
          onSuccess={() => alert("Trainer assigned successfully!")}
        />
      )}

      {/* ✅ Batch Modal */}
      {showBatchModal && (
        <AssignBatchModal
          courseId={course._id}
          onClose={() => setShowBatchModal(false)}
          onSuccess={() => alert("Batch assigned successfully!")}
        />
      )}

      {/* ✅ Course Card */}
      <div className="course-card" onClick={handleCardClick}>
        <div className="course-image">
          <img
            src={course?._id ? `${api.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/courses/${course._id}/image?t=${Date.now()}` : '/default-course.jpg'}
            alt={course.title}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/default-course.jpg';
            }}
            loading="lazy"
          />


        </div>

        {isAdminUser && (
          <div className="course-menu">
            <button className="menu-button" onClick={handleMenuToggle}>
              ⋮
            </button>

            <ul className={`menu-dropdown ${menuOpen ? "active" : ""}`}>

              <li onClick={handleDeleteCourse}>
                🗑️ Delete Course
              </li>

              <li
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTrainerModal(true);
                  setMenuOpen(false);
                }}
              >
                👨‍🏫 Assign Trainer
              </li>

              <li onClick={handleAssignBatch}>
                🎓 Assign Batch
              </li>

              <li onClick={handleViewDetails}>
                👁️ View Details
              </li>
            </ul>
          </div>
        )}

        <div className="course-body">
          <h2 className="course-title">{course.title}</h2>
          <p className="course-duration">
            Duration:{" "}
            {Array.isArray(course.weeks)
              ? course.weeks.length
              : (Array.isArray(course.modules) ? course.modules.length : "N/A")}{" "}
            weeks
          </p>

          {course.batch && (
            <div className="mt-4 flex items-center gap-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Batch: {course.batch}
              </span>
            </div>
          )}

          {user?.role === "Student" && (
            <div className="progress-section">
              <ProgressBar progress={course.completion || 0} />
              <span className="progress-text">
                {course.completion || 0}% Completed
              </span>
            </div>
          )}


          {/* ✅ Styles */}
          <style>{`

        .course-card {

          width: 100%;

          max-width: 340px;

          background: #ffffff;

          border: 1px solid #e5e7eb;

          border-radius: 12px;

          overflow: visible;

          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);

          transition: transform 0.2s ease, box-shadow 0.3s ease;

          display: flex;

          flex-direction: column;

          cursor: pointer;

          position: relative;

        }

        .course-card:hover {

          transform: translateY(-4px);

          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);

        }


.course-image {
          width: 100%;
          height: 180px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }
 
        .course-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;  
          transition: transform 0.4s ease;
        }
 
        .course-card:hover .course-image img {

          transform: scale(1.05);

        }



        .course-body {

          padding: 16px 18px;

          display: flex;

          flex-direction: column;

          gap: 8px;

        }

        .course-title {

          font-size: 1.1rem;

          font-weight: 700;

          color: #0f172a;

          margin: 0;

        }

        .course-duration {

          font-size: 0.95rem;

          color: #6b7280;

          margin: 0;

        }



        .progress-section {

          margin-top: 8px;

          display: flex;

          flex-direction: column;

          gap: 6px;

        }

        .progress-text {

          font-size: 0.9rem;

          color: #0b7285;

          font-weight: 600;

          align-self: flex-end;

        }

        /* Admin 3-dots menu */

        .course-menu {

          position: absolute;

          top: 12px;

          right: 12px;

          z-index: 20;

          overflow: visible !important;

        }

        .menu-button {

          background: rgba(255, 255, 255, 0.9);

          border: 1px solid rgba(229, 231, 235, 0.5);

          border-radius: 4px;

          font-size: 1.4rem;

          cursor: pointer;

          padding: 0 8px;

          color: #4B5563;

          transition: all 0.2s ease;

          overflow: visible !important;

        }

        .menu-button:hover {

          background: #ffffff;

          border-color: #e5e7eb;

        }

        .menu-dropdown {

          position: absolute;

          top: 100%;

          right: 0;

          background: #ffffff;

          border: 1px solid #e5e7eb;

          border-radius: 8px;

          box-shadow: 0 4px 12px rgba(0,0,0,0.1);

          list-style: none;

          padding: 8px 0;

          margin: 4px 0 0;

          min-width: 220px;

          z-index: 30;

          overflow: visible;

          opacity: 0;

          visibility: hidden;

          transform: translateY(-10px);

          transition: all 0.2s ease;

        }



        .menu-dropdown.active {

          opacity: 1;

          visibility: visible;

          transform: translateY(0);

        }

        .menu-dropdown li {

          padding: 8px 16px;

          cursor: pointer;

          transition: all 0.2s ease;

          display: flex;

          align-items: center;

          gap: 8px;

          color: #4B5563;

          position: relative;

        }

        .menu-dropdown li:hover {

          background: #f8fafc;

          color: #1e40af;

        }

        .menu-icon {

          font-size: 1.2rem;

          width: 24px;

          display: flex;

          align-items: center;

          justify-content: center;

        }

        .menu-text {

          font-size: 0.95rem;

          font-weight: 500;

        }



        .trainer-item {

          padding: 8px 16px;

          cursor: pointer;

          transition: background 0.2s ease;

          color: #0f172a;

        }

        .trainer-item:hover {

          background: #f1f5f9;

        }

        .trainer-item.empty {

          color: #9ca3af;

          cursor: default;

        }

      `}</style>
        </div>
      </div>
    </>
  );
}

CourseCard.propTypes = {
  course: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    modules: PropTypes.oneOfType([PropTypes.array, PropTypes.number]),
    enrolledCount: PropTypes.number,
    batch: PropTypes.string,
    completion: PropTypes.number,
    image: PropTypes.string,
    imageUrl: PropTypes.string,  // ✅ ADD THIS
    imageGridFSId: PropTypes.string,  // ✅ ADD THIS
  }).isRequired,
  isAdmin: PropTypes.bool,
};

