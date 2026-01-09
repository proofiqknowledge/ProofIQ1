import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBookOpen, FaChartLine, FaCertificate, FaArrowRight } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import './Home.css';
import lmsImage from '../../assets/lms img.png';
import { COLORS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS, TRANSITIONS } from '../../constants/designSystem';

export default function Home() {
  const navigate = useNavigate();
  const { token, role } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      if (role === 'Admin') navigate('/admin');
      else if (role === 'Trainer') navigate('/trainer');
      else if (role === 'Student') navigate('/student');
      else navigate('/courses');
    }
  }, [token, role, navigate]);

  const handleProtectedRoute = (path) => {
    if (token) navigate(path);
    else navigate('/login');
  };

  const features = [
    {
      icon: <FaBookOpen />,
      title: 'Course Catalog',
      text: 'Explore expertly curated courses and start your learning journey today.',
    },
    {
      icon: <FaChartLine />,
      title: 'Track Progress',
      text: 'Visualize your weekly progress and stay motivated on your learning path.',
    },
    {
      icon: <FaCertificate />,
      title: 'Certifications',
      text: 'Earn digital certificates and share your achievements with the world.',
    },
  ];

  // ===== INLINE STYLES =====
  const homePageStyle = {
    fontFamily: "'Roboto', 'Lato', sans-serif",
    color: COLORS.textPrimary,
    background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 70%, #f5f5f5 100%)',
    minHeight: '100vh',
    padding: 0,
  };

  const containerStyle = {
    padding: `80px 60px`,
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 10,
  };

  const heroStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '80px',
    marginBottom: '140px',
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 20,
  };

  const heroContentStyle = {
    flex: '1 1 480px',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    animation: 'fadeInLeft 0.8s ease 0.2s both',
  };

  const heroTitleStyle = {
    fontSize: '2.8rem',
    fontWeight: 800,
    marginBottom: '24px',
    color: COLORS.primary,
    lineHeight: '1.25',
    letterSpacing: '-0.8px',
  };

  const heroSubtitleStyle = {
    fontSize: '1.05rem',
    color: COLORS.textSecondary,
    marginBottom: '40px',
    lineHeight: '1.75',
    fontWeight: 400,
    maxWidth: '480px',
  };

  const heroCtaStyle = {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  const btnPrimaryStyle = {
    padding: '14px 36px',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, #7A1429 100%)`,
    color: COLORS.white,
    border: 'none',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all 0.3s ease-in-out`,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1rem',
    boxShadow: '0 8px 24px rgba(155, 28, 54, 0.25)',
  };

  const btnSecondaryStyle = {
    padding: '14px 36px',
    backgroundColor: COLORS.white,
    color: COLORS.primary,
    border: `2.5px solid ${COLORS.primary}`,
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all 0.3s ease-in-out`,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1rem',
    boxShadow: '0 4px 12px rgba(155, 28, 54, 0.12)',
  };

  const heroMediaStyle = {
    flex: '1 1 480px',
    animation: 'fadeInRight 0.8s ease 0.2s both',
    position: 'relative',
    zIndex: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const heroImgStyle = {
    width: '100%',
    height: 'auto',
    maxWidth: '480px',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(155, 28, 54, 0.2)',
    display: 'block',
    transition: `all 0.3s ease`,
  };

  const featuresStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '40px',
    marginBottom: '140px',
    animation: 'fadeIn 0.8s ease 0.4s both',
  };

  const featureCardStyle = {
    backgroundColor: COLORS.white,
    padding: '50px 40px',
    borderRadius: '16px',
    textAlign: 'center',
    transition: `all 0.3s ease-in-out`,
    boxShadow: SHADOWS.sm,
    border: `2px solid ${COLORS.primary}`,
    position: 'relative',
    overflow: 'hidden',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const featureIconStyle = {
    fontSize: '3rem',
    color: COLORS.primary,
    marginBottom: '20px',
    display: 'inline-block',
    transition: `all 0.3s ease`,
  };

  const featureTitleStyle = {
    marginBottom: '16px',
    fontSize: '1.5rem',
    color: COLORS.textPrimary,
    fontWeight: 700,
    letterSpacing: '-0.3px',
  };

  const featureTextStyle = {
    marginBottom: 0,
    color: COLORS.textSecondary,
    fontSize: '0.95rem',
    lineHeight: '1.7',
    maxWidth: '100%',
  };

  const footerBannerStyle = {
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 50%, ${COLORS.primary} 100%)`,
    color: COLORS.white,
    textAlign: 'center',
    padding: '80px 60px',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(155, 28, 54, 0.25)',
    animation: 'fadeIn 0.8s ease 0.6s both',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 0,
  };

  const bannerTitleStyle = {
    marginBottom: '16px',
    fontSize: '2.2rem',
    fontWeight: 800,
    letterSpacing: '-0.5px',
    color: COLORS.white,
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    zIndex: 2,
  };

  const bannerSubtitleStyle = {
    marginBottom: '40px',
    fontSize: '1.1rem',
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.95)',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    zIndex: 2,
  };

  const btnBannerStyle = {
    padding: '13px 32px',
    backgroundColor: COLORS.white,
    color: COLORS.primary,
    border: 'none',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all 0.3s ease-in-out`,
    fontSize: '1rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    zIndex: 2,
  };

  return (
    <div style={homePageStyle}>
      {/* Main Container - NO OVERLAPPING SVG */}
      <div style={containerStyle}>
        {/* Hero Section */}
        <div style={heroStyle}>
          {/* Hero Content */}
          <div style={heroContentStyle}>
            <h1 style={heroTitleStyle}>
              Empower Your Learning Journey
            </h1>
            <p style={heroSubtitleStyle}>
              Learn, grow, and achieve excellence with our interactive courses
              and progress tracking system.
            </p>
            <div style={heroCtaStyle}>
              <button
                style={btnPrimaryStyle}
                onClick={() => handleProtectedRoute('/courses')}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-4px)';
                  e.target.style.boxShadow = '0 12px 32px rgba(155, 28, 54, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 24px rgba(155, 28, 54, 0.25)';
                }}
              >
                Start Learning <FaArrowRight />
              </button>
              <button
                style={btnSecondaryStyle}
                onClick={() => handleProtectedRoute('/courses')}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = COLORS.primary;
                  e.target.style.color = COLORS.white;
                  e.target.style.transform = 'translateY(-4px)';
                  e.target.style.boxShadow = '0 12px 28px rgba(155, 28, 54, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = COLORS.white;
                  e.target.style.color = COLORS.primary;
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(155, 28, 54, 0.12)';
                }}
              >
                Browse Courses
              </button>
            </div>
          </div>

          {/* Hero Image */}
          <div style={heroMediaStyle}>
            <img
              src={lmsImage}
              alt="Learning Platform"
              style={heroImgStyle}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-8px)';
                e.target.style.boxShadow = '0 30px 60px rgba(155, 28, 54, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 20px 50px rgba(155, 28, 54, 0.2)';
              }}
            />
          </div>
        </div>

        {/* Features Section */}
        <div style={featuresStyle}>
          {features.map((feature, idx) => (
            <div
              key={idx}
              style={featureCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-12px)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(155, 28, 54, 0.18)';
                e.currentTarget.style.borderColor = COLORS.primaryLight;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = SHADOWS.sm;
                e.currentTarget.style.borderColor = COLORS.primary;
              }}
            >
              <div
                style={featureIconStyle}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.15) rotate(5deg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1) rotate(0)';
                }}
              >
                {feature.icon}
              </div>
              <h3 style={featureTitleStyle}>{feature.title}</h3>
              <p style={featureTextStyle}>{feature.text}</p>
            </div>
          ))}
        </div>

        {/* Footer Banner */}
        <div
          style={footerBannerStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 30px 70px rgba(155, 28, 54, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 20px 50px rgba(155, 28, 54, 0.25)';
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '400px',
              height: '400px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              zIndex: 1,
            }}
          ></div>
          <div
            style={{
              position: 'absolute',
              bottom: '-20%',
              left: '5%',
              width: '300px',
              height: '300px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              zIndex: 1,
            }}
          ></div>

          <h2 style={bannerTitleStyle}>
            Ready to Transform Your Learning?
          </h2>
          <p style={bannerSubtitleStyle}>
            Join thousands of learners and unlock your potential today.
          </p>
          <button
            style={btnBannerStyle}
            onClick={() => {
              if (token) navigate('/courses');
              else navigate('/register');
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 10px 28px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
            }}
          >
            Get Started Now <FaArrowRight />
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
