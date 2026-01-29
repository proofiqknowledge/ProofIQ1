import React, { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api from '../../services/api';
import './ImageCarousel.css';

const ImageCarousel = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) return null;

    // Helper to get image URL
    const getImageUrl = (img) => {
        if (typeof img === 'string') {
            return img.startsWith('http') ? img : `${api.defaults.baseURL?.replace('/api', '')}${img}`;
        } else if (img && img.filename) {
            return `${api.defaults.baseURL?.replace('/api', '')}/api/blogs/file/${img.filename}`;
        }
        return '';
    };

    const nextSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const prevSlide = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToSlide = (index, e) => {
        e.stopPropagation();
        setCurrentIndex(index);
    };

    // If only one image, just show it without controls
    if (images.length === 1) {
        return (
            <div className="carousel-container">
                <img
                    src={getImageUrl(images[0])}
                    alt="Content"
                    className="carousel-image"
                />
            </div>
        );
    }

    return (
        <div className="carousel-container" onClick={(e) => e.stopPropagation()}>
            <div
                className="carousel-image-wrapper"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {images.map((img, idx) => (
                    <img
                        key={idx}
                        src={getImageUrl(img)}
                        alt={`Slide ${idx + 1}`}
                        className="carousel-image"
                    />
                ))}
            </div>

            <button className="carousel-btn prev" onClick={prevSlide}>
                <FaChevronLeft />
            </button>

            <button className="carousel-btn next" onClick={nextSlide}>
                <FaChevronRight />
            </button>

            <div className="carousel-dots">
                {images.map((_, idx) => (
                    <div
                        key={idx}
                        className={`carousel-dot ${currentIndex === idx ? 'active' : ''}`}
                        onClick={(e) => goToSlide(idx, e)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ImageCarousel;
