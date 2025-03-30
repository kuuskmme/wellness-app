const User = require('../models/userModel');
const { validationResult } = require('express-validator');

/**
 * Get current user profile
 * @route GET /api/users/me
 * @access Private
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already attached to the request in auth middleware
    const user = req.user;

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile'
    });
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/me
 * @access Private
 */
exports.updateCurrentUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { firstName, lastName } = req.body;
    const userId = req.user._id;

    // Find user and update
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        firstName,
        lastName
      },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user profile'
    });
  }
};

/**
 * Delete current user
 * @route DELETE /api/users/me
 * @access Private
 */
exports.deleteCurrentUser = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete user
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // TODO: Delete related data (health profile, etc.)

    res.status(200).json({
      success: true,
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user account'
    });
  }
};

/**
 * Get user privacy settings
 * @route GET /api/users/me/privacy
 * @access Private
 */
exports.getPrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;

    // Using projection to only return necessary fields
    const user = await User.findById(userId)
      .select('email twoFactorEnabled')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching privacy settings'
    });
  }
};

/**
 * Update user privacy settings
 * @route PUT /api/users/me/privacy
 * @access Private
 */
exports.updatePrivacySettings = async (req, res) => {
  try {
    const { twoFactorEnabled } = req.body;
    const userId = req.user._id;

    // Only update fields that were sent in the request
    const updateData = {};
    if (twoFactorEnabled !== undefined) {
      updateData.twoFactorEnabled = twoFactorEnabled;
    }

    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    // Find user and update
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('email twoFactorEnabled');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating privacy settings'
    });
  }
};