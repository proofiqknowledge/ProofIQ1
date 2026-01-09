import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaDownload, FaTrophy } from 'react-icons/fa';
import api from '../../services/api';
import { CertificateCard } from '../../components/CertificateCard';

export default function CertificatePage() {
	const [certificates, setCertificates] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const { user } = useSelector((state) => state.auth);

	useEffect(() => {
		const fetchCertificates = async () => {
			try {
				const response = await api.get('/certificates/my');
				setCertificates(response.data);
			} catch (err) {
				setError('Failed to load certificates');
			} finally {
				setLoading(false);
			}
		};

		fetchCertificates();
	}, []);

	const handleDownload = async (certificateId) => {
		try {
			const response = await api.get(`/certificates/${certificateId}/download`, {
				responseType: 'blob'
			});
      
			// Create a blob URL and trigger download
			const blob = new Blob([response.data], { type: 'application/pdf' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `certificate-${certificateId}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			console.error('Failed to download certificate:', err);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-red-500 text-center">
					<div className="text-xl font-bold mb-2">Error</div>
					<div>{error}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-800">My Certificates</h1>
				<p className="text-gray-600 mt-2">
					View and download your course completion certificates
				</p>
			</div>

			{certificates.length === 0 ? (
				<div className="bg-white rounded-lg shadow-md p-8 text-center">
					<FaTrophy className="text-4xl text-yellow-500 mx-auto mb-4" />
					<h3 className="text-xl font-semibold text-gray-800 mb-2">No Certificates Yet</h3>
					<p className="text-gray-600">
						Complete courses to earn your certificates and showcase your achievements!
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{certificates.map((cert) => (
						<div key={cert._id} className="bg-white rounded-lg shadow-md overflow-hidden">
							<CertificateCard
								title={cert.course.title}
								issueDate={cert.issuedAt}
								userName={user.name}
							/>
							<div className="p-4 border-t bg-gray-50">
								<button
									onClick={() => handleDownload(cert._id)}
									className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									<FaDownload className="mr-2" />
									Download Certificate
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
