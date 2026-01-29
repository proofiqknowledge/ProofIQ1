import React from 'react';
import PropTypes from 'prop-types';
import { FaCertificate } from 'react-icons/fa';

export function CertificateCard({ title, issueDate, userName }) {
	return (
		<div className="p-6">
			<div className="flex items-start justify-between mb-4">
				<div>
					<h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
					<p className="text-gray-600 text-sm">
						Issued to: {userName}
					</p>
				</div>
				<FaCertificate className="text-2xl text-blue-500" />
			</div>
			<div className="text-sm text-gray-500">
				Issued on: {new Date(issueDate).toLocaleDateString()}
			</div>
		</div>
	);
}

CertificateCard.propTypes = {
	title: PropTypes.string.isRequired,
	issueDate: PropTypes.string.isRequired,
	userName: PropTypes.string.isRequired
};
