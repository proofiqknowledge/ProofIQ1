import React, { useEffect,useState } from "react";
import CourseCard from "../../components/CourseCard";
import { useCourseManagement } from "../../hooks/useCourseManagement";

export default function CourseList() {
  const { courses, fetchCourses } = useCourseManagement();
  const [openMenuId, setOpenMenuId] = useState(null);


  useEffect(() => {
    fetchCourses();
    const onCoursesUpdated = () => fetchCourses();
    window.addEventListener('coursesUpdated', onCoursesUpdated);
    return () => window.removeEventListener('coursesUpdated', onCoursesUpdated);
  }, [fetchCourses]);

  console.log("Courses:", courses); // Debug log

  return (
    <div className="courses-page">
      <h1 className="courses-title">Available Courses</h1>

      {/* Fallback rendering for debugging */}
      {courses && courses.length > 0 ? (
        <div className="courses-grid">
          {courses.map((course) => (
          <CourseCard key={course._id} course={course} openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId} />
        ))}

        </div>
      ) : (
        <p className="no-courses">No courses available at the moment.</p>
      )}

      {/* Inline professional styles */}
      <style>{`
        .courses-page {
          min-height: 100vh;
          background: #f7f9fb;
          padding: 40px 24px;
          font-family: "Inter", system-ui, sans-serif;
          color: #0f172a;
        }

        .courses-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 32px;
          text-align: center;
          color: #0b7285;
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          justify-items: center;
          align-items: start;
        }

        .no-courses {
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
          margin-top: 40px;
        }

        @media (max-width: 768px) {
          .courses-page {
            padding: 24px 16px;
          }
          .courses-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
