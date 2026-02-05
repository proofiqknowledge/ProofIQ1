const StudyGroup = require('../models/StudyGroup');
const StudyRequest = require('../models/StudyRequest');
const User = require('../models/User');
const Batch = require('../models/Batch');
const GroupMessage = require('../models/GroupMessage');

// ==========================================
// 1. Get Students for Invite
// ==========================================
exports.getStudentsForInvite = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Find all students in the portal, excluding self
        // REMOVED batch restriction as per user request (allow cross-batch study groups)
        const students = await User.find({
            role: 'Student', // Ensure we only get students
            _id: { $ne: user._id }
        }).select('name email');

        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 2. Send Study Request
// ==========================================
exports.sendStudyRequest = async (req, res) => {
    try {
        const { toUserId, groupId, message } = req.body;
        const fromUserId = req.user.id;

        if (toUserId === fromUserId) {
            return res.status(400).json({ message: "Cannot invite yourself." });
        }

        // Check if pending request already exists
        const existing = await StudyRequest.findOne({
            fromUser: fromUserId,
            toUser: toUserId,
            status: 'pending'
        });

        if (existing) {
            return res.status(400).json({ message: "Request already pending." });
        }

        // If inviting to a group, check capacity
        if (groupId) {
            const group = await StudyGroup.findById(groupId);
            if (!group) return res.status(404).json({ message: "Group not found." });
            if (group.members.length >= 5) {
                return res.status(400).json({ message: "Group is full (max 5 members)." });
            }
            // Check if user is already in the group
            if (group.members.includes(toUserId)) {
                return res.status(400).json({ message: "User already in the group." });
            }
        }

        const request = new StudyRequest({
            fromUser: fromUserId,
            toUser: toUserId,
            groupId: groupId || null,
            message
        });

        await request.save();
        res.status(201).json({ message: "Invitation sent successfully." });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 3. Get My Pending Requests
// ==========================================
exports.getMyRequests = async (req, res) => {
    try {
        const requests = await StudyRequest.find({
            toUser: req.user.id,
            status: 'pending'
        })
            .populate('fromUser', 'name email')
            .populate('groupId', 'name');

        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 4. Respond to Request (Accept/Reject)
// ==========================================
exports.respondToRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body; // 'accepted' or 'rejected'
        const userId = req.user.id;

        const request = await StudyRequest.findById(requestId);
        if (!request) return res.status(404).json({ message: "Request not found." });

        if (request.toUser.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized." });
        }

        if (status === 'rejected') {
            request.status = 'rejected';
            await request.save();
            return res.json({ message: "Request rejected." });
        }

        if (status === 'accepted') {
            // LOGIC: Create group OR Add to group

            let group;

            if (request.groupId) {
                // Add to existing group
                group = await StudyGroup.findById(request.groupId);
                if (!group) return res.status(404).json({ message: "Group no longer exists." });

                if (group.members.length >= 5) {
                    return res.status(400).json({ message: "Group is full." });
                }
                if (group.members.includes(userId)) {
                    return res.status(400).json({ message: "You are already in this group." });
                }

                group.members.push(userId);
                await group.save();

            } else {
                // Create NEW group
                // Fetch sender to get batch info (assuming same batch)
                const sender = await User.findById(request.fromUser);

                group = new StudyGroup({
                    name: `${sender.name} & Friends`, // Default name
                    createdBy: request.fromUser,
                    batch: sender.batch || null, // Handle undefined batch
                    members: [request.fromUser, userId] // Add both
                });
                await group.save();
            }

            request.status = 'accepted';
            await request.save();

            return res.json({ message: "Request accepted.", group });
        }

        res.status(400).json({ message: "Invalid status." });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 5. Get My Groups
// ==========================================
exports.getMyGroups = async (req, res) => {
    try {
        const groups = await StudyGroup.find({
            members: req.user.id,
            isActive: true
        })
            .populate('members', 'name email')
            .populate('createdBy', 'name');

        res.json(groups);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 6. Update Group (Name)
// ==========================================
exports.updateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name } = req.body;

        // Allow any member to update name? Or just creator? description says "they can edit"
        const group = await StudyGroup.findOne({
            _id: groupId,
            members: req.user.id
        });

        if (!group) return res.status(404).json({ message: "Group not found or access denied." });

        group.name = name;
        await group.save();

        res.json(group);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 7. Leave Group
// ==========================================
exports.leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        const group = await StudyGroup.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        group.members = group.members.filter(m => m.toString() !== userId);

        // If no members left, deactivate group
        if (group.members.length === 0) {
            group.isActive = false;
        }

        await group.save();
        res.json({ message: "Left group successfully." });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 8. Admin: Get All Groups
// ==========================================
exports.getAllGroupsAdmin = async (req, res) => {
    try {
        const groups = await StudyGroup.find()
            .populate('members', 'name email')
            .populate('batch', 'name')
            .sort({ createdAt: -1 });
        res.json(groups);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 9. Admin: Add Member
// ==========================================
exports.addMemberAdmin = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;

        const group = await StudyGroup.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        if (group.members.length >= 5) {
            return res.status(400).json({ message: "Group is full." });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({ message: "User already in group." });
        }

        group.members.push(userId);
        await group.save();

        res.json(group);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 10. Admin: Remove Member
// ==========================================
exports.removeMemberAdmin = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body; // or params, keeping flexible

        const group = await StudyGroup.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        group.members = group.members.filter(m => m.toString() !== userId);
        await group.save();

        res.json(group);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 11. Get Group Messages
// ==========================================
exports.getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        // Check if user is member of the group
        const group = await StudyGroup.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        if (!group.members.includes(userId)) {
            return res.status(403).json({ message: "Access denied. Not a member." });
        }

        const messages = await GroupMessage.find({ groupId })
            .populate('sender', 'name email')
            .sort({ createdAt: 1 })
            .limit(50); // Limit to last 50 messages for now

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ==========================================
// 12. Send Group Message
// ==========================================
exports.sendGroupMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Message cannot be empty." });
        }

        const group = await StudyGroup.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found." });

        if (!group.members.includes(userId)) {
            return res.status(403).json({ message: "Access denied. Not a member." });
        }

        const message = new GroupMessage({
            groupId,
            sender: userId,
            content
        });

        await message.save();

        // Populate sender info for immediate frontend display
        await message.populate('sender', 'name email');

        res.status(201).json(message);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};      