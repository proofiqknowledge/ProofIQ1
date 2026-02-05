const SavedFile = require('../models/SavedFile');

// Get all saved files for the logged-in user
exports.getSavedFiles = async (req, res) => {
    try {
        const files = await SavedFile.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.status(200).json(files);
    } catch (error) {
        console.error('Error fetching saved files:', error);
        res.status(500).json({ message: 'Server error fetching saved files' });
    }
};

// Create or Update a file
exports.saveFile = async (req, res) => {
    try {
        const { name, language, code, _id } = req.body;

        if (!name || !language) {
            return res.status(400).json({ message: 'Filename and language are required' });
        }

        let file;

        // specific update by ID if provided
        if (_id) {
            file = await SavedFile.findOne({ _id, userId: req.user.id });
            if (!file) {
                return res.status(404).json({ message: 'File not found' });
            }
            file.name = name;
            file.language = language;
            file.code = code;
        } else {
            // Create new or overwrite by name check if not using ID (fallback)
            // Check if file with same name exists for user
            file = await SavedFile.findOne({ userId: req.user.id, name });

            if (file) {
                // Update existing
                file.language = language;
                file.code = code;
            } else {
                // Create new
                file = new SavedFile({
                    userId: req.user.id,
                    name,
                    language,
                    code
                });
            }
        }

        await file.save();
        res.status(200).json(file);

    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ message: 'Server error saving file' });
    }
};

// Delete a file
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedFile = await SavedFile.findOneAndDelete({ _id: id, userId: req.user.id });

        if (!deletedFile) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.status(200).json({ message: 'File deleted successfully', fileId: id });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'Server error deleting file' });
    }
};
