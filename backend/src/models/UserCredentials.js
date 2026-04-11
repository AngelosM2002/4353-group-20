const mongoose = require('mongoose');
// import bcrypt for password hashing
const bcrypt = require('bcrypt');

const userCredentialsSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: {
            values: ['user', 'administrator'],
            message: 'Role must be "user" or "administrator"'
        },
        lowercase: true
    }
}, {
    timestamps: true // adds createdAt and updatedAt automatically
});

/**
 * Pre-save hook: hash the password before storing it in the database.
 * Only hashes if the password field has been modified (e.g., on registration
 * or password change), so re-saving a document without changing the password
 * won't double-hash it.
 */
userCredentialsSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance method to compare a candidate password with the stored hash.
 * Used during login.
 * @param {string} candidatePassword - The plain-text password to check
 * @returns {Promise<boolean>} - True if the password matches
 */
userCredentialsSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('UserCredential', userCredentialsSchema);
