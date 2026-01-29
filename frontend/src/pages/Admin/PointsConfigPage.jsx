import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    getPointsConfig,
    createPointsConfig,
    updatePointsConfig,
    recalculateAllPoints
} from '../../services/pointsConfigService';
import './PointsConfigPage.css';

const PointsConfigPage = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();

    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [message, setMessage] = useState(null);
    const [editedValues, setEditedValues] = useState({});

    // Create new activity modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newActivity, setNewActivity] = useState({
        activityType: '',
        points: '',
        description: '',
    });

    // Recalculate confirmation modal
    const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);

    // Check access - Admin/Master only
    useEffect(() => {
        if (!user || (user.role !== 'Admin' && user.role !== 'Master')) {
            navigate('/');
        }
    }, [user, navigate]);

    // Fetch points configuration
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                setLoading(true);
                const data = await getPointsConfig();
                setConfigs(data);

                // Initialize edited values
                const initialValues = {};
                data.forEach(config => {
                    initialValues[config.activityType] = config.points;
                });
                setEditedValues(initialValues);
            } catch (error) {
                console.error('Error fetching points config:', error);
                showMessage('Failed to load configuration', 'error');
            } finally {
                setLoading(false);
            }
        };

        if (user?.role === 'Admin' || user?.role === 'Master') {
            fetchConfig();
        }
    }, [user]);

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleValueChange = (activityType, value) => {
        setEditedValues(prev => ({
            ...prev,
            [activityType]: value
        }));
    };

    const handleSave = async (activityType) => {
        const newPoints = editedValues[activityType];

        // Validation
        if (newPoints === '' || newPoints === null || newPoints === undefined) {
            showMessage('Please enter a valid value', 'error');
            return;
        }

        const pointsNum = Number(newPoints);
        if (isNaN(pointsNum) || pointsNum < 0) {
            showMessage('Points must be a non-negative number', 'error');
            return;
        }

        try {
            setSaving(true);
            await updatePointsConfig(activityType, pointsNum);

            // Update local state
            setConfigs(prev => prev.map(config =>
                config.activityType === activityType
                    ? { ...config, points: pointsNum }
                    : config
            ));

            showMessage(`Successfully updated ${activityType}`, 'success');
        } catch (error) {
            console.error('Error updating config:', error);
            showMessage(error.response?.data?.message || 'Failed to update configuration', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateActivity = async () => {
        // Validation
        if (!newActivity.activityType || !newActivity.description) {
            showMessage('Please fill in activity type and description', 'error');
            return;
        }

        if (newActivity.points === '' || newActivity.points === null) {
            showMessage('Please enter points value', 'error');
            return;
        }

        const pointsNum = Number(newActivity.points);
        if (isNaN(pointsNum) || pointsNum < 0) {
            showMessage(' Points must be a non-negative number', 'error');
            return;
        }

        try {
            setSaving(true);
            const newConfig = await createPointsConfig(
                newActivity.activityType,
                pointsNum,
                newActivity.description
            );

            // Add to local state
            setConfigs(prev => [...prev, newConfig]);
            setEditedValues(prev => ({
                ...prev,
                [newConfig.activityType]: newConfig.points
            }));

            showMessage(`Successfully created ${newActivity.activityType}`, 'success');
            setShowCreateModal(false);
            setNewActivity({ activityType: '', points: '', description: '' });
        } catch (error) {
            console.error('Error creating activity:', error);
            showMessage(error.response?.data?.message || 'Failed to create activity type', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleRecalculate = async () => {
        try {
            setRecalculating(true);
            setShowRecalculateConfirm(false); // Close modal
            const result = await recalculateAllPoints();
            showMessage(`Successfully recalculated points for ${result.usersUpdated} users`, 'success');
        } catch (error) {
            console.error('Error recalculating points:', error);
            showMessage(error.response?.data?.message || 'Failed to recalculate points', 'error');
        } finally {
            setRecalculating(false);
        }
    };

    const formatActivityType = (activityType) => {
        return activityType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (loading) {
        return (
            <div className="points-config-container">
                <div className="loading-spinner">Loading configuration...</div>
            </div>
        );
    }

    return (
        <div className="points-config-container">
            <div className="points-config-header">
                <div>
                    <h1>⚙️ Points Configuration</h1>
                    <p className="subtitle">Manage point values for different activities</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="add-activity-btn"
                >
                    + Add New Activity
                </button>
            </div>

            {message && (
                <div className={`message-banner ${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="config-table-wrapper">
                <table className="config-table">
                    <thead>
                        <tr>
                            <th>Activity Type</th>
                            <th>Description</th>
                            <th>Points</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {configs.map((config) => (
                            <tr key={config.activityType}>
                                <td className="activity-name">
                                    {formatActivityType(config.activityType)}
                                </td>
                                <td className="description">{config.description}</td>
                                <td className="points-input-cell">
                                    <input
                                        type="number"
                                        min="0"
                                        value={editedValues[config.activityType] || 0}
                                        onChange={(e) => handleValueChange(config.activityType, e.target.value)}
                                        className="points-input"
                                        disabled={saving}
                                    />
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleSave(config.activityType)}
                                        disabled={saving || editedValues[config.activityType] === config.points}
                                        className="save-btn"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="recalculate-section">
                <div className="recalculate-info">
                    <h3>🔄 Recalculate All Points</h3>
                    <p>
                        If you've changed point values and want to update all users' totals based on their
                        historical activities, use this option. This is a heavy operation and may take a while.
                    </p>
                </div>
                <button
                    onClick={() => setShowRecalculateConfirm(true)}
                    disabled={recalculating}
                    className="recalculate-btn"
                >
                    {recalculating ? 'Recalculating...' : 'Recalculate All Users'}
                </button>
            </div>

            {/* Create New Activity Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>➕ Add New Activity Type</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Activity Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., quiz_completion"
                                    value={newActivity.activityType}
                                    onChange={(e) => setNewActivity(prev => ({ ...prev, activityType: e.target.value }))}
                                    className="modal-input"
                                />
                                <small>Use lowercase with underscores (e.g., quiz_completion)</small>
                            </div>
                            <div className="form-group">
                                <label>Description *</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Points awarded for completing a quiz"
                                    value={newActivity.description}
                                    onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                                    className="modal-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Default Points *</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g., 150"
                                    value={newActivity.points}
                                    onChange={(e) => setNewActivity(prev => ({ ...prev, points: e.target.value }))}
                                    className="modal-input"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowCreateModal(false)} className="btn-cancel">Cancel</button>
                            <button onClick={handleCreateActivity} className="btn-create" disabled={saving}>
                                {saving ? 'Creating...' : 'Create Activity'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recalculate Confirmation Modal */}
            {showRecalculateConfirm && (
                <div className="modal-overlay" onClick={() => setShowRecalculateConfirm(false)}>
                    <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>⚠️ Confirm Recalculation</h2>
                            <button className="modal-close" onClick={() => setShowRecalculateConfirm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="confirm-message">
                                This will recalculate <strong>ALL users' points</strong> based on current configuration.
                                This may take a while. Continue?
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowRecalculateConfirm(false)} className="btn-cancel">Cancel</button>
                            <button onClick={handleRecalculate} className="btn-confirm" disabled={recalculating}>
                                {recalculating ? 'Recalculating...' : 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PointsConfigPage;
