const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Nạp file .env từ nhiều vị trí có thể có (thư mục gốc mern-demo, server, process.cwd)
const possibleEnvPaths = [
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, ".env"),
    path.resolve(process.cwd(), ".env")
];

for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
        require("dotenv").config({ path: envPath });
        break;
    }
}
require("dotenv").config(); // Fallback nạp mặc định từ process.cwd()

const Student = require("./models/Student");

const app = express();

// Cấu hình CORS cho phép frontend (cả Render và Localhost) gọi API
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// API kiểm tra trạng thái Backend
app.get("/api/hello", (req, res) => {
    res.json({
        message: "Backend Node.js Express đang hoạt động!"
    });
});

// GET - Lấy danh sách toàn bộ sinh viên
app.get("/api/students", async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1, _id: -1 });
        res.json(students);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách sinh viên:", error);
        res.status(500).json({
            message: "Không thể lấy danh sách sinh viên: " + error.message
        });
    }
});

// POST - Thêm sinh viên mới
app.post("/api/students", async (req, res) => {
    try {
        const { studentId, name, email } = req.body;

        if (!studentId || !studentId.trim()) {
            return res.status(400).json({ message: "Mã số sinh viên (MSSV) không được để trống" });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Họ và tên không được để trống" });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ message: "Email không được để trống" });
        }

        // Kiểm tra trùng mã sinh viên
        const existingStudent = await Student.findOne({ studentId: studentId.trim() });
        if (existingStudent) {
            return res.status(400).json({
                message: `Mã số sinh viên "${studentId.trim()}" đã tồn tại trên hệ thống!`
            });
        }

        const student = await Student.create({
            studentId: studentId.trim(),
            name: name.trim(),
            email: email.trim().toLowerCase()
        });

        res.status(201).json(student);
    } catch (error) {
        console.error("Lỗi khi thêm sinh viên:", error);
        res.status(400).json({
            message: error.message || "Lỗi khi thêm sinh viên"
        });
    }
});

// PUT - Cập nhật thông tin sinh viên theo ID
app.put("/api/students/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID sinh viên không hợp lệ" });
        }

        const { studentId, name, email } = req.body;

        if (!studentId || !studentId.trim()) {
            return res.status(400).json({ message: "Mã số sinh viên (MSSV) không được để trống" });
        }
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Họ và tên không được để trống" });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ message: "Email không được để trống" });
        }

        // Kiểm tra xem MSSV mới có trùng với sinh viên khác không
        const duplicate = await Student.findOne({
            studentId: studentId.trim(),
            _id: { $ne: id }
        });

        if (duplicate) {
            return res.status(400).json({
                message: `Mã số sinh viên "${studentId.trim()}" đã thuộc về sinh viên khác!`
            });
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            {
                studentId: studentId.trim(),
                name: name.trim(),
                email: email.trim().toLowerCase()
            },
            { returnDocument: 'after', runValidators: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ message: "Không tìm thấy sinh viên để cập nhật" });
        }

        res.json(updatedStudent);
    } catch (error) {
        console.error("Lỗi khi cập nhật sinh viên:", error);
        res.status(400).json({
            message: error.message || "Lỗi khi cập nhật sinh viên"
        });
    }
});

// DELETE - Xóa sinh viên theo ID
app.delete("/api/students/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID sinh viên không hợp lệ" });
        }

        const deletedStudent = await Student.findByIdAndDelete(id);

        if (!deletedStudent) {
            return res.status(404).json({ message: "Không tìm thấy sinh viên để xóa" });
        }

        res.json({
            message: "Xóa sinh viên thành công!",
            id: id,
            student: deletedStudent
        });
    } catch (error) {
        console.error("Lỗi khi xóa sinh viên:", error);
        res.status(400).json({
            message: error.message || "Lỗi khi xóa sinh viên"
        });
    }
});

const PORT = process.env.PORT || 5000;
const DB_NAME = process.env.DB_NAME || "cloud_lab";

if (!process.env.MONGODB_URI) {
    console.error("CẢNH BÁO: Chưa thiết lập biến môi trường MONGODB_URI!");
}

mongoose.connect(process.env.MONGODB_URI, {
    dbName: DB_NAME
})
    .then(() => {
        console.log(`MongoDB Atlas connected successfully! Database: ${DB_NAME}`);

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error.message);
    });

module.exports = app;