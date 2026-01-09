import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FaDownload } from 'react-icons/fa';
import mammoth from 'mammoth';
import api from '../services/api';

export function DocumentViewer({ url, type, filename = 'document' }) {
	const [isLoading, setIsLoading] = useState(true);

	// For PDF - show iframe preview
	if (type === 'pdf') {
		return (
			<div style={{
				width: '100%',
				background: '#fff',
				borderRadius: 10,
				overflow: 'hidden',
				border: '1px solid #e5e7eb',
				boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
			}}>
				{isLoading && (
					<div style={{
						height: '600px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: '#f5f5f5',
						color: '#666',
						fontSize: '1rem'
					}}>
						📄 Loading PDF...
					</div>
				)}
				<iframe
					src={url}
					style={{
						width: '100%',
						height: '600px',
						border: 'none',
						display: isLoading ? 'none' : 'block'
					}}
					title="PDF Document Viewer"
					onLoad={() => setIsLoading(false)}
				/>
			</div>
		);
	}

	// For TXT - show inline text preview
	if (type === 'txt') {
		return (
			<div style={{
				width: '100%',
				background: '#fff',
				borderRadius: 10,
				border: '1px solid #e5e7eb',
				overflow: 'hidden',
				boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
			}}>
				<iframe
					src={url}
					style={{
						width: '100%',
						height: '600px',
						border: 'none'
					}}
					title="Text Document Viewer"
					onLoad={() => setIsLoading(false)}
				/>
			</div>
		);
	}

	// For DOCX/DOC - Download button with preview info
	if (type === 'docx' || type === 'doc') {
		const [isPreviewing, setIsPreviewing] = useState(false);
		const [previewHtml, setPreviewHtml] = useState('');
		const [previewLoading, setPreviewLoading] = useState(false);

		const handleDownload = async () => {
			try {
				const response = await fetch(url);
				const blob = await response.blob();
				const downloadUrl = window.URL.createObjectURL(blob);
				const link = document.createElement('a');
				link.href = downloadUrl;
				link.download = filename || `document_${Date.now()}.docx`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				window.URL.revokeObjectURL(downloadUrl);
			} catch (error) {
				console.error('Download failed:', error);
				alert('Failed to download document');
			}
		};

		const handlePreview = async () => {
			try {
				setPreviewLoading(true);
				// First try server-side conversion endpoint (reliable for localhost)
				const apiBase = api.defaults.baseURL || import.meta.env.VITE_API_URL || '';
				try {
					const serverResp = await api.get(`/debug/convert-docx/${filename}`, { responseType: 'text' });
					const html = serverResp.data;
					setPreviewHtml(html);
					setIsPreviewing(true);
					setPreviewLoading(false);
					return;
				} catch (serverErr) {
					console.warn('[DocumentViewer] server-side convert failed, falling back to client conversion', serverErr?.response?.status || serverErr.message);
				}

				// Fallback: Try fetching the raw file and converting client-side
				console.log('[DocumentViewer] attempting client-side preview fetch for', url);
				let res = await fetch(url);
				if (!res.ok) {
					console.warn('[DocumentViewer] primary URL failed', res.status, url);
					const backendRoot = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
					const fallbackUploads = `${backendRoot}/uploads/documents/${filename}`;
					console.log('[DocumentViewer] trying fallback uploads path', fallbackUploads);
					res = await fetch(fallbackUploads);
					if (!res.ok) {
						console.warn('[DocumentViewer] fallback uploads failed', res.status, fallbackUploads);
						const debugUrl = `${apiBase}/api/debug/view-document/${filename}`;
						console.log('[DocumentViewer] trying debug endpoint', debugUrl);
						res = await fetch(debugUrl);
						if (!res.ok) {
							console.error('[DocumentViewer] all preview fetch attempts failed', res.status);
							throw new Error('All preview fetch attempts failed');
						}
					}
				}
				const arrayBuffer = await res.arrayBuffer();
				const result = await mammoth.convertToHtml({ arrayBuffer });
				// remove scripts to avoid injection
				const safeHtml = result.value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
				setPreviewHtml(safeHtml);
				setIsPreviewing(true);
			} catch (err) {
				console.error('Preview failed:', err);
				// Provide a more descriptive message when the fetched file is not a valid DOCX
				if (err && /central directory/i.test(err.message || '')) {
					alert('Preview failed: the file on the server does not look like a valid DOCX (possibly corrupted). Please ask the uploader to re-upload or download to inspect.');
				} else {
					alert('Failed to preview document. You can download it instead.');
				}
			} finally {
				setPreviewLoading(false);
			}
		};

		return (
			<>
				<div style={{
					width: '100%',
					background: '#fff',
					borderRadius: 10,
					border: '1px solid #e5e7eb',
					overflow: 'hidden',
					boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
					padding: '24px',
					textAlign: 'center'
				}}>
					<div style={{ marginBottom: 18, fontSize: '2.2rem' }}>📄</div>
					<div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#333', marginBottom: 8 }}>Word Document</div>
					<p style={{ color: '#666', fontSize: '0.92rem', marginBottom: 20, lineHeight: '1.6', maxWidth: '640px', margin: '0 auto 20px' }}>
						Click "Preview" for an immersive, full-screen view or download to open in Word.
					</p>
					<div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
						<button onClick={handlePreview} disabled={previewLoading} style={{ padding: '12px 20px', background: '#0b74de', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
							{previewLoading ? 'Previewing...' : 'Preview Document'}
						</button>
						<button onClick={handleDownload} style={{ padding: '12px 20px', background: '#0066cc', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
							<FaDownload />&nbsp; Download
						</button>
					</div>
				</div>
				{isPreviewing && (
					<div
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: 'rgba(0,0,0,0.65)',
							zIndex: 1200,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '40px'
						}}
						onClick={() => { setIsPreviewing(false); setPreviewHtml(''); }}
					>
						<div
							style={{
								background: '#fff',
								borderRadius: 16,
								width: 'min(1200px, 95vw)',
								height: '85vh',
								boxShadow: '0 25px 65px rgba(0,0,0,0.35)',
								display: 'flex',
								flexDirection: 'column',
								border: '1px solid #e5e7eb',
								overflow: 'hidden'
							}}
							onClick={(e) => e.stopPropagation()}
						>
							<div style={{
								padding: '16px 24px',
								borderBottom: '1px solid #e5e7eb',
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								background: '#f8fafc'
							}}>
								<div style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>
									Document Preview · {filename}
								</div>
								<button
									onClick={() => { setIsPreviewing(false); setPreviewHtml(''); }}
									style={{
										background: '#e11d48',
										color: '#fff',
										border: 'none',
										padding: '8px 16px',
										borderRadius: 8,
										fontWeight: 600,
										cursor: 'pointer'
									}}
								>
									Close Preview
								</button>
							</div>
							<div style={{
								flex: 1,
								padding: '24px',
								overflow: 'auto',
								background: '#fff'
							}}>
								<div
									style={{
										minHeight: '100%',
										color: '#111',
										fontSize: '1rem',
										lineHeight: 1.6
									}}
									dangerouslySetInnerHTML={{ __html: previewHtml }}
								/>
							</div>
						</div>
					</div>
				)}
			</>
		);
	}

	// For PPTX/PPT - Download button with preview info
	if (type === 'pptx' || type === 'ppt') {
		return (
			<div style={{
				width: '100%',
				background: '#fff',
				borderRadius: 10,
				border: '1px solid #e5e7eb',
				overflow: 'hidden',
				boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
				padding: '40px 30px',
				textAlign: 'center',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '400px'
			}}>
				<div style={{ marginBottom: 24, fontSize: '3rem' }}>
					📊
				</div>
				<div style={{
					fontSize: '1.1rem',
					fontWeight: 600,
					color: '#333',
					marginBottom: 12
				}}>
					PowerPoint Presentation
				</div>
				<p style={{
					color: '#666',
					fontSize: '0.9rem',
					marginBottom: 24,
					lineHeight: '1.6',
					maxWidth: '380px'
				}}>
					Click the button below to download this presentation. You can then open it in Microsoft PowerPoint or your default presentation viewer to review it.
				</p>
				<button
					onClick={async () => {
						try {
							const response = await fetch(url);
							const blob = await response.blob();
							const downloadUrl = window.URL.createObjectURL(blob);
							const link = document.createElement('a');
							link.href = downloadUrl;
							link.download = `presentation_${Date.now()}.pptx`;
							document.body.appendChild(link);
							link.click();
							document.body.removeChild(link);
							window.URL.revokeObjectURL(downloadUrl);
						} catch (error) {
							console.error('Download failed:', error);
							alert('Failed to download presentation');
						}
					}}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 10,
						padding: '14px 28px',
						background: '#d4580a',
						color: '#fff',
						borderRadius: 8,
						textDecoration: 'none',
						fontSize: '1rem',
						fontWeight: 600,
						transition: 'all 0.3s',
						border: 'none',
						cursor: 'pointer',
						boxShadow: '0 2px 8px rgba(212, 88, 10, 0.3)',
						marginBottom: 20
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#a84408';
						e.currentTarget.style.transform = 'translateY(-2px)';
						e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 88, 10, 0.4)';
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#d4580a';
						e.currentTarget.style.transform = 'translateY(0)';
						e.currentTarget.style.boxShadow = '0 2px 8px rgba(212, 88, 10, 0.3)';
					}}
				>
					<FaDownload /> Download PowerPoint
				</button>
			</div>
		);
	}

	// Fallback for unknown types
	return (
		<div style={{
			width: '100%',
			background: '#fff',
			borderRadius: 10,
			border: '1px solid #e5e7eb',
			padding: '40px 30px',
			textAlign: 'center',
			boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			minHeight: '300px'
		}}>
			<div style={{ marginBottom: 24, fontSize: '3rem' }}>
				📁
			</div>
			<div style={{
				fontSize: '1rem',
				fontWeight: 600,
				color: '#333',
				marginBottom: 8
			}}>
				Document File
			</div>
			<p style={{
				color: '#666',
				fontSize: '0.95rem',
				marginBottom: 24,
				lineHeight: '1.5'
			}}>
				Click the button below to download and view this document
			</p>
			<a
				href={url}
				download={filename}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 10,
					padding: '12px 24px',
					background: '#666',
					color: '#fff',
					borderRadius: 8,
					textDecoration: 'none',
					fontSize: '0.95rem',
					fontWeight: 600,
					transition: 'all 0.2s',
					border: 'none',
					cursor: 'pointer',
					boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
				}}
				onMouseEnter={(e) => {
					e.target.style.background = '#555';
					e.target.style.transform = 'translateY(-2px)';
				}}
				onMouseLeave={(e) => {
					e.target.style.background = '#666';
					e.target.style.transform = 'translateY(0)';
				}}
			>
				<FaDownload /> Download
			</a>
		</div>
	);
}

DocumentViewer.propTypes = {
	url: PropTypes.string.isRequired,
	type: PropTypes.oneOf(['pdf', 'doc', 'docx', 'pptx', 'ppt', 'txt']).isRequired,
	filename: PropTypes.string
};
