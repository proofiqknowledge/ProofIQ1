import React from 'react';
import PropTypes from 'prop-types';
import { FaCheck } from 'react-icons/fa';

export function AcknowledgementCheckbox({ checked, onChange, disabled }) {
	return (
		<div className="mt-6 border-t pt-4">
			<label className="flex items-center space-x-3 cursor-pointer">
				<div
					className={`
						w-6 h-6 flex items-center justify-center rounded border-2
						${checked ? 'bg-green-500 border-green-500' : 'border-gray-300'}
						${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-green-500'}
					`}
					onClick={() => !disabled && onChange(!checked)}
				>
					{checked && <FaCheck className="text-white text-sm" />}
				</div>
				<span className={`text-gray-700 ${disabled ? 'opacity-50' : ''}`}>
					I have completed this content
				</span>
			</label>
			{checked && (
				<p className="text-green-600 text-sm mt-2">
					Great job completing this section!
				</p>
			)}
		</div>
	);
}

AcknowledgementCheckbox.propTypes = {
	checked: PropTypes.bool.isRequired,
	onChange: PropTypes.func.isRequired,
	disabled: PropTypes.bool
};

AcknowledgementCheckbox.defaultProps = {
	disabled: false
};
