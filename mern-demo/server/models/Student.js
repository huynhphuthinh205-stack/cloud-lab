const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            required: [true, "Mã số sinh viên (MSSV) là bắt buộc"],
            trim: true
        },
        name: {
            type: String,
            required: [true, "Họ tên là bắt buộc"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "Email là bắt buộc"],
            trim: true,
            lowercase: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Student", studentSchema);