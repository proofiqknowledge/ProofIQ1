import React from 'react';
import PropTypes from 'prop-types';
import { FaArrowLeft, FaArrowRight, FaCheck } from 'react-icons/fa';

export default function ExamForm({
	questions,
	activeIndex,
	answers,
	onAnswer,
	onNext,
	onPrevious,
	onSubmit
}) {
	const current = questions[activeIndex];

	if (!current) return null;

	return (
		<div>
			<div className="bg-white rounded-lg shadow p-6 mb-6">
				<h3 className="text-lg font-semibold mb-2">Question {activeIndex + 1} of {questions.length}</h3>
				<p className="text-gray-700 mb-4">{current.text}</p>

				<div className="space-y-3">
					{current.options.map((opt, i) => (
						<label key={i} className={`block p-3 rounded border ${answers[activeIndex] === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
							<input
								type="radio"
								name={`q-${activeIndex}`}
								checked={answers[activeIndex] === i}
								onChange={() => onAnswer(activeIndex, i)}
								className="mr-3"
							/>
							<span className="text-gray-800">{opt}</span>
						</label>
					))}
				</div>
			</div>

			<div className="flex justify-between">
				<button onClick={onPrevious} disabled={activeIndex === 0} className="flex items-center px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50">
					<FaArrowLeft className="mr-2" /> Previous
				</button>

				{activeIndex === questions.length - 1 ? (
					<button onClick={onSubmit} className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
						<FaCheck className="mr-2" /> Submit
					</button>
				) : (
					<button onClick={onNext} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
						Next <FaArrowRight className="ml-2" />
					</button>
				)}
			</div>
		</div>
	);
}

ExamForm.propTypes = {
	questions: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string.isRequired, options: PropTypes.array.isRequired })).isRequired,
	activeIndex: PropTypes.number.isRequired,
	answers: PropTypes.object.isRequired,
	onAnswer: PropTypes.func.isRequired,
	onNext: PropTypes.func.isRequired,
	onPrevious: PropTypes.func.isRequired,
	onSubmit: PropTypes.func.isRequired
};
